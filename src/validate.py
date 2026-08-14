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

"""Independent validations. Every one of these must pass before the paper is
allowed to quote a number that depends on the corresponding module.

V1  SPECTRL2 implementation vs the ASTM G173-03 reference spectrum.
V2  Eclipse contact times vs NASA's published Besselian elements, computed
    through a completely separate algorithm (Besselian local circumstances)
    that shares no code and no ephemeris with the DE440s calculation.
V3  Solar angular radius and Earth-Sun distance vs independent expectations.
V4  Air-mass model spread at the geometry of interest.
"""
import json
import numpy as np
from pvlib import spectrum, atmosphere as pvatm
from scipy.optimize import brentq

import siteconf as S
import geometry as G
from siteconf import ROOT

LIT = json.load(open(ROOT+'/data/literature.json'))
CIRC = json.load(open(ROOT+'/data/circumstances.json'))
trap = np.trapezoid if hasattr(np, 'trapezoid') else np.trapz


def v1_spectrl2_vs_astm_g173():
    """ASTM G173-03 defines the reference direct+circumsolar spectrum at
    AM1.5 with a specified atmosphere. Running SPECTRL2 with exactly those
    inputs must reproduce the standard's integrated direct irradiance
    (900.1 W/m^2) to within the model's stated accuracy."""
    z = np.degrees(np.arccos(1.0 / 1.5))
    am = pvatm.get_relative_airmass(z, model='kastenyoung1989')
    sp = spectrum.spectrl2(
        apparent_zenith=z, aoi=48.19, surface_tilt=37.0, ground_albedo=0.2,
        surface_pressure=101300.0, relative_airmass=am,
        precipitable_water=1.42, ozone=0.34, aerosol_turbidity_500nm=0.084,
        dayofyear=80)
    lam = np.asarray(sp['wavelength'], float)
    dni = np.asarray(sp['dni'], float).ravel()
    total = float(trap(dni, lam))
    ref = 900.1                      # ASTM G173-03 direct+circumsolar integral
    err = 100.0 * (total - ref) / ref
    return {'spectrl2_dni_AM1.5': total, 'astm_g173_reference': ref,
            'rel_error_pct': err, 'airmass_used': float(am),
            'pass': abs(err) < 10.0}


# ---------------------------------------------------------------------------
# V2: Besselian-element local circumstances (Explanatory Supplement / Meeus,
# Astronomical Algorithms 2nd ed., ch. 54). Independent of DE440s and of
# Skyfield: it consumes only NASA's published polynomial coefficients.
# ---------------------------------------------------------------------------
def _bessel_at(t_h, B):
    """Evaluate the Besselian elements at t_h hours from t0 (TDT)."""
    p = lambda c: sum(ci * t_h ** i for i, ci in enumerate(c))
    x, y = p(B['x']), p(B['y'])
    d = np.radians(p(B['d_deg']))
    mu = np.radians(p(B['mu_deg']))
    l1, l2 = p(B['l1']), p(B['l2'])
    return x, y, d, mu, l1, l2


