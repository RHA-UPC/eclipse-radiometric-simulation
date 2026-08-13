"""Master radiometric time series for the eclipse at the site.

Chain, all of it reproducible:

  DE440s ephemeris -> apparent Sun/Moon geometry -> refracted solar elevation
  -> Kasten & Young (1989) relative air mass -> station pressure (ISA)
  -> broadband clear-sky cross-checks: Ineichen & Perez driven by the site's own
     Linke-turbidity climatology, and Bird & Hulstrom (1981). NOTE these are
     cross-checks only: at the air mass of this eclipse (~11) both are far
     outside their fitted range, and the paper's primary chain is the spectral
     one in spectral.py.
  -> chromatic, limb-darkened eclipse transmission from Hestroffer & Magnan
     (1998) alpha(lambda)
  -> broadband DNI/GHI, spectral DNI, photopic illuminance, solar radiance.

The point of the exercise is the pair of curves the user asked for: what the
Sun's irradiance would have done on this evening WITHOUT an eclipse (the plain
sunset decay) versus what it actually does WITH one, and the ratio between the
two.
"""
import json
import numpy as np
import pandas as pd
from pvlib import atmosphere, clearsky, spectrum, irradiance

import siteconf as S
import geometry as G
import limbdark as LD
from siteconf import ROOT

LIT = json.load(open(ROOT+'/data/literature.json'))

# --- Station pressure: ICAO/ISO 2533 International Standard Atmosphere -------
# p = p0 (1 - 2.25577e-5 h)^5.25588, h in m. Used only for the pressure-
# corrected air mass; the site's true pressure varies by a few hPa day to day
# and the sensitivity of every conclusion to that is reported in the paper.
H_SITE_M = 616.1        # Copernicus GLO-30 value at the exact coordinates
P0_PA = 101325.0
P_SITE_PA = P0_PA * (1.0 - 2.25577e-5 * H_SITE_M) ** 5.25588


def alpha_hestroffer(lam_nm):
    """Limb-darkening exponent alpha(lambda), Hestroffer & Magnan (1998) eq. 5.

    Two branches, valid for 1/lambda <~ 2.4 um^-1 and >~ 2.8 um^-1. Between
    2.4 and 2.8 um^-1 (357-417 nm) the paper gives no relation because of the
    Balmer discontinuity, so we linearly blend the two branches there and flag
    that band as model-uncertain rather than silently extrapolating.
    """
    lam_um = np.asarray(lam_nm, float) / 1000.0
    inv = 1.0 / lam_um
    a_lo = -0.023 + 0.292 * inv          # valid inv <~ 2.4
    a_hi = -0.507 + 0.441 * inv          # valid inv >~ 2.8
    w = np.clip((inv - 2.4) / (2.8 - 2.4), 0.0, 1.0)
    return np.clip((1 - w) * a_lo + w * a_hi, 0.0, 1.5)


