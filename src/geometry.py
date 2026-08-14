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

"""Local circumstances of the 2026-08-12 total solar eclipse at the site.

Method: direct topocentric apparent-place computation from JPL DE440s.
No Besselian elements and no interpolation of published tables -- contact times
fall out of root-finding on the apparent angular separation of the Sun and Moon
centres, so the result is independently reproducible and falsifiable against
NASA/IMCCE predictions.

Writes data/circumstances.json and data/timeseries.csv.
"""
import json
import numpy as np
from scipy.optimize import brentq, minimize_scalar

import siteconf as S
from siteconf import ROOT

ts, eph, earth, sun, moon, topos, place = S.load_all()

# Lunar radius convention. NASA's own Besselian elements for this eclipse state
# TWO constants, and they are not interchangeable:
#   k1 = 0.272488  penumbral contacts (C1, C4)
#   k2 = 0.272281  umbral contacts   (C2, C3)
# An earlier version of this file used a single k = 0.2725076 for both and
# attributed that choice to Espenak & Meeus. That was wrong: the project's own
# data/literature.json records NASA's two values, C2/C3 are umbral contacts, and
# using the larger constant inflated the totality by 3.8 s (5.1 %).
K1_PENUMBRAL = 0.272488
K2_UMBRAL = 0.272281
R_MOON_PEN_KM = K1_PENUMBRAL * S.R_EARTH_KM     # 1736.77 km
R_MOON_UMB_KM = K2_UMBRAL * S.R_EARTH_KM        # 1735.45 km
R_MOON_ECL_KM = R_MOON_UMB_KM                   # default: the umbral constant
R_MOON_PHYS_KM = S.R_MOON_KM                    # 1737.4 km, mean figure
K_LEGACY = 0.2725076                            # kept only for the sensitivity table


def state(t, r_moon_km=R_MOON_ECL_KM):
    """Topocentric apparent geometry at time(s) t (Skyfield Time, scalar or array)."""
    a_sun = place.at(t).observe(sun).apparent()
    a_moon = place.at(t).observe(moon).apparent()
    sep = a_sun.separation_from(a_moon).radians
    rs = np.arcsin(S.R_SUN_KM / a_sun.distance().km)
    rm = np.arcsin(r_moon_km / a_moon.distance().km)
    return sep, rs, rm, a_sun, a_moon


def g_outer(tt_jd, r_moon_km=R_MOON_ECL_KM):
    sep, rs, rm, *_ = state(ts.tt_jd(tt_jd), r_moon_km)
    return float(sep - (rs + rm))


def g_inner(tt_jd, r_moon_km=R_MOON_ECL_KM):
    sep, rs, rm, *_ = state(ts.tt_jd(tt_jd), r_moon_km)
    return float(sep - abs(rm - rs))


def sep_only(tt_jd):
    return float(state(ts.tt_jd(tt_jd))[0])


def obscuration(sep, rs, rm):
    """Fraction of the solar disc AREA hidden. Exact circle-circle lens area."""
    sep = np.atleast_1d(np.asarray(sep, float))
    rs = np.atleast_1d(np.asarray(rs, float) * np.ones_like(sep))
    rm = np.atleast_1d(np.asarray(rm, float) * np.ones_like(sep))
    out = np.zeros_like(sep)
    total = sep <= np.abs(rm - rs)
    out[total & (rm >= rs)] = 1.0
    m = (sep < rs + rm) & (sep > np.abs(rm - rs))
    d, r, R = sep[m], rs[m], rm[m]
    a1 = r * r * np.arccos(np.clip((d * d + r * r - R * R) / (2 * d * r), -1, 1))
    a2 = R * R * np.arccos(np.clip((d * d + R * R - r * r) / (2 * d * R), -1, 1))
    a3 = 0.5 * np.sqrt(np.clip((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R), 0, None))
    out[m] = (a1 + a2 - a3) / (np.pi * r * r)
    return out


def magnitude(sep, rs, rm):
    """Eclipse magnitude: fraction of the solar DIAMETER covered."""
    sep = np.atleast_1d(np.asarray(sep, float))
    rs = np.atleast_1d(np.asarray(rs, float) * np.ones_like(sep))
    rm = np.atleast_1d(np.asarray(rm, float) * np.ones_like(sep))
    mag = (rs + rm - sep) / (2.0 * rs)
    mag = np.where(sep >= rs + rm, 0.0, mag)
    mag = np.where(sep <= np.abs(rm - rs), rm / rs, mag)
    return mag


def find_contacts(r_moon_km=R_MOON_ECL_KM):
    t0, t1 = ts.utc(2026, 8, 12, 0), ts.utc(2026, 8, 13, 0)
    tt = np.linspace(t0.tt, t1.tt, 24 * 60 * 4)     # 15 s scan
    sep, rs, rm, *_ = state(ts.tt_jd(tt), r_moon_km)
    res = {}
    for name, g, fn in (('outer', sep - (rs + rm), g_outer),
                        ('inner', sep - np.abs(rm - rs), g_inner)):
        r = []
        for i in np.where(np.diff(np.sign(g)) != 0)[0]:
            r.append(brentq(fn, tt[i], tt[i + 1], args=(r_moon_km,),
                            xtol=1e-11, rtol=8.9e-16))
        res[name] = r
    return res