def v2_central_line_check():
    """Test the Besselian implementation where NASA publishes an answer.

    V2 previously had no pass/fail criterion at all, which is how a one-line bug
    in it survived long enough to be written into the manuscript as physics.
    """
    B = LIT['nasa_besselian_2026aug12']
    dmu = np.radians(1.002738 * B['delta_t_s'] * 15.0 / 3600.0)
    f = 1.0 / 298.257223563
    e2 = 2 * f - f * f

    def duration_at(lat_deg, lon_deg, h_m=0.0):
        lat, lon = np.radians(lat_deg), np.radians(lon_deg)
        N = 1.0 / np.sqrt(1 - e2 * np.sin(lat) ** 2)
        rc = (N + h_m / 1000.0 / S.R_EARTH_KM) * np.cos(lat)
        rs_ = (N * (1 - e2) + h_m / 1000.0 / S.R_EARTH_KM) * np.sin(lat)

        def g(t_h):
            x, y, d, mu, l1, l2 = _bessel_at(t_h, B)
            H = mu + lon - dmu
            xi = rc * np.sin(H)
            eta = rs_ * np.cos(d) - rc * np.cos(H) * np.sin(d)
            zeta = rs_ * np.sin(d) + rc * np.cos(H) * np.cos(d)
            return np.hypot(x - xi, y - eta) - abs(l2 - zeta * B['tan_f2'])

        grid = np.linspace(-1.5, 1.6, 40001)
        v = np.array([g(t) for t in grid])
        idx = np.where(np.diff(np.sign(v)) != 0)[0]
        if len(idx) < 2:
            return 0.0
        a = brentq(g, grid[idx[0]], grid[idx[0] + 1], xtol=1e-12)
        b = brentq(g, grid[idx[-1]], grid[idx[-1] + 1], xtol=1e-12)
        return (b - a) * 3600.0

    # NASA's published central line and central duration, SE2026Aug12Tpath.
    pts = [('18:26', 44 + 42.8 / 60, -(8 + 23.9 / 60), 113.0),
           ('18:28', 43 + 22.3 / 60, -(6 + 11.3 / 60), 109.3),
           ('18:30', 41 + 49.0 / 60, -(3 + 11.1 / 60), 104.6),
           ('18:32', 39 + 24.5 / 60, +(2 + 57.0 / 60), 95.8)]
    rows, worst = [], 0.0
    for ut, la, lo, published in pts:
        got = duration_at(la, lo)
        rows.append({'ut': ut, 'nasa_published_s': published,
                     'besselian_reimplementation_s': round(got, 2),
                     'diff_s': round(got - published, 2)})
        worst = max(worst, abs(got - published))
    return {'rows': rows, 'worst_abs_diff_s': round(worst, 2),
            'pass': bool(worst < 1.5),
            'criterion': 'reproduce NASA central-line durations to better than 1.5 s'}


def v2_besselian_contacts():
    B = LIT['nasa_besselian_2026aug12']
    f1, f2 = np.arctan(B['tan_f1']), np.arctan(B['tan_f2'])
    lat = np.radians(S.LAT_DEG)
    lon = np.radians(S.LON_DEG)
    h_m = 616.1
    # Geocentric coordinates of the observer (IAU 1976 flattening), in Earth radii
    f = 1.0 / 298.257223563
    e2 = 2 * f - f * f
    a_km = S.R_EARTH_KM
    N = 1.0 / np.sqrt(1 - e2 * np.sin(lat) ** 2)
    rho_cos = (N + h_m / 1000.0 / a_km) * np.cos(lat)
    rho_sin = (N * (1 - e2) + h_m / 1000.0 / a_km) * np.sin(lat)

    # Espenak's mu is tabulated as an EPHEMERIS hour angle, against TDT. Turning
    # it into the observer's UNIVERSAL hour angle needs the Delta-T term below.
    # Omitting it slid the whole umbral path 1.002738 * 71.4 * 15/3600 = 0.2983
    # deg of longitude west, which is 25 km at this latitude, and manufactured a
    # 15 s discrepancy that two paragraphs of this paper then tried to explain
    # away as grazing-incidence sensitivity.
    dmu = np.radians(1.002738 * B['delta_t_s'] * 15.0 / 3600.0)

    def sep_fn(t_h):
        x, y, d, mu, l1, l2 = _bessel_at(t_h, B)
        H = mu + lon - dmu                 # universal hour angle of the shadow axis
        xi = rho_cos * np.sin(H)
        eta = rho_sin * np.cos(d) - rho_cos * np.cos(H) * np.sin(d)
        zeta = rho_sin * np.sin(d) + rho_cos * np.cos(H) * np.cos(d)
        u, v = x - xi, y - eta
        L1p = l1 - zeta * B['tan_f1']
        L2p = l2 - zeta * B['tan_f2']
        return np.hypot(u, v), L1p, L2p

    from scipy.optimize import brentq
    grid = np.linspace(-2.0, 2.0, 20001)   # hours from t0 = 18:00 TDT
    m, L1p, L2p = sep_fn(grid)
    res = {}
    for tag, f_ in (('C1C4', m - L1p), ('C2C3', m + L2p)):
        r = []
        for i in np.where(np.diff(np.sign(f_)) != 0)[0]:
            fn = (lambda th: sep_fn(th)[0] - sep_fn(th)[1]) if tag == 'C1C4' \
                else (lambda th: sep_fn(th)[0] + sep_fn(th)[2])
            r.append(brentq(fn, grid[i], grid[i + 1], xtol=1e-10))
        res[tag] = r

    # t0 = 2026-08-12 18:00:00.0 TDT; convert TDT->UTC with NASA's own Delta T.
    dt_nasa = B['delta_t_s']
    out = {}
    lab = {'C1C4': ['C1', 'C4'], 'C2C3': ['C2', 'C3']}
    for tag, times in res.items():
        for name, th in zip(lab[tag], times):
            ut_h = 18.0 + th - dt_nasa / 3600.0
            out[name] = ut_h
    if 'C2' in out and 'C3' in out:
        out['totality_s'] = (out['C3'] - out['C2']) * 3600.0
    return out


