# eclipse-radiometric-simulation
# Copyright (C) 2026 Ricardo Heredia Alessandrello
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License, version 3, as published
# by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details. You should have received a copy of it along with this program; if
# not, see <https://www.gnu.org/licenses/>.
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Ocular hazard of the low, partially eclipsed Sun, evaluated against ICNIRP.

Two independent limits apply and they behave in opposite ways as the Sun sinks:

* RETINAL THERMAL. Driven by the R(lambda)-weighted radiance. Falls fast at low
  Sun because the beam is attenuated ~10x by the long atmospheric path.
* RETINAL PHOTOCHEMICAL ("blue light"). Driven by the B(lambda)-weighted
  irradiance, which peaks near 440 nm -- exactly where Rayleigh scattering is
  strongest. It therefore falls even faster than the broadband beam. But its
  limit is a DOSE, so it accumulates: halving the irradiance only doubles the
  permitted staring time.

The Sun's angular subtense is 9.18 mrad, smaller than ICNIRP's photochemical
acceptance angle gamma_ph = 11 mrad, so the PHOTOCHEMICAL limit reduces to its
corneal-irradiance form:

  photochemical:  H_B = E_B t <= 100 J m^-2      (0.25 s <= t < 100 s)
                  E_B        <= 1 W m^-2         (100 s <= t < 30000 s)

The THERMAL limit does NOT reduce that way, and an earlier version of this
module got it wrong twice over:

* it evaluated L_R^EL = 2.8e4/alpha at alpha = gamma_ph. But alpha in that
  expression is the angular subtense OF THE SOURCE; gamma_ph belongs to the
  photochemical limit and has no role here. Using 11 mrad instead of 9.18 mrad
  overstated the permitted radiance by 1.198.
* it divided the ECLIPSED R-weighted irradiance by a fixed solid angle and
  called the result a radiance, so the tabulated thermal hazard fell towards
  zero as obscuration approached one. That is backwards. Radiance is invariant
  under occultation -- the Moon removes area, not surface brightness -- which is
  exactly why ICNIRP writes the retinal thermal limit as a RADIANCE limit. A
  99 %-obscured Sun still projects a crescent whose retinal irradiance is that
  of the full photosphere.

The correct treatment holds the photospheric radiance fixed (attenuated by the
atmosphere alone) and lets ICNIRP's alpha respond to the shape of the visible
crescent, alpha being the arithmetic mean of the crescent's shortest and longest
dimensions, each clamped to [alpha_min, alpha_max] = [1.5, 100] mrad.