def find_contacts_split():
    """C1/C4 with the penumbral constant, C2/C3 with the umbral one, as NASA does."""
    out = find_contacts(R_MOON_PEN_KM)['outer']
    inn = find_contacts(R_MOON_UMB_KM)['inner']
    return {'outer': out, 'inner': inn}


def main():
    c = find_contacts_split()
    out_r, in_r = c['outer'], c['inner']
    contacts = {}
    if len(out_r) == 2:
        contacts['C1'], contacts['C4'] = out_r
    if len(in_r) == 2:
        contacts['C2'], contacts['C3'] = in_r
    lo = out_r[0] if out_r else ts.utc(2026, 8, 12, 17).tt
    hi = out_r[-1] if out_r else ts.utc(2026, 8, 12, 21).tt
    # Bracket the minimum on a dense grid first: bounded-Brent alone converges
    # to the wrong point on this ~1.8 h interval.
    grid = np.linspace(lo, hi, 4001)
    sg, _, _, _, _ = state(ts.tt_jd(grid))
    j = int(np.argmin(sg))
    contacts['MAX'] = minimize_scalar(
        sep_only, bracket=None, bounds=(grid[max(j - 1, 0)], grid[min(j + 1, len(grid) - 1)]),
        method='bounded', options={'xatol': 1e-11}).x

    doc = {
        'ephemeris': 'JPL DE440s',
        'lunar_radius_convention': {
            'k1_penumbral': K1_PENUMBRAL, 'k2_umbral': K2_UMBRAL,
            'R_moon_penumbral_km': R_MOON_PEN_KM, 'R_moon_umbral_km': R_MOON_UMB_KM,
            'applied': 'k1 for C1/C4, k2 for C2/C3, as in NASA\'s Besselian elements',
            'source': 'NASA Besselian elements SE2026Aug12T (see literature.json)'},
        'site': {'lat_deg': S.LAT_DEG, 'lon_deg': S.LON_DEG, 'elev_m': S.ELEV_M},
        'delta_t_s': float(ts.tt_jd(contacts['MAX']).delta_t),
        'contacts': {},
    }
    order = [k for k in ['C1', 'C2', 'MAX', 'C3', 'C4'] if k in contacts]
    for lab in order:
        t = ts.tt_jd(contacts[lab])
        rk = R_MOON_UMB_KM if lab in ('C2', 'C3', 'MAX') else R_MOON_PEN_KM
        sep, rs, rm, a_sun, a_moon = state(t, rk)
        alt_g, az, _ = a_sun.altaz()
        alt_r, _, _ = a_sun.altaz(temperature_C=25.0, pressure_mbar=942.0)
        doc['contacts'][lab] = {
            'utc': t.utc_iso(places=1),
            'local_cest': (t.astimezone(__import__('zoneinfo').ZoneInfo('Europe/Madrid'))
                           .strftime('%Y-%m-%d %H:%M:%S.%f')[:-5] + ' CEST'),
            'tt_jd': float(contacts[lab]),
            'sep_arcsec': float(np.degrees(sep) * 3600),
            'r_sun_arcsec': float(np.degrees(rs) * 3600),
            'r_moon_arcsec': float(np.degrees(rm) * 3600),
            'sun_alt_geometric_deg': float(alt_g.degrees),
            'sun_alt_refracted_deg': float(alt_r.degrees),
            'sun_az_deg': float(az.degrees),
            'magnitude': float(magnitude(sep, rs, rm)[0]),
            'obscuration': float(obscuration(sep, rs, rm)[0]),
            'd_sun_km': float(a_sun.distance().km),
            'd_moon_km': float(a_moon.distance().km),
        }
    if 'C2' in contacts and 'C3' in contacts:
        doc['totality_duration_s'] = (contacts['C3'] - contacts['C2']) * 86400.0
        for tag, rk in (('k_physical_1737.4km', R_MOON_PHYS_KM),
                        ('k_legacy_0.2725076', K_LEGACY * S.R_EARTH_KM),
                        ('k1_penumbral', R_MOON_PEN_KM)):
            c2 = find_contacts(rk)['inner']
            if len(c2) == 2:
                doc['totality_duration_s_' + tag] = (c2[1] - c2[0]) * 86400.0
    if len(out_r) == 2:
        doc['partial_duration_s'] = (out_r[1] - out_r[0]) * 86400.0

    # Sunset (upper limb, standard refraction) for the "how close to sunset" framing.
    from skyfield import almanac
    f = almanac.dark_twilight_day(eph, topos)
    t_a, t_b = ts.utc(2026, 8, 12, 12), ts.utc(2026, 8, 13, 4)
    times, events = almanac.find_discrete(t_a, t_b, f)
    doc['twilight_events'] = [
        {'utc': ti.utc_iso(places=0),
         'local_cest': ti.astimezone(__import__('zoneinfo').ZoneInfo('Europe/Madrid')).strftime('%H:%M:%S'),
         'to_state': almanac.TWILIGHTS[int(ev)]}
        for ti, ev in zip(times, events)]

    with open(ROOT+'/data/circumstances.json', 'w') as fh:
        json.dump(doc, fh, indent=2)
    print(json.dumps(doc, indent=2))


if __name__ == '__main__':
    main()
