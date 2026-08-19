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

"""Catalogue of solar eclipses with Besselian elements derived from DE440s.

The rest of the project answers one eclipse at one point. The web front end has
to answer any eclipse at any point, and it cannot carry a 32 MB ephemeris or a
root finder into a browser. Besselian elements are the compression that makes
that possible: about forty numbers per eclipse reproduce the whole shadow
geometry to sub-kilometre accuracy for the few hours the event lasts.

Nothing here is copied from a published table. The elements are computed from
the same DE440s ephemeris the manuscript uses, so they carry the project's own
provenance, and `_selftest()` checks them against NASA's published elements for
2026-08-12 and against NASA's published central-line durations.

Two deliberate convention differences remain against NASA and both are declared:

* Solar radius. This project adopts the IAU 2015 nominal 695 700 km; NASA's
  elements imply 696 000 km. The cone half-angles differ by 2e-6, which moves
  the umbral limits by roughly 700 m.
* Delta T. Skyfield gives 69.10 s for 2026; NASA adopted 71.4 s. Each side is
  self-consistent, so the ground track is the same; only the tabulated mu
  differs, by 0.0096 deg.

Writes web/data/eclipses.json.
"""
import json
import numpy as np
from skyfield import almanac
from scipy.optimize import brentq, minimize_scalar
from skyfield.api import load, load_file

import siteconf as S
import geometry as G
from siteconf import ROOT

K1 = 0.272488          # penumbral Moon/Earth radius ratio (NASA, see geometry.py)
K2 = 0.272281          # umbral
RS_ER = S.R_SUN_KM / S.R_EARTH_KM
F = 1.0 / 298.257223563
E2 = 2 * F - F * F
SQ = np.sqrt(1.0 - E2)

ts = load.timescale()
eph = load_file(S.EPH_PATH)
earth, sun, moon = eph['earth'], eph['sun'], eph['moon']


def _rect(app, t):
    """Apparent geocentric rectangular coordinates, true equinox of date, in Earth radii."""
    ra, dec, dist = app.radec(epoch=t)
    r = dist.km / S.R_EARTH_KM
    a, d = ra.radians, dec.radians
    return np.array([r * np.cos(d) * np.cos(a), r * np.cos(d) * np.sin(a), r * np.sin(d)])


def raw(t):
    """Instantaneous Besselian quantities at Skyfield time(s) t.

    Returns x, y, d_deg, mu_deg, l1, l2, tan_f1, tan_f2. The shadow axis is
    directed positive towards the Sun, which is why d tracks the solar
    declination rather than its negative.
    """
    Sv = _rect(earth.at(t).observe(sun).apparent(), t)
    Mv = _rect(earth.at(t).observe(moon).apparent(), t)
    G = Sv - Mv
    ds = np.sqrt((G ** 2).sum(axis=0))
    a = np.arctan2(G[1], G[0])
    d = np.arcsin(G[2] / ds)
    ca, sa, cd, sd = np.cos(a), np.sin(a), np.cos(d), np.sin(d)
    x = -Mv[0] * sa + Mv[1] * ca
    y = -Mv[0] * sd * ca - Mv[1] * sd * sa + Mv[2] * cd
    z = Mv[0] * cd * ca + Mv[1] * cd * sa + Mv[2] * sd
    f1 = np.arcsin((RS_ER + K1) / ds)
    f2 = np.arcsin((RS_ER - K2) / ds)
    l1 = z * np.tan(f1) + K1 / np.cos(f1)
    l2 = z * np.tan(f2) - K2 / np.cos(f2)
    mu = (t.gast * 15.0 - np.degrees(a)) % 360.0
    return x, y, np.degrees(d), mu, l1, l2, np.tan(f1), np.tan(f2)


