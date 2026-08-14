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

"""Where the site sits inside the umbral path, and how sensitive the local
circumstances are to that position.

Motivation: the DE440s calculation gives 74 s of totality while NASA's
published Besselian elements give 59 s. Before blaming either, find out how
steeply the duration varies across the path. If the site is close to a limit,
a sub-kilometre difference in the two shadow solutions explains the whole
discrepancy -- and the user needs to know that his duration is fragile and
which way to walk.

Everything here re-runs the same DE440s contact solver at displaced observer
positions; no new physics, just a map.
"""
import json
import numpy as np
from scipy.optimize import brentq
from skyfield.api import wgs84

import siteconf as S
import geometry as G
from siteconf import ROOT

R_EARTH_M = 6_371_008.8


def umbral_miss(lat, lon, elev_m=616.1, r_moon_km=G.R_MOON_ECL_KM):
    """Signed closest approach to umbral immersion, in radians.

    min_t [ sep(t) - |r_moon - r_sun| ]. Negative INSIDE the umbral path, zero
    exactly on the limit, positive outside. A signed quantity is required for a
    root-finder to locate the limit at all: the previous code returned a
    duration that is identically 0.0 outside the path, so brentq saw f(b) == 0
    at its bracket endpoint and returned that endpoint without iterating. The
    published "55 km to the northern limit" was the arbitrary bracket width
    (hi_edge + 5.0), not a property of the eclipse.
    """
    place = G.earth + wgs84.latlon(lat, lon, elevation_m=elev_m)
    lo = G.ts.utc(2026, 8, 12, 18, 20).tt
    hi = G.ts.utc(2026, 8, 12, 18, 40).tt
    grid = np.linspace(lo, hi, 1201)
    T = G.ts.tt_jd(grid)
    a_sun = place.at(T).observe(G.sun).apparent()
    a_moon = place.at(T).observe(G.moon).apparent()
    sep = a_sun.separation_from(a_moon).radians
    rs = np.arcsin(S.R_SUN_KM / a_sun.distance().km)
    rm = np.arcsin(r_moon_km / a_moon.distance().km)
    g = sep - np.abs(rm - rs)
    j = int(np.argmin(g))
    from scipy.optimize import minimize_scalar

    def gg(x):
        t = G.ts.tt_jd(x)
        a1 = place.at(t).observe(G.sun).apparent()
        a2 = place.at(t).observe(G.moon).apparent()
        return float(a1.separation_from(a2).radians
                     - abs(np.arcsin(r_moon_km / a2.distance().km)
                           - np.arcsin(S.R_SUN_KM / a1.distance().km)))
    r = minimize_scalar(gg, bounds=(grid[max(j - 1, 0)], grid[min(j + 1, len(grid) - 1)]),
                        method='bounded', options={'xatol': 1e-11})
    return float(r.fun)


def totality_duration(lat, lon, elev_m=616.1, r_moon_km=G.R_MOON_ECL_KM):
    """Duration of totality (s) for an observer at lat/lon. 0 if not total."""
    place = G.earth + wgs84.latlon(lat, lon, elevation_m=elev_m)

    def g_inner(tt_jd):
        t = G.ts.tt_jd(tt_jd)
        a_sun = place.at(t).observe(G.sun).apparent()
        a_moon = place.at(t).observe(G.moon).apparent()
        sep = a_sun.separation_from(a_moon).radians
        rs = np.arcsin(S.R_SUN_KM / a_sun.distance().km)
        rm = np.arcsin(r_moon_km / a_moon.distance().km)
        return float(sep - abs(rm - rs))

    lo = G.ts.utc(2026, 8, 12, 18, 20).tt
    hi = G.ts.utc(2026, 8, 12, 18, 40).tt
    grid = np.linspace(lo, hi, 2401)          # 0.5 s steps
    vals = np.array([g_inner(x) for x in grid])
    sign = np.sign(vals)
    idx = np.where(np.diff(sign) != 0)[0]
    if len(idx) < 2:
        return 0.0
    t_a = brentq(g_inner, grid[idx[0]], grid[idx[0] + 1], xtol=1e-11)
    t_b = brentq(g_inner, grid[idx[-1]], grid[idx[-1] + 1], xtol=1e-11)
    return (t_b - t_a) * 86400.0


def offset(lat, lon, north_km, east_km):
    dlat = north_km / 111.19492664455873
    dlon = east_km / (111.19492664455873 * np.cos(np.radians(lat)))
    return lat + dlat, lon + dlon