def build(t_start_utc=(2026, 8, 12, 17, 25), t_end_utc=(2026, 8, 12, 19, 30),
          step_s=1.0):
    ts = G.ts
    t0 = ts.utc(*t_start_utc)
    t1 = ts.utc(*t_end_utc)
    n = int(round((t1.tt - t0.tt) * 86400.0 / step_s)) + 1
    tt = np.linspace(t0.tt, t1.tt, n)
    T = ts.tt_jd(tt)

    sep, rs, rm, a_sun, a_moon = G.state(T)
    alt_geo, az, _ = a_sun.altaz()
    alt_ref, _, _ = a_sun.altaz(temperature_C=25.0,
                                pressure_mbar=P_SITE_PA / 100.0)
    zen_app = 90.0 - alt_ref.degrees
    d_sun_km = a_sun.distance().km

    # Extraterrestrial DNI from the true Sun-observer distance of the moment.
    dni_extra = LIT['tsi']['value_W_m2'] * (S.AU_KM / d_sun_km) ** 2

    am_rel = atmosphere.get_relative_airmass(zen_app, model='kastenyoung1989')
    am_abs = atmosphere.get_absolute_airmass(am_rel, pressure=P_SITE_PA)

    # --- Clear sky, no eclipse: the pure sunset baseline --------------------
    TL = LIT['linke_turbidity_site']['august_TL']
    cs = clearsky.ineichen(zen_app, am_abs, TL, altitude=H_SITE_M,
                           dni_extra=dni_extra, perez_enhancement=False)
    dni0 = np.asarray(cs['dni'], float)
    ghi0 = np.asarray(cs['ghi'], float)
    dhi0 = np.asarray(cs['dhi'], float)

    # --- Eclipse transmission ----------------------------------------------
    obsc_geom = G.obscuration(sep, rs, rm)
    mag = G.magnitude(sep, rs, rm)

    # Broadband, flux-weighted with limb darkening at an effective wavelength.
    # 550 nm is used for the "visible/photopic" broadband curve; the paper also
    # reports the chromatic spread from the full spectral calculation.
    a550 = float(alpha_hestroffer(550.0))
    obsc_flux = LD.flux_obscuration(sep, rs, rm, lambda mu: LD.I_power(mu, a550))

    trans = 1.0 - obsc_flux                    # direct-beam transmission factor
    dni_ecl = dni0 * trans

    # The diffuse component does NOT scale with the same factor: during an
    # eclipse the whole sky dome is illuminated by a partially covered Sun and
    # the single-scattering source is reduced roughly in proportion to the
    # direct beam, but multiple scattering and the surrounding uneclipsed
    # atmosphere keep some light. We report the DIRECT beam (which is what a
    # lens focuses and what an eye fixating the Sun receives) as the rigorous
    # quantity, and give the eclipsed GHI only under an explicitly stated
    # first-order assumption.
    ghi_ecl_firstorder = dhi0 * trans + (ghi0 - dhi0) * trans

    return pd.DataFrame({
        'tt_jd': tt,
        'utc': [x.utc_iso(places=1) for x in T],
        'seconds_from_max': (tt - json.load(
            open(ROOT+'/data/circumstances.json')
        )['contacts']['MAX']['tt_jd']) * 86400.0,
        'sun_alt_geom_deg': alt_geo.degrees,
        'sun_alt_refr_deg': alt_ref.degrees,
        'sun_az_deg': az.degrees,
        'airmass_rel': am_rel,
        'airmass_abs': am_abs,
        'sep_arcsec': np.degrees(sep) * 3600.0,
        'r_sun_arcsec': np.degrees(rs) * 3600.0,
        'r_moon_arcsec': np.degrees(rm) * 3600.0,
        'magnitude': mag,
        'obsc_geometric': obsc_geom,
        'obsc_flux_550nm': obsc_flux,
        'transmission': trans,
        'dni_extra': dni_extra,
        'dni_clear_noeclipse': dni0,
        'ghi_clear_noeclipse': ghi0,
        'dhi_clear_noeclipse': dhi0,
        'dni_eclipsed': dni_ecl,
        'ghi_eclipsed_firstorder': ghi_ecl_firstorder,
    })


def solar_radiance(dni, r_sun_rad):
    """Mean radiance of the solar disc, W m^-2 sr^-1, from the direct beam.

    Uses the PROJECTED solid angle pi sin^2(alpha_r): for a disc viewed
    normally, E = L * pi sin^2(alpha) exactly. This is the DISC-AVERAGED
    radiance; the disc centre is brighter by (alpha_LD + 2)/2, which
    central_radiance_ratio() supplies separately.
    """
    return dni / (np.pi * np.sin(r_sun_rad) ** 2)


def central_radiance_ratio(alpha):
    """I(centre)/<I> for the power-law limb darkening, = 1 / (2/(alpha+2)).

    <I> = (int_0^1 mu^alpha 2 rho drho)/(int 2 rho drho) with rho = sin(theta),
    mu = sqrt(1-rho^2)  ->  <I>/I(0) = 2/(alpha+2).
    """
    return (np.asarray(alpha, float) + 2.0) / 2.0


def _selftest():
    a = alpha_hestroffer(550.0)
    assert 0.49 < a < 0.52, a                      # Table 2 gives ~0.50 at 550 nm
    assert abs(alpha_hestroffer(579.88) - 0.4685) < 0.02   # Table 2: PS 0.473 / NL 0.477
    assert abs(alpha_hestroffer(1046.6) - (-0.023 + 0.292 / 1.0466)) < 1e-9
    # Disc-averaged radiance identity: <I>/I0 = 2/(alpha+2)
    trap = np.trapezoid if hasattr(np, 'trapezoid') else np.trapz
    for al in (0.0, 0.5, 1.0):
        rho = np.linspace(0.0, 1.0, 400001)     # projected radius on the disc
        mu = np.sqrt(np.clip(1.0 - rho ** 2, 0.0, 1.0))
        num = trap((mu ** al) * 2.0 * rho, rho)  # / int 2 rho drho = 1
        assert abs(num - 2.0 / (al + 2.0)) < 1e-4, (al, num)
    assert abs(central_radiance_ratio(0.0) - 1.0) < 1e-12
    print('radiometry selftest OK  (alpha(550nm)=%.4f, p_site=%.1f hPa)'
          % (a, P_SITE_PA / 100))


if __name__ == '__main__':
    _selftest()
    df = build()
    df.to_csv(ROOT+'/data/timeseries.csv', index=False)
    i = int(np.argmin(np.abs(df['seconds_from_max'])))
    print(df.loc[[0, i, len(df) - 1],
                 ['utc', 'sun_alt_refr_deg', 'airmass_rel', 'dni_clear_noeclipse',
                  'obsc_geometric', 'obsc_flux_550nm', 'dni_eclipsed']].to_string())
    print('rows', len(df))
