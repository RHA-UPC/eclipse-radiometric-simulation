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

"""Chance of catching a Perseid inside the frame during totality.

The eclipse falls on the night of the Perseid maximum, and 2026-08-12 is New
Moon by construction (a solar eclipse only happens at New Moon), so the sky is
as dark as it ever gets for this shower. During the ~74 s of totality the sky
darkens to roughly twilight levels, so a meteor in the frame is physically
possible. The question is only how likely.

Everything here is either computed from the ephemeris or quoted from the IMO
Meteor Shower Calendar 2026; the rate model is stated explicitly and its
assumptions are listed rather than buried, because the honest answer involves
a factor-of-several uncertainty and it would be easy to dress that up.
"""
import json
import numpy as np
import pandas as pd
from skyfield.api import Star

import siteconf as S
import geometry as G
from siteconf import ROOT

LIT = json.load(open(ROOT+'/data/literature.json'))
CIRC = json.load(open(ROOT+'/data/circumstances.json'))
HW = json.load(open(ROOT+'/data/hardware.json'))

PER = LIT['imo_2026_perseids']


def radiant_on(date_aug):
    """Radiant alpha, delta (J2000, degrees) interpolated from IMO Table 6."""
    tbl = PER['radiant_drift_table_6']
    d = np.array([r[0] for r in tbl], float)
    a = np.array([r[1] for r in tbl], float)
    de = np.array([r[2] for r in tbl], float)
    return float(np.interp(date_aug, d, a)), float(np.interp(date_aug, d, de))


def solar_longitude(t):
    """Geocentric solar longitude referred to the J2000.0 equinox, degrees.

    Meteor work quotes lambda_sun for equinox J2000.0, not of date; the two
    differ by 0.37 deg in 2026, which is 9 hours of shower clock and would
    misplace totality relative to the Perseid node. Verified against the IMO
    calendar's own anchor: the calendar puts the maximum at 2026 Aug 13,
    02h-04h UT with lambda_sun = 140.0-140.1, and the J2000 frame reproduces
    140.004-140.086 for exactly those two instants, while the of-date frame
    gives 140.42 and would not.
    """
    from skyfield.framelib import ecliptic_J2000_frame
    e = G.earth.at(t).observe(G.sun).apparent()
    lat, lon, dist = e.frame_latlon(ecliptic_J2000_frame)
    return lon.degrees % 360.0


def radiant_altitude(t, ra_deg, dec_deg):
    star = Star(ra_hours=ra_deg / 15.0, dec_degrees=dec_deg)
    alt, az, _ = G.place.at(t).observe(star).apparent().altaz()
    return alt.degrees, az.degrees


def fov_deg(focal_mm, w_mm, h_mm):
    """Rectilinear field of view (degrees) and solid angle (sr)."""
    fw = 2.0 * np.degrees(np.arctan(w_mm / (2.0 * focal_mm)))
    fh = 2.0 * np.degrees(np.arctan(h_mm / (2.0 * focal_mm)))
    # Solid angle of a rectangular pyramid, exact.
    a = np.radians(fw / 2.0)
    b = np.radians(fh / 2.0)
    omega = 4.0 * np.arcsin(np.sin(a) * np.sin(b))
    return fw, fh, omega


def hourly_rate_whole_sky(zhr, radiant_alt_deg, lm=6.5, r=None):
    """IMO reduction inverted: HR = ZHR * sin(h_R) * r^-(6.5-lm).

    The IMO defines ZHR as the rate a single observer would see with the
    radiant in the zenith under a 6.5-magnitude sky and no obstruction, i.e.
    over the whole visible hemisphere. Inverting it gives the whole-sky rate
    for the actual radiant altitude and actual limiting magnitude.
    """
    r = PER['population_index_r'] if r is None else r
    return zhr * np.sin(np.radians(radiant_alt_deg)) * r ** (-(6.5 - lm))


def frame_rate(zhr, radiant_alt_deg, omega_sr, lm, sky_sr=2.0 * np.pi):
    """Meteors per second expected inside a frame of solid angle omega_sr.

    ASSUMPTION, stated plainly: meteors are taken to be uniformly distributed
    over the visible hemisphere. They are not -- the apparent surface density
    of a parallel stream varies with angular distance D from the radiant, being
    zero at the radiant and maximal 90 deg away -- so a frame pointed near the
    radiant sees fewer, and one pointed 90 deg away sees more, than this gives.
    The paper reports the uniform-sky number and the sin(D) modulation
    separately instead of folding an unsourced correction into a single figure.
    """
    hr = hourly_rate_whole_sky(zhr, radiant_alt_deg, lm)
    return hr / 3600.0 * (omega_sr / sky_sr)


def poisson_at_least_one(rate_per_s, duration_s):
    return 1.0 - np.exp(-np.asarray(rate_per_s, float) * duration_s)