def elements(t0, span_h=4.0, n=33):
    """Fit polynomial Besselian elements about whole-hour epoch t0 (a Skyfield time).

    Degrees follow NASA's tabulation: cubic in x and y, quadratic in d, l1 and
    l2, linear in mu. The span is four hours and not three because first
    contact at a point far from the axis can fall 3.3 h before the whole-hour
    epoch, and an element set that does not reach it makes the contact
    disappear rather than come out wrong, which is worse. Fitting over the
    range where it is used costs nothing: the residual against the direct
    computation stays under 5e-7 Earth radii, three millimetres on the ground. mu is emitted in NASA's EPHEMERIS hour-angle convention,
    so a consumer converts to the observer's universal hour angle by
    subtracting 1.002738 * delta_t * 15 / 3600 degrees, exactly as
    validate.py does.
    """
    h = np.linspace(-span_h, span_h, n)
    T = ts.tt_jd(t0.tt + h / 24.0)
    x, y, d, mu, l1, l2, tf1, tf2 = raw(T)
    dt = float((T.tt[0] - T.ut1[0]) * 86400.0)
    mu = np.degrees(np.unwrap(np.radians(mu))) + 1.002738 * dt * 15.0 / 3600.0
    fit = lambda v, k: [float(c) for c in np.polyfit(h, v, k)[::-1]]
    return {'t0_TT': t0.tt_strftime('%Y-%m-%d %H:%M:%S'), 't0_TT_jd': float(t0.tt),
            'delta_t_s': round(dt, 3),
            'x': fit(x, 3), 'y': fit(y, 3), 'd_deg': fit(d, 2), 'mu_deg': fit(mu, 1),
            'l1': fit(l1, 2), 'l2': fit(l2, 2),
            'tan_f1': float(tf1.mean()), 'tan_f2': float(tf2.mean()),
            'k1_penumbra': K1, 'k2_umbra': K2}


def evaluate(B, t_h):
    """Evaluate fitted elements at t_h hours from t0 (TT). Mirrors validate.py::_bessel_at."""
    p = lambda c: sum(ci * t_h ** i for i, ci in enumerate(c))
    return (p(B['x']), p(B['y']), np.radians(p(B['d_deg'])),
            np.radians(p(B['mu_deg'])), p(B['l1']), p(B['l2']))


def axis_point(B, t_h):
    """Where the shadow axis meets the ellipsoid, and the umbral radius there.

    Returns (lat_deg, lon_deg_east, zeta, l2_prime) or None if the axis misses
    the Earth. The ellipsoid is mapped onto a unit sphere through the reduced
    latitude, which is what makes the intersection a closed-form square root
    instead of an iteration.
    """
    x, y, d, mu, l1, l2 = evaluate(B, t_h)
    r1 = np.sqrt(1.0 - E2 * np.cos(d) ** 2)
    sd1, cd1 = np.sin(d) / r1, SQ * np.cos(d) / r1
    e1 = y / r1
    q = 1.0 - x * x - e1 * e1
    if q <= 0.0:
        return None
    c = np.sqrt(q)
    su = e1 * cd1 + c * sd1                      # sin of the reduced latitude
    if abs(su) >= 1.0:
        return None
    cu = np.sqrt(1.0 - su * su)
    b = c * cd1 - e1 * sd1                       # cos u * cos H
    H = np.arctan2(x, b)
    lat = np.degrees(np.arctan2(su, SQ * cu))    # reduced -> geodetic
    dmu = np.radians(1.002738 * B['delta_t_s'] * 15.0 / 3600.0)
    lon = np.degrees((H - mu + dmu + np.pi) % (2 * np.pi) - np.pi)
    zeta = SQ * su * np.sin(d) + cu * np.cos(H) * np.cos(d)
    return lat, lon, zeta, l2 - zeta * B['tan_f2']


def _gamma(t):
    """Signed least distance of the shadow axis from the Earth's centre.

    The sign is not decoration: gamma is positive when the axis passes north of
    the centre, and every published catalogue tabulates it that way, so an
    unsigned value silently fails to match any of them and throws away which
    hemisphere the eclipse belongs to. The sign is that of y at closest
    approach, the fundamental plane's northward coordinate.
    """
    x, y = raw(t)[:2]
    return np.copysign(np.hypot(x, y), y)


def find_eclipses(y0, y1):
    """Instants of greatest eclipse between years y0 and y1, one per solar eclipse."""
    t0, t1 = ts.utc(y0, 1, 1), ts.utc(y1, 12, 31)
    times, phases = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
    out = []
    for t in times[phases == 0]:
        h = np.linspace(-8.0, 8.0, 193)
        g = np.abs(_gamma(ts.tt_jd(t.tt + h / 24.0)))
        j = int(np.argmin(g))
        lo, hi = h[max(j - 1, 0)], h[min(j + 1, len(h) - 1)]
        hf = np.linspace(lo, hi, 241)
        tf = ts.tt_jd(t.tt + hf / 24.0)
        gf = _gamma(tf)
        k = int(np.argmin(np.abs(gf)))
        if abs(gf[k]) < 1.55:
            out.append((ts.tt_jd(t.tt + hf[k] / 24.0), float(gf[k])))
    return out