def v3_geometry_sanity():
    t = G.ts.tt_jd(CIRC['contacts']['MAX']['tt_jd'])
    sep, rs, rm, a_sun, a_moon = G.state(t)
    rs_as = np.degrees(rs) * 3600
    d_au = a_sun.distance().au
    # Apparent solar semidiameter at 1 au is 959.63" (IAU / Allen's AQ).
    sd_1au = rs_as * d_au
    return {'sun_semidiameter_arcsec': float(rs_as),
            'sun_distance_au': float(d_au),
            'implied_semidiameter_at_1au': float(sd_1au),
            'expected_959.63': 959.63,
            'pass': abs(sd_1au - 959.63) < 0.5}


def v4_airmass_spread():
    out = {}
    for alt in (4.75, 10.0, 15.26):
        z = 90.0 - alt
        row = {}
        for m in ('kastenyoung1989', 'young1994', 'pickering2002',
                  'gueymard2003', 'kasten1966'):
            try:
                row[m] = float(pvatm.get_relative_airmass(z, model=m))
            except Exception as e:
                row[m] = str(e)
        vals = [v for v in row.values() if isinstance(v, float)]
        row['spread_pct'] = 100.0 * (max(vals) - min(vals)) / np.mean(vals)
        out['alt_%.2f_deg' % alt] = row
    return out


if __name__ == '__main__':
    rep = {'V1_spectrl2_vs_astm_g173': v1_spectrl2_vs_astm_g173(),
           'V2_central_line_vs_nasa': v2_central_line_check(),
           'V2_besselian_contacts_UT_hours': v2_besselian_contacts(),
           'V3_geometry': v3_geometry_sanity(),
           'V4_airmass_spread': v4_airmass_spread()}
    # Compare V2 against the DE440s result.
    de = {}
    for k in ['C1', 'C2', 'C3', 'C4']:
        s = CIRC['contacts'][k]['utc']
        hh, mm, ss = s[11:13], s[14:16], s[17:21]
        de[k] = int(hh) + int(mm) / 60 + float(ss) / 3600
    rep['V2_vs_DE440s_seconds'] = {
        k: (rep['V2_besselian_contacts_UT_hours'][k] - de[k]) * 3600
        for k in ['C1', 'C2', 'C3', 'C4'] if k in rep['V2_besselian_contacts_UT_hours']}
    rep['V2_totality_DE440s_s'] = CIRC['totality_duration_s']
    def np_safe(o):
        if isinstance(o, (np.bool_,)):
            return bool(o)
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return float(o)
        raise TypeError(type(o))

    with open(ROOT+'/data/validation.json', 'w') as fh:
        json.dump(rep, fh, indent=2, default=np_safe)
    print(json.dumps(rep, indent=2, default=np_safe))