def build():
    t_max = G.ts.tt_jd(CIRC['contacts']['MAX']['tt_jd'])
    t_c2 = G.ts.tt_jd(CIRC['contacts']['C2']['tt_jd'])
    t_c3 = G.ts.tt_jd(CIRC['contacts']['C3']['tt_jd'])
    ra, dec = radiant_on(12.0)
    alt_r, az_r = radiant_altitude(t_max, ra, dec)
    lam = solar_longitude(t_max)

    sensor = HW['cameras']['canon_eos_200d']
    w, h = sensor['width_mm'], sensor['height_mm']
    dur = CIRC['totality_duration_s']

    rows = []
    for f_mm in [16, 24, 35, 50, 100, 200, 300]:
        fw, fh, om = fov_deg(f_mm, w, h)
        for zhr in PER['zhr_scenarios']:
            for lm in PER['camera_limiting_magnitudes']:
                rt = frame_rate(zhr, alt_r, om, lm)
                rows.append({'focal_mm': f_mm, 'fov_w_deg': fw, 'fov_h_deg': fh,
                             'omega_sr': om,
                             'sky_fraction_pct': 100.0 * om / (2 * np.pi),
                             'zhr': zhr, 'limiting_mag': lm,
                             'rate_per_hour_in_frame': rt * 3600.0,
                             'P_at_least_one_totality_pct':
                                 100.0 * poisson_at_least_one(rt, dur)})
    df = pd.DataFrame(rows)
    meta = {'radiant_ra_deg': ra, 'radiant_dec_deg': dec,
            'radiant_alt_deg_at_max': alt_r, 'radiant_az_deg_at_max': az_r,
            'solar_longitude_deg_at_max': lam,
            'imo_max_solar_longitude': PER['max_solar_longitude_deg'],
            'totality_duration_s': dur,
            'sun_az_deg_at_max': CIRC['contacts']['MAX']['sun_az_deg'],
            'angular_distance_radiant_to_sun_deg': None}
    # Angular distance between the radiant and the eclipsed Sun: decides
    # whether a meteor could even appear in the same frame as the corona.
    alt_s = CIRC['contacts']['MAX']['sun_alt_refracted_deg']
    az_s = CIRC['contacts']['MAX']['sun_az_deg']
    v1 = np.array([np.cos(np.radians(alt_r)) * np.cos(np.radians(az_r)),
                   np.cos(np.radians(alt_r)) * np.sin(np.radians(az_r)),
                   np.sin(np.radians(alt_r))])
    v2 = np.array([np.cos(np.radians(alt_s)) * np.cos(np.radians(az_s)),
                   np.cos(np.radians(alt_s)) * np.sin(np.radians(az_s)),
                   np.sin(np.radians(alt_s))])
    meta['angular_distance_radiant_to_sun_deg'] = float(
        np.degrees(np.arccos(np.clip(v1 @ v2, -1, 1))))
    return df, meta


def _selftest():
    # Solid angle of a rectangular FOV must approach w*h/f^2 for small fields
    # and stay below 2 pi for any field.
    w, h = 22.3, 14.9
    fw, fh, om = fov_deg(300.0, w, h)
    approx = (w / 300.0) * (h / 300.0)
    assert abs(om / approx - 1.0) < 1e-3, (om, approx)
    for f in (4.0, 8.0, 16.0, 300.0):
        assert 0 < fov_deg(f, w, h)[2] < 2 * np.pi
    # Poisson sanity
    assert abs(poisson_at_least_one(1.0, 0.0)) < 1e-15
    assert abs(poisson_at_least_one(1e9, 1.0) - 1.0) < 1e-12
    assert abs(poisson_at_least_one(0.01, 100.0) - (1 - np.exp(-1))) < 1e-12
    # Rate scales linearly in ZHR and in solid angle
    assert abs(frame_rate(200, 50, 0.01, 6.5) / frame_rate(100, 50, 0.01, 6.5) - 2) < 1e-12
    assert abs(frame_rate(100, 50, 0.02, 6.5) / frame_rate(100, 50, 0.01, 6.5) - 2) < 1e-12
    # A brighter limiting magnitude must give FEWER meteors (r > 1).
    assert hourly_rate_whole_sky(100, 50, lm=3.0) < hourly_rate_whole_sky(100, 50, lm=6.5)
    print('perseids selftest OK')


if __name__ == '__main__':
    _selftest()
    df, meta = build()
    df.to_csv(ROOT+'/data/perseids.csv', index=False)
    with open(ROOT+'/data/perseids_meta.json', 'w') as fh:
        json.dump(meta, fh, indent=2)
    print(json.dumps(meta, indent=2))
    print(df[(df.limiting_mag == 3.0)].pivot_table(
        index='focal_mm', columns='zhr',
        values='P_at_least_one_totality_pct').round(3).to_string())