def grazes(B, t_h):
    """Does the umbral cone reach the surface when the AXIS misses it?

    Between gamma 0.9972 and about 1.03 the shadow axis passes outside the
    Earth while the cone still clips the limb: those are the non-central total
    and annular eclipses. Classifying by the axis alone calls them partial,
    which draws no umbral band on the map while a point inside that band is
    told, correctly, that it sees totality. A map that contradicts its own
    answer about totality is the one failure SAFETY.md rule 5 names.

    Returns the signed umbral radius at the limb, or None if the cone misses.
    """
    x, y, d, mu, l1, l2 = evaluate(B, t_h)
    r1 = np.sqrt(1.0 - E2 * np.cos(d) ** 2)
    r = np.hypot(x, y / r1)                  # distance from the axis to the centre
    if r <= 1.0:
        return None                          # the axis itself lands: not this case
    return l2 if (r - 1.0) < abs(l2) else None   # zeta is ~0 on the limb


def classify(B, t_g_h):
    """total / annular / hybrid / partial, from the sign of the umbral radius.

    Reads the radius on the ground where the axis lands, and at the limb where
    it does not. `hybrid` means the sign changes along the track, which is what
    distinguishes a hybrid eclipse from a total one with a long path.
    """
    l2p = []
    for h in np.linspace(t_g_h - 3.0, t_g_h + 3.0, 241):
        ap = axis_point(B, h)
        v = ap[3] if ap is not None else grazes(B, h)
        if v is not None:
            l2p.append(v)
    if not l2p:
        return 'partial'
    neg, pos = any(v < 0 for v in l2p), any(v > 0 for v in l2p)
    return 'hybrid' if neg and pos else ('total' if neg else 'annular')


def catalogue(y0, y1):
    rows = []
    for t_g, gamma in find_eclipses(y0, y1):
        t0 = ts.tt_jd(np.round(t_g.tt * 24.0) / 24.0)     # nearest whole hour TT
        B = elements(t0)
        t_g_h = (t_g.tt - t0.tt) * 24.0
        kind = classify(B, t_g_h)
        ap = axis_point(B, t_g_h)
        x, y, d, mu, l1, l2 = evaluate(B, t_g_h)
        mag = None
        if ap is not None:
            l1p = l1 - ap[2] * B['tan_f1']
            l2p = l2 - ap[2] * B['tan_f2']
            # Magnitude is piecewise: a fraction of the covered diameter while
            # the phase is partial, the ratio of diameters once the discs are
            # nested. geometry.magnitude() already draws that line.
            mag = round(float(G.magnitude(0.0, (l1p + l2p) / 2.0, (l1p - l2p) / 2.0)[0]), 4)
        rows.append({'id': t_g.utc_strftime('%Y-%m-%d'), 'type': kind,
                     'central': ap is not None,
                     'greatest_UT': t_g.utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
                     'gamma': round(gamma, 4),
                     'central_lat': None if ap is None else round(ap[0], 3),
                     'central_lon': None if ap is None else round(ap[1], 3),
                     'magnitude': mag,
                     'greatest_h': round(t_g_h, 6), 'elements': B})
    return rows