The corneal-irradiance form does NOT make the analysis pupil-free. ICNIRP states
that the photochemical limit "was derived with the assumption of a pupil diameter
of approximately 3 mm". Retinal dose scales with pupil AREA, so an observer whose
pupil has opened to d mm receives (d/3)^2 times the retinal dose the limit
assumes, and the effective corneal limit must be divided by that factor. This
matters here more than in most settings: the whole point of the exercise is a sky
that darkens toward totality, which is exactly when the pupil dilates. All
results are therefore reported for the ICNIRP nominal 3 mm and for dilated
pupils, and the dilated case is the one quoted operationally.
"""
import json
import numpy as np
import pandas as pd
from siteconf import ROOT

LIT = json.load(open(ROOT+'/data/literature.json'))
HW = json.load(open(ROOT+'/data/hardware.json'))

IC = LIT['icnirp2013']
GAMMA = IC['blue_light_photochemical_limit']['gamma_ph_rad']['t_lt_100s']   # 0.011 rad
OMEGA_GAMMA = np.pi * GAMMA ** 2 / 4.0
H_B_LIMIT = 100.0        # J m^-2, eqn 16, 0.25 <= t < 100 s
E_B_LIMIT = 1.0          # W m^-2, eqn 17, 100 <= t < 30000 s
L_R_COEFF = 2.8e4        # W m^-2 sr^-1 rad, Table 4, t >= 0.25 s

EYE_F_MM = HW['eye']['focal_length_mm']
TAU_OCULAR = HW['eye']['ocular_transmittance_visible']


def thermal_limit_radiance(alpha_rad):
    """ICNIRP Table 4 basic limit for t >= 0.25 s: L_R^EL = 2.8e4 / alpha."""
    a = np.clip(np.asarray(alpha_rad, float), IC['retinal_thermal_limit']['alpha_min_rad'],
                IC['retinal_thermal_limit']['alpha_max_rad_t_ge_0p25s'])
    return L_R_COEFF / a


def thermal_limit_irradiance(alpha_rad=None):
    """Corneal irradiance limit equivalent to the radiance limit AT ONE alpha.

    Only meaningful for the stated alpha; it is not a universal constant. The
    default is the uneclipsed solar subtense, not gamma_ph.
    """
    a = ALPHA_SUN if alpha_rad is None else alpha_rad
    return thermal_limit_radiance(a) * (np.pi * a ** 2 / 4.0)


ALPHA_SUN = 2.0 * np.radians(946.66 / 3600.0)      # 9.179 mrad, uneclipsed


def crescent_subtense(sep, r_sun, r_moon):
    """ICNIRP angular subtense of the visible solar crescent, radians.

    ICNIRP: for a non-circular source alpha is the arithmetic mean of the
    shortest and longest dimensions, each limited to [alpha_min, alpha_max].
    Shortest = the crescent's radial width r_sun + sep - r_moon. Longest = the
    chord joining the two horns.
    """
    sep = np.atleast_1d(np.asarray(sep, float))
    rs = np.broadcast_to(np.asarray(r_sun, float), sep.shape)
    rm = np.broadcast_to(np.asarray(r_moon, float), sep.shape)
    amin = IC['retinal_thermal_limit']['alpha_min_rad']
    amax = IC['retinal_thermal_limit']['alpha_max_rad_t_ge_0p25s']

    short = np.where(sep >= rs + rm, 2 * rs, np.maximum(rs + sep - rm, 0.0))
    with np.errstate(invalid='ignore', divide='ignore'):
        c = np.clip((sep ** 2 + rs ** 2 - rm ** 2) / (2.0 * sep * rs), -1.0, 1.0)
    chord = 2.0 * rs * np.sin(np.arccos(c))
    long_ = np.where(sep >= rs + rm, 2 * rs, chord)
    nested = sep <= np.abs(rm - rs)
    long_ = np.where(nested, 0.0, long_)
    short = np.where(nested, 0.0, short)
    a = 0.5 * (np.clip(short, amin, amax) + np.clip(long_, amin, amax))
    # Nested discs are two cases and only one of them is harmless. Moon larger:
    # the photosphere is gone, subtense zero, hazard zero rather than undefined.
    # SUN larger: what is left is a full-brightness ring, and returning zero
    # there would declare no thermal hazard at the moment the whole limb is on
    # show. ICNIRP does not treat annuli explicitly; the outer subtense is the
    # conservative reading and joins the uneclipsed case continuously.
    # This eclipse is total, so the annular branch never fires here and no
    # published figure of the manuscript changes; the branch exists because
    # web/js/radiometry.js reuses this logic for annular eclipses.
    annular = nested & (rs > rm)
    return np.where(nested, np.where(annular, np.clip(2 * rs, amin, amax), 0.0), a)


PUPIL_ICNIRP_MM = 3.0        # ICNIRP 2013: photochemical limit derived at ~3 mm


def pupil_factor(pupil_mm):
    """Retinal-dose enhancement over the ICNIRP-assumed 3 mm pupil."""
    return (np.asarray(pupil_mm, float) / PUPIL_ICNIRP_MM) ** 2


def safe_staring_time(E_B, pupil_mm=PUPIL_ICNIRP_MM):
    """Longest fixation on the solar disc allowed by the ICNIRP blue-light
    limit, in seconds, for an observer with the given pupil diameter.

    The two ICNIRP branches meet exactly at t = 100 s (100 J m^-2 / 1 W m^-2),
    so the piecewise function is continuous. Returns inf when the effective
    irradiance is below the long-exposure limit.
    """
    E = np.asarray(E_B, float) * pupil_factor(pupil_mm)
    out = np.where(E <= E_B_LIMIT, np.inf, H_B_LIMIT / np.maximum(E, 1e-30))
    return np.where(E <= 0, np.inf, out)


def retinal_irradiance(L_source, pupil_mm, tau=TAU_OCULAR, f_mm=EYE_F_MM):
    """ICNIRP 2013 eqn 2: E_r = pi L tau d_p^2 / (4 f^2)."""
    return np.pi * np.asarray(L_source, float) * tau * \
        (np.asarray(pupil_mm, float) ** 2) / (4.0 * f_mm ** 2)


def retinal_image_diameter_um(alpha_rad, f_mm=EYE_F_MM):
    """Diameter of the solar image on the retina, micrometres."""
    return np.asarray(alpha_rad, float) * f_mm * 1000.0


def required_filter_transmittance(E_B, E_R):
    """Transmittance a filter must have for BOTH ICNIRP limits to be met for
    an unlimited stare. Returns the binding (smaller) of the two."""
    t_blue = E_B_LIMIT / np.maximum(np.asarray(E_B, float), 1e-30)
    t_therm = thermal_limit_irradiance(ALPHA_SUN) / np.maximum(np.asarray(E_R, float), 1e-30)
    return np.minimum(t_blue, t_therm), t_blue, t_therm


def build(spectral_csv=ROOT+'/data/spectral_timeseries.csv'):
    df = pd.read_csv(spectral_csv)
    alpha_src = 2.0 * np.radians(df['r_sun_arcsec'] / 3600.0)     # full subtense
    out = pd.DataFrame({
        'utc': df['utc'],
        'seconds_from_max': df['seconds_from_max'],
        'sun_alt_deg': df['sun_alt_refr_deg'],
        'airmass': df['airmass_rel'],
        'obscuration': df['obsc_geometric'],
        'alpha_source_mrad': alpha_src * 1e3,
        'E_blue_W_m2': df['E_blue_eclipsed'],
        'E_thermal_W_m2': df['E_thermal_eclipsed'],
        'E_blue_noeclipse_W_m2': df['E_blue_noeclipse'],
        'E_thermal_noeclipse_W_m2': df['E_thermal_noeclipse'],
    })
    # Photospheric R-weighted radiance: from the UNECLIPSED beam, because
    # occultation removes area, not radiance. Constant through the partial
    # phases apart from the atmosphere's own attenuation.
    out['L_thermal_W_m2_sr'] = out['E_thermal_noeclipse_W_m2'] / (np.pi * ALPHA_SUN ** 2 / 4.0)
    alpha_c = crescent_subtense(np.radians(df['sep_arcsec'] / 3600.0),
                                np.radians(df['r_sun_arcsec'] / 3600.0),
                                np.radians(df['r_moon_arcsec'] / 3600.0))
    out['alpha_crescent_mrad'] = alpha_c * 1e3
    totality = alpha_c <= 0.0
    out['L_thermal_limit_W_m2_sr'] = np.where(
        totality, np.inf, thermal_limit_radiance(np.where(totality, 1.0, alpha_c)))
    out['thermal_hazard_ratio'] = np.where(
        totality, 0.0, out['L_thermal_W_m2_sr'] / out['L_thermal_limit_W_m2_sr'])
    out['thermal_hazard_ratio_uneclipsed'] = (
        out['L_thermal_W_m2_sr'] / thermal_limit_radiance(ALPHA_SUN))
    out['blue_hazard_ratio_vs_1Wm2'] = out['E_blue_W_m2'] / E_B_LIMIT
    for d in (3.0, 5.0, 7.0):
        tag = '%d' % d
        out['safe_stare_p' + tag + '_s'] = safe_staring_time(
            out['E_blue_W_m2'].values, d)
        out['safe_stare_noeclipse_p' + tag + '_s'] = safe_staring_time(
            out['E_blue_noeclipse_W_m2'].values, d)
    out['safe_stare_s'] = out['safe_stare_p3_s']
    out['safe_stare_noeclipse_s'] = out['safe_stare_noeclipse_p3_s']
    req, tb, tt = required_filter_transmittance(out['E_blue_W_m2'].values,
                                                out['E_thermal_noeclipse_W_m2'].values)
    out['required_filter_T'] = req
    out['required_filter_T_blue'] = tb
    out['required_filter_T_thermal'] = tt
    out['retinal_image_um'] = retinal_image_diameter_um(alpha_src)
    return out


def _selftest():
    # 1. The two ICNIRP branches must agree at t = 100 s.
    assert abs(H_B_LIMIT / E_B_LIMIT - 100.0) < 1e-12
    # 2. safe_staring_time continuity and monotonicity.
    assert np.isinf(safe_staring_time(np.array([0.5]))[0])
    assert np.isinf(safe_staring_time(np.array([1.0]))[0])       # exactly at the limit
    assert abs(safe_staring_time(np.array([2.0]))[0] - 50.0) < 1e-12
    assert abs(safe_staring_time(np.array([100.0]))[0] - 1.0) < 1e-12
    assert safe_staring_time(np.array([10.0]))[0] > safe_staring_time(np.array([20.0]))[0]
    # Pupil scaling: a 6 mm pupil quadruples the retinal dose, so it quarters
    # the permitted time and halves the irradiance at which the limit bites.
    assert abs(pupil_factor(6.0) - 4.0) < 1e-12
    assert abs(safe_staring_time(np.array([2.0]), 6.0)[0] - 12.5) < 1e-12
    assert np.isinf(safe_staring_time(np.array([0.24]), 6.0)[0])
    assert not np.isinf(safe_staring_time(np.array([0.26]), 6.0)[0])
    # 3. Thermal limit at the acceptance angle.
    e_lim = thermal_limit_irradiance()
    assert abs(e_lim - (2.8e4 / ALPHA_SUN) * (np.pi * ALPHA_SUN ** 2 / 4)) < 1e-9
    assert 200.0 < e_lim < 204.0, e_lim          # 201.9 W/m^2 at alpha = 9.179 mrad
    # The crescent subtense must fall between alpha_min and the full disc, and
    # must equal the full disc when there is no eclipse.
    rs_, rm_ = 4.59e-3, 4.74e-3
    assert abs(crescent_subtense([1.0], [rs_], [rm_])[0] - 2 * rs_) < 1e-12
    thin = crescent_subtense([rm_ - rs_ + 1e-6], [rs_], [rm_])[0]
    assert 0.0015 <= thin < 2 * rs_, thin
    assert crescent_subtense([0.0], [rs_], [rm_])[0] == 0.0
    # 4. alpha clipping at the ICNIRP bounds.
    assert thermal_limit_radiance(1e-6) == thermal_limit_radiance(0.0015)
    assert thermal_limit_radiance(1.0) == thermal_limit_radiance(0.1)
    # 5. Retinal irradiance scales as pupil^2 and matches ICNIRP's a = 2700 m^-2
    #    shortcut: E_r = a L tau d_p^2 with d_p in metres.
    L = 1.0e7
    for dp in (3.0, 7.0):
        direct = retinal_irradiance(L, dp)
        short = 2700.0 * L * TAU_OCULAR * (dp / 1000.0) ** 2
        # ICNIRP rounds pi/(4 f^2) = 2717.6 m^-2 to a = 2700 m^-2, a 0.65 %
        # difference. We use the exact form and check we stay within that.
        assert abs(direct / short - 1.0) < 8e-3, (dp, direct, short)
    print('eye selftest OK  (E_R limit = %.1f W m^-2, Omega_gamma = %.3e sr)'
          % (e_lim, OMEGA_GAMMA))


if __name__ == '__main__':
    _selftest()
    df = build()
    df.to_csv(ROOT+'/data/eye_timeseries.csv', index=False)
    for s in (-3000, -1800, -600, -120, -40, 0, 40, 120, 600, 1800):
        i = (df['seconds_from_max'] - s).abs().idxmin()
        r = df.loc[i]
        f = lambda v: 'sin límite' if np.isinf(v) else '%.1f s' % v
        print('t%+6.0f s  alt=%5.2f  obsc=%.3f  E_B=%8.3f  térmico=%5.3f  3mm=%s  7mm=%s'
              % (r['seconds_from_max'], r['sun_alt_deg'], r['obscuration'],
                 r['E_blue_W_m2'], r['thermal_hazard_ratio'],
                 f(r['safe_stare_p3_s']), f(r['safe_stare_p7_s'])))
