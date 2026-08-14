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

"""Spectral direct-beam irradiance through the eclipse, and the biologically
and photographically weighted quantities that follow from it.

Why spectral and not broadband: at a solar elevation of 4.6 deg the relative
air mass is ~11, far outside the range over which the broadband empirical
clear-sky models (Ineichen-Perez, and to a lesser extent Bird & Hulstrom) were
fitted. A per-wavelength Beer-Lambert calculation is the physically defensible
route at that geometry, and it is required anyway for the ICNIRP hazard
weightings B(lambda) and R(lambda), which the broadband models cannot supply.

Also: limb darkening is chromatic, so the eclipse transmission is chromatic
too. The Moon uncovers the disc centre last, and the disc centre is bluer than
the limb, so the partial phases are not simply a grey filter.
"""
import json
import numpy as np
import pandas as pd
from pvlib import atmosphere as pvatm, spectrum

import siteconf as S
import geometry as G
import limbdark as LD
from radiometry import alpha_hestroffer
from siteconf import ROOT

ATM = json.load(open(ROOT+'/data/atmosphere.json'))['adopted_for_eclipse_window']
LIT = json.load(open(ROOT+'/data/literature.json'))
CIRC = json.load(open(ROOT+'/data/circumstances.json'))

GAMMA_PH = LIT['icnirp2013']['blue_light_photochemical_limit']['gamma_ph_rad']['t_lt_100s']  # 0.011 rad
OMEGA_GAMMA = np.pi * GAMMA_PH ** 2 / 4.0     # ICNIRP: Omega = (pi * gamma^2)/4


def _weighting_tables():
    """B(lambda) and R(lambda) on a dense grid, from ICNIRP 2013 Table 2."""
    rows = LIT['icnirp2013']['table2_weighting_functions']['rows']
    lam = np.array([r[0] for r in rows], float)
    B = np.array([r[2] for r in rows], float)
    Rl = np.array([np.nan if r[3] is None else r[3] for r in rows], float)

    def B_of(x):
        x = np.asarray(x, float)
        out = np.interp(x, lam, B, left=B[0], right=0.0)
        return np.where((x >= 300.0) & (x <= 700.0), out, 0.0)

    def R_of(x):
        x = np.asarray(x, float)
        m = ~np.isnan(Rl)
        out = np.zeros_like(x)
        lo = (x >= 380.0) & (x <= 700.0)
        out[lo] = np.interp(x[lo], lam[m], Rl[m])
        a = (x > 700.0) & (x <= 1050.0)
        out[a] = 10.0 ** ((700.0 - x[a]) / 500.0)
        b = (x > 1050.0) & (x <= 1150.0)
        out[b] = 0.2
        c = (x > 1150.0) & (x <= 1200.0)
        out[c] = 0.2 * 10.0 ** (0.02 * (1150.0 - x[c]))
        d = (x > 1200.0) & (x <= 1400.0)
        out[d] = 0.02
        return out

    return B_of, R_of


def _photopic():
    """CIE 1931 2-deg photopic luminous efficiency V(lambda), from the
    colour-science package's copy of the CIE standard tables."""
    import colour
    sd = colour.colorimetry.SDS_LEFS_PHOTOPIC['CIE 1924 Photopic Standard Observer']
    lam = np.asarray(sd.wavelengths, float)
    v = np.asarray(sd.values, float)
    return lambda x: np.interp(np.asarray(x, float), lam, v, left=0.0, right=0.0)