def main():
    lat0, lon0 = S.LAT_DEG, S.LON_DEG
    d0 = totality_duration(lat0, lon0)

    # 1-D scan perpendicular-ish to the path. The path runs roughly NW-SE here,
    # so scan due north/south, which is close enough to across-track to find
    # both limits, and record the true across-track distance afterwards.
    scan = {}
    for dn in np.arange(-260.0, 80.1, 10.0):
        la, lo = offset(lat0, lon0, dn, 0.0)
        scan[float(dn)] = totality_duration(la, lo)

    ns = sorted(scan)
    dur = np.array([scan[k] for k in ns])
    ns = np.array(ns)

    # Limits: where duration -> 0
    def dur_at(dn):
        la, lo = offset(lat0, lon0, dn, 0.0)
        return totality_duration(la, lo)

    # Limits from the SIGNED miss distance, which actually has a root there.
    def miss_at(dn, de=0.0):
        la, lo = offset(lat0, lon0, dn, de)
        return umbral_miss(la, lo)

    lim = {}
    hi_edge = ns[dur > 0].max() if np.any(dur > 0) else 0.0
    lo_edge = ns[dur > 0].min() if np.any(dur > 0) else 0.0
    try:
        lim['north_limit_km_due_north'] = brentq(miss_at, hi_edge, hi_edge + 25.0, xtol=1e-3)
    except Exception as e:
        lim['north_limit_km_due_north'] = None
    try:
        lim['south_limit_km_due_north'] = brentq(miss_at, lo_edge - 25.0, lo_edge, xtol=1e-3)
    except Exception:
        lim['south_limit_km_due_north'] = None

    # Perpendicular distance to the nearest limit: |miss| divided by the norm of
    # its spatial gradient. "How far to the edge" means the perpendicular, not
    # the distance along an arbitrary meridian scan.
    m0 = umbral_miss(lat0, lon0)
    h = 2.0
    gn = (miss_at(h) - miss_at(-h)) / (2 * h)
    ge = (miss_at(0.0, h) - miss_at(0.0, -h)) / (2 * h)
    gnorm = float(np.hypot(gn, ge))
    lim['miss_at_site_rad'] = float(m0)
    lim['grad_per_km'] = {'north': float(gn), 'east': float(ge), 'norm': gnorm}
    lim['perpendicular_distance_to_limit_km'] = float(abs(m0) / gnorm) if gnorm else None
    lim['limit_bearing_deg'] = float((np.degrees(np.arctan2(ge, gn)) + 360.0) % 360.0)

    # Maximum duration along the scan = centre line crossing
    j = int(np.argmax(dur))
    from scipy.optimize import minimize_scalar
    mx = minimize_scalar(lambda x: -dur_at(x),
                         bounds=(ns[max(j - 1, 0)], ns[min(j + 1, len(ns) - 1)]),
                         method='bounded', options={'xatol': 0.05})

    # Local sensitivity: seconds of totality gained per km walked north.
    eps = 1.0
    grad = (dur_at(eps) - dur_at(-eps)) / (2 * eps)

    # Sensitivity to a Delta-T error: shifting UT by dT is equivalent to
    # rotating the observer eastward by dT * 465.1 m/s * cos(lat).
    v_rot = 465.1 * np.cos(np.radians(lat0))
    dT = 2.23                                    # NASA 71.4 s minus IERS 69.17 s
    la, lo = offset(lat0, lon0, 0.0, v_rot * dT / 1000.0)
    d_dt = totality_duration(la, lo)

    # Sensitivity to the lunar-radius convention.
    d_k2 = totality_duration(lat0, lon0, r_moon_km=0.272281 * S.R_EARTH_KM)
    d_kphys = totality_duration(lat0, lon0, r_moon_km=S.R_MOON_KM)

    out = {
        'duration_at_site_s': d0,
        'scan_north_km_to_duration_s': {str(k): scan[k] for k in ns.tolist()},
        'limits_km_north_of_site': lim,
        'centre_line_offset_km_north': float(mx.x),
        'centre_line_duration_s': float(-mx.fun),
        'gradient_s_per_km_north': float(grad),
        'sensitivity': {
            'duration_with_k2_0.272281_s': d_k2,
            'duration_with_physical_R1737.4_s': d_kphys,
            'duration_if_deltaT_were_NASA_71.4_s': d_dt,
            'note': ('A Delta-T error of %.2f s is equivalent to displacing the '
                     'observer %.2f km east along the parallel.' % (dT, v_rot * dT / 1000.0)),
        },
    }
    with open(ROOT+'/data/pathgeom.json', 'w') as fh:
        json.dump(out, fh, indent=2)
    print(json.dumps({k: v for k, v in out.items()
                      if k != 'scan_north_km_to_duration_s'}, indent=2))
    print('\nscan (km north -> s):')
    for k in ns.tolist():
        print('  %+6.1f  %6.2f' % (k, scan[k]))


if __name__ == '__main__':
    main()