def local_circumstances(B, lat_deg, lon_deg, elev_m=0.0, span=4.0, n=11521):
    """Contacts, magnitude, obscuration and duration for one observer.

    This is the function the web front end reproduces in JavaScript, so it is
    written to be portable: a grid scan for sign changes, then bisection. No
    site constant and no ephemeris enter here -- only the elements.

    Longitudes are EAST-positive, which is the convention of the rest of the
    project. Meeus tabulates them west-positive; mixing the two silently
    mirrors every path about the Greenwich meridian.
    """
    lat, lon = np.radians(lat_deg), np.radians(lon_deg)
    Nn = 1.0 / np.sqrt(1.0 - E2 * np.sin(lat) ** 2)
    a_er = elev_m / 1000.0 / S.R_EARTH_KM
    rc = (Nn + a_er) * np.cos(lat)
    rs_ = (Nn * (1.0 - E2) + a_er) * np.sin(lat)
    dmu = np.radians(1.002738 * B['delta_t_s'] * 15.0 / 3600.0)

    def geom(t_h):
        x, y, d, mu, l1, l2 = evaluate(B, t_h)
        H = mu + lon - dmu
        xi = rc * np.sin(H)
        eta = rs_ * np.cos(d) - rc * np.cos(H) * np.sin(d)
        zeta = rs_ * np.sin(d) + rc * np.cos(H) * np.cos(d)
        m = np.hypot(x - xi, y - eta)
        return (m, l1 - zeta * B['tan_f1'], l2 - zeta * B['tan_f2'], d, H)

    def mag_at(t_h):
        m, L1p, L2p, _, _ = geom(t_h)
        return (L1p - m) / (L1p + L2p)

    def alt_az(t_h):
        _, _, _, d, H = geom(t_h)
        alt = np.arcsin(np.sin(lat) * np.sin(d) + np.cos(lat) * np.cos(d) * np.cos(H))
        az = np.arctan2(-np.cos(d) * np.sin(H),
                        np.sin(d) * np.cos(lat) - np.cos(d) * np.sin(lat) * np.cos(H))
        return np.degrees(alt), np.degrees(az) % 360.0

    grid = np.linspace(-span, span, n)
    m, L1p, L2p, _, _ = geom(grid)
    if (m - L1p).min() >= 0.0:
        return None                                   # no eclipse at all here
    t_max = float(grid[np.argmax((L1p - m) / (L1p + L2p))])
    r = minimize_scalar(lambda h: -mag_at(h), bracket=None,
                        bounds=(t_max - 0.01, t_max + 0.01), method='bounded',
                        options={'xatol': 1e-10})
    t_max = float(r.x)

    def roots(f):
        v = f(grid)
        return [float(brentq(lambda h: float(f(h)), grid[i], grid[i + 1], xtol=1e-11))
                for i in np.where(np.diff(np.sign(v)) != 0)[0]]

    # Contacts are named by which way the function crosses zero, not by the
    # order the roots came out. Taking the first root as C1 and the last as C4
    # assumes both are inside the window; when only one is, it labels a last
    # contact as a first one, and everything downstream that scans from C1
    # onwards then finds an empty interval and reports no eclipse at all.
    def split(f, rr):
        eps = 1e-6
        ent = [r for r in rr if f(r + eps) < 0.0]     # + -> -, the Sun starts being covered
        lea = [r for r in rr if f(r + eps) > 0.0]     # - -> +, it stops
        return ent, lea

    # The inner contact is |m| = |L2'|, and the absolute value is not cosmetic.
    # L2' is negative inside an umbra and POSITIVE inside an antumbra, so the
    # form m + L2' = 0 that Meeus writes for a total eclipse has no root at all
    # for an annular one: every annular eclipse would silently report zero
    # seconds of annularity while still reporting the right magnitude.
    f_out = lambda h: geom(h)[0] - geom(h)[1]
    f_inn = lambda h: geom(h)[0] - np.abs(geom(h)[2])
    outer, inner = roots(f_out), roots(f_inn)
    mm, LL1, LL2, _, _ = geom(t_max)
    r_sun, r_moon = (LL1 + LL2) / 2.0, (LL1 - LL2) / 2.0
    obsc = float(G.obscuration(mm, r_sun, r_moon)[0])

    def stamp(t_h):
        alt, az = alt_az(t_h)
        return {'t_h': round(t_h, 8),
                'ut': ts.tt_jd(B['t0_TT_jd'] + t_h / 24.0).utc_strftime('%Y-%m-%dT%H:%M:%SZ'),
                'sun_alt_deg': round(float(alt), 4), 'sun_az_deg': round(float(az), 3)}

    out = {'magnitude': round(float(G.magnitude(mm, r_sun, r_moon)[0]), 6),
           'obscuration': round(obsc, 6),
           'MAX': stamp(t_max), 'duration_s': 0.0}
    for (c_in, c_out), f, rr in ((('C1', 'C4'), f_out, outer), (('C2', 'C3'), f_inn, inner)):
        ent, lea = split(f, rr)
        before = [r for r in ent if r <= t_max]
        after = [r for r in lea if r >= t_max]
        if before:
            out[c_in] = stamp(max(before))
        if after:
            out[c_out] = stamp(min(after))
    if 'C2' in out and 'C3' in out:
        out['duration_s'] = round((out['C3']['t_h'] - out['C2']['t_h']) * 3600.0, 3)
    return out


def main():
    import os
    rows = catalogue(2026, 2050)
    out = ROOT + '/web/data/eclipses.json'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({'source': 'JPL DE440s via Skyfield, elements fitted by src/eclipsecat.py',
               'r_sun_km': S.R_SUN_KM, 'k1_penumbra': K1, 'k2_umbra': K2,
               'mu_convention': 'ephemeris hour angle; subtract 1.002738*delta_t_s*15/3600 deg for universal',
               'eclipses': rows}, open(out, 'w'), indent=1)
    print(f'{len(rows)} eclipses -> {out}')
    for r in rows[:6]:
        print(' ', r['id'], r['type'], 'gamma', r['gamma'])