def build(step_s=5.0, pad_s=180.0):
    ts = G.ts
    t_c1 = CIRC['contacts']['C1']['tt_jd']
    t_c4 = CIRC['contacts']['C4']['tt_jd']
    t0 = t_c1 - pad_s / 86400.0
    t1 = t_c4 + pad_s / 86400.0
    n = int(round((t1 - t0) * 86400.0 / step_s)) + 1
    tt = np.linspace(t0, t1, n)
    T = ts.tt_jd(tt)

    sep, rs, rm, a_sun, a_moon = G.state(T)
    alt_ref, az, _ = a_sun.altaz(temperature_C=ATM['T_air_C'],
                                 pressure_mbar=ATM['p_surface_Pa'] / 100.0)
    zen = 90.0 - alt_ref.degrees
    am_rel = pvatm.get_relative_airmass(zen, model='kastenyoung1989')

    doy = 224  # 2026-08-12 is day-of-year 224 (non-leap year)
    ok = np.isfinite(am_rel) & (zen < 90.0)

    sp = spectrum.spectrl2(
        apparent_zenith=zen[ok], aoi=zen[ok], surface_tilt=0.0,
        ground_albedo=ATM['ground_albedo'],
        surface_pressure=ATM['p_surface_Pa'],
        relative_airmass=am_rel[ok],
        precipitable_water=ATM['precipitable_water_cm'],
        ozone=ATM['ozone_atm_cm'],
        aerosol_turbidity_500nm=ATM['aod500'],
        dayofyear=doy)
    lam = np.asarray(sp['wavelength'], float)                 # (122,)
    dni_l = np.zeros((len(tt), len(lam)))
    dni_l[ok] = np.asarray(sp['dni'], float).T                # W m^-2 nm^-1

    # --- chromatic, limb-darkened eclipse transmission ----------------------
    alpha_l = alpha_hestroffer(lam)
    # alpha varies smoothly with lambda; evaluate the (expensive) obscuration
    # on a set of alpha nodes and interpolate. Accuracy is checked in _selftest.
    nodes = np.linspace(alpha_l.min(), alpha_l.max(), 14)
    O = np.empty((len(nodes), len(tt)))
    for i, a in enumerate(nodes):
        O[i] = LD.flux_obscuration(sep, rs, rm, lambda mu, a=a: LD.I_power(mu, a), n=1500)
    # linear interpolation in alpha, per time step
    trans_l = np.empty((len(tt), len(lam)))
    for j in range(len(tt)):
        trans_l[j] = 1.0 - np.interp(alpha_l, nodes, O[:, j])
    trans_l = np.clip(trans_l, 0.0, 1.0)

    dni_l_ecl = dni_l * trans_l

    B_of, R_of = _weighting_tables()
    V = _photopic()
    Bw, Rw, Vw = B_of(lam), R_of(lam), V(lam)

    def integ(y):
        return np.trapezoid(y, lam, axis=1) if hasattr(np, 'trapezoid') \
            else np.trapz(y, lam, axis=1)

    out = pd.DataFrame({
        'tt_jd': tt,
        'utc': [x.utc_iso(places=1) for x in T],
        'seconds_from_max': (tt - CIRC['contacts']['MAX']['tt_jd']) * 86400.0,
        'sun_alt_refr_deg': alt_ref.degrees,
        'sun_az_deg': az.degrees,
        'airmass_rel': am_rel,
        'obsc_geometric': G.obscuration(sep, rs, rm),
        'r_sun_arcsec': np.degrees(rs) * 3600.0,
        'r_moon_arcsec': np.degrees(rm) * 3600.0,
        'sep_arcsec': np.degrees(sep) * 3600.0,
        # broadband direct normal irradiance, 300-4000 nm
        'dni_spectral_noeclipse': integ(dni_l),
        'dni_spectral_eclipsed': integ(dni_l_ecl),
        # ICNIRP effective irradiances at the cornea
        'E_blue_noeclipse': integ(dni_l * Bw),
        'E_blue_eclipsed': integ(dni_l_ecl * Bw),
        'E_thermal_noeclipse': integ(dni_l * Rw),
        'E_thermal_eclipsed': integ(dni_l_ecl * Rw),
        # photopic illuminance from the direct beam, lux
        'Ev_direct_noeclipse': 683.0 * integ(dni_l * Vw),
        'Ev_direct_eclipsed': 683.0 * integ(dni_l_ecl * Vw),
        # flux-weighted transmission in three bands, to show the chromaticity
        'trans_450nm': trans_l[:, np.argmin(abs(lam - 450))],
        'trans_550nm': trans_l[:, np.argmin(abs(lam - 550))],
        'trans_700nm': trans_l[:, np.argmin(abs(lam - 700))],
    })
    out['L_thermal_eclipsed'] = out['E_thermal_eclipsed'] / OMEGA_GAMMA
    out['L_thermal_noeclipse'] = out['E_thermal_noeclipse'] / OMEGA_GAMMA
    np.savez_compressed(ROOT+'/data/spectra.npz',
                        wavelength=lam, tt_jd=tt, dni_l=dni_l,
                        trans_l=trans_l, B=Bw, R=Rw, V=Vw)
    return out


def _selftest():
    B_of, R_of = _weighting_tables()
    assert abs(B_of(440.0) - 1.0) < 1e-9 and abs(B_of(435.0) - 1.0) < 1e-9
    assert abs(B_of(500.0) - 0.10) < 1e-9
    assert abs(B_of(550.0) - 0.010) < 1e-9
    assert B_of(750.0) == 0.0                 # B is defined only to 700 nm
    assert abs(R_of(500.0) - 1.0) < 1e-9
    assert abs(R_of(380.0) - 0.01) < 1e-9
    assert abs(R_of(1200.0) - 0.02) < 1e-6    # analytic branch
    assert abs(R_of(700.0) - 1.0) < 1e-9
    assert abs(R_of(1200.0 - 1e-9) - 0.2 * 10 ** (0.02 * (1150 - 1200))) < 1e-6
    V = _photopic()
    assert abs(V(555.0) - 1.0) < 0.005, V(555.0)   # V peaks at 555 nm
    assert V(400.0) < 0.001 and V(700.0) < 0.005
    # ICNIRP solid angle for the 11 mrad acceptance cone
    assert abs(OMEGA_GAMMA - np.pi * 0.011 ** 2 / 4) < 1e-18
    print('spectral selftest OK (Omega_gamma=%.4e sr)' % OMEGA_GAMMA)


if __name__ == '__main__':
    _selftest()
    df = build()
    df.to_csv(ROOT+'/data/spectral_timeseries.csv', index=False)
    k = df['seconds_from_max'].abs().idxmin()
    cols = ['utc', 'sun_alt_refr_deg', 'airmass_rel', 'dni_spectral_noeclipse',
            'dni_spectral_eclipsed', 'E_blue_noeclipse', 'E_thermal_noeclipse',
            'Ev_direct_noeclipse']
    print(df.loc[[0, len(df) // 4, k, len(df) - 1], cols].to_string())
    print('rows', len(df))