def _selftest():
    """Four failure modes, each of which would be invisible in a pretty map.

    The map is the dangerous part of this module: a shadow path drawn 50 km off
    still looks like a shadow path, and it would put someone outside the band
    while telling him he is inside it.
    """
    LIT = json.load(open(ROOT + '/data/literature.json'))
    N = LIT['nasa_besselian_2026aug12']
    t0 = ts.tt(2026, 8, 12, 18, 0, 0)
    B = elements(t0)

    # 1. Elements against NASA's published set. The tolerances are fixed by the
    #    two declared convention differences, not by the quality of the fit:
    #    the solar-radius choice moves l1/l2 by 1.1e-4 and delta_t moves mu by
    #    0.0096 deg. Anything larger is a real error.
    for k, tol in (('x', 1e-4), ('y', 1e-4), ('d_deg', 1e-4), ('l1', 2e-4), ('l2', 2e-4)):
        e = abs(B[k][0] - N[k][0])
        assert e < tol, f'{k}[0] off by {e:.2e}, tol {tol:.0e}'
    assert abs(B['mu_deg'][0] - N['mu_deg'][0]) < 0.02
    assert abs(B['mu_deg'][1] - N['mu_deg'][1]) < 1e-4

    # 2. The polynomial has to hold between its fit nodes, not only on them.
    for h in (-2.71, -1.13, 0.37, 2.49):
        rx, ry, rd = raw(ts.tt_jd(t0.tt + h / 24.0))[:3]
        px, py, pd, _, _, _ = evaluate(B, h)
        assert abs(px - rx) < 2e-6 and abs(py - ry) < 2e-6, f'x/y fit residual at {h} h'
        assert abs(np.degrees(pd) - rd) < 1e-6, f'd fit residual at {h} h'

    # 3. Local circumstances at the study site against the project's own DE440s
    #    solver in geometry.py. This is the end-to-end check: it exercises the
    #    elements, the observer transformation, the contact root-finder and the
    #    obscuration together, and it is independent of NASA.
    CIRC = json.load(open(ROOT + '/data/circumstances.json'))
    loc = local_circumstances(B, S.LAT_DEG, S.LON_DEG, S.ELEV_M)
    assert loc is not None
    for c in ('C1', 'C2', 'C3', 'C4', 'MAX'):
        want = (CIRC['contacts'][c]['tt_jd'] - t0.tt) * 24.0
        got = loc[c]['t_h']
        assert abs(got - want) * 3600.0 < 1.5, f'{c} off by {(got-want)*3600:.2f} s'
    dur = CIRC['contacts']['C3']['tt_jd'] - CIRC['contacts']['C2']['tt_jd']
    assert abs(loc['duration_s'] - dur * 86400.0) < 1.0, loc['duration_s']
    assert abs(loc['MAX']['sun_alt_deg'] - CIRC['contacts']['MAX']['sun_alt_geometric_deg']) < 0.02
    assert abs(loc['obscuration'] - 1.0) < 1e-9
    assert abs(loc['magnitude'] - CIRC['contacts']['MAX']['magnitude']) < 2e-3, loc['magnitude']

    # 4. The axis intersection against NASA's published central line
    #    (SE2026Aug12Tpath), evaluated with NASA's own delta_t so the test
    #    measures geometry rather than a difference of two predictions of
    #    Earth rotation. The residual left is the lunar theory: NASA's elements
    #    come from ELP2000-85, these from DE440s.
    Bn = dict(B, delta_t_s=N['delta_t_s'])
    for ut_h, la, lo in ((18 + 26 / 60, 44.7133, -8.3983),
                         (18 + 28 / 60, 43.3717, -6.1883),
                         (18 + 30 / 60, 41.8167, -3.1850)):
        ap = axis_point(Bn, ut_h - 18.0 + N['delta_t_s'] / 3600.0)
        assert ap is not None
        dkm = np.hypot((ap[0] - la) * 111.2, (ap[1] - lo) * 111.2 * np.cos(np.radians(la)))
        assert dkm < 3.0, f'central line off by {dkm:.2f} km at {ut_h:.3f} UT'
        assert ap[3] < 0.0, 'a total eclipse has a negative umbral radius on the ground'

    # 5. A point far outside the penumbra must return nothing, not a small
    #    magnitude. Sydney sees no part of this eclipse.
    assert local_circumstances(B, -33.87, 151.21, 0.0) is None

    # 6. The catalogue must find both 2026 eclipses and type them correctly.
    rows = catalogue(2026, 2026)
    got = {r['id']: r['type'] for r in rows}
    assert got == {'2026-02-17': 'annular', '2026-08-12': 'total'}, got
    print('eclipsecat selftest OK')


if __name__ == '__main__':
    import sys
    _selftest() if '--selftest' in sys.argv else main()
