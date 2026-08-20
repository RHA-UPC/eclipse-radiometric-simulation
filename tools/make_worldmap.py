#!/usr/bin/env python3
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

"""Build web/data/world.json from Natural Earth 1:10 m admin-0 countries.

The web falls back to this outline when the street basemap cannot be reached.
Natural Earth's 1:110 m file, which the fallback used before, is 177 countries
and 10 654 vertices: at country zoom its coastlines are visibly straight lines
and most islands do not exist at all. The 1:10 m file has the detail but is
13 MB, too much to send to somebody whose connection has just failed.

So it gets simplified here, once, and the result is versioned: Douglas-Peucker
at a declared tolerance, rings below a minimum area dropped, coordinates
quantised to thousandths of a degree and delta-encoded along each ring, every
property dropped. No new dependency for sixty lines of geometry. `loadWorld`
in web/js/app.js decodes it back into GeoJSON in eight lines, so what Leaflet
renders is identical to what it rendered before.

The default tolerance is not a matter of taste. Leaflet renders this as SVG
paths, and the cost grows with the vertex count: measured in headless Chromium,
a zoom takes about the same time at 22 000 and at 34 000 vertices and clearly
longer at 54 000. The default sits at that knee. The canvas renderer would lift
the ceiling a long way, and it is NOT used: it crashes the renderer process in
that browser even with the old 10 000-vertex file, and shipping a fallback that
kills the tab is worse than shipping a coarse one.

Raise the tolerance argument for a lighter file, lower it for more coastline.

Usage:
    python tools/make_worldmap.py [tolerance_deg] [min_ring_area_deg2]

Source (downloaded, not versioned):
    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/
    geojson/ne_10m_admin_0_countries.geojson
Natural Earth is public domain; see THIRD-PARTY-DATA.md.
"""
import json
import math
import os
import sys
import urllib.request

URL = ('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/'
       'master/geojson/ne_10m_admin_0_countries.geojson')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + '/web/data/world.json'


def douglas_peucker(pts, tol):
    """Iterative Douglas-Peucker. Iterative, not recursive: a coastline ring can
    be 30 000 points deep and Python's stack is 1000 frames."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        x1, y1 = pts[a]
        x2, y2 = pts[b]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            x0, y0 = pts[i]
            d = (abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / n if n
                 else math.hypot(x0 - x1, y0 - y1))
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def _area(r):
    """Shoelace area in square degrees. Only used to compare rings against a
    threshold, so the fact that a degree is not a constant distance is fine."""
    a = 0.0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return abs(a) / 2.0


def _ring(r, tol, min_area, nd):
    if _area(r) < min_area:
        return None                       # an islet or a pond, below the map's own resolution
    out = douglas_peucker(r, tol)
    if len(out) < 4:
        return None                       # collapsed to a sliver: drop it
    out = [[round(x, nd), round(y, nd)] for x, y in out]
    if out[0] != out[-1]:
        out.append(out[0])
    return out if len(out) >= 4 else None


def _poly(p, tol, min_area, nd):
    rs = [r for r in (_ring(r, tol, min_area, nd) for r in p) if r]
    return rs or None


def encode(feats, scale):
    """Rings as flat integer deltas, which is where the file size actually is.

    A coastline vertex written as GeoJSON costs about twenty characters of
    decimal, most of them a float64 tail that means nothing next to a
    simplification tolerance of eight kilometres and that gzip cannot compress
    because it is noise. Written as thousandths of a degree and then
    differenced along the ring, the same vertex costs three or four characters,
    because consecutive points of a coastline are close together.

    The first pair of each ring is absolute and the rest are deltas; the
    closing vertex is implied. Nothing else is kept -- no country name, no
    property -- because nothing reads them: the layer is drawn with a
    pre-evaluated style, is not interactive and has no popups.

    One entry per COUNTRY, not per polygon, and that grouping is not cosmetic:
    Leaflet emits one SVG path per feature, so flattening the multipolygons
    turned 221 paths into 1485 and a pair of zooms from 30 ms into seven
    seconds. The file is the same size either way.

    Measured against the GeoJSON it replaces: 659 kB to 287 kB raw, 240 kB to
    117 kB gzipped, with the same 221 features, 1476 rings and 33 894 vertices,
    and a worst coordinate deviation of 56 m.
    """
    out = []
    for f in feats:
        cs = f['geometry']['coordinates']
        polys = []
        for poly in ([cs] if f['geometry']['type'] == 'Polygon' else cs):
            rings = []
            for r in poly:
                pts = r[:-1] if len(r) > 1 and r[0] == r[-1] else r
                flat, px, py = [], 0, 0
                for i, (x, y) in enumerate(pts):
                    ix, iy = round(x * scale), round(y * scale)
                    flat += [ix, iy] if i == 0 else [ix - px, iy - py]
                    px, py = ix, iy
                if len(flat) >= 6:
                    rings.append(flat)
            if rings:
                polys.append(rings)
        if polys:
            out.append(polys)
    return {'scale': scale, 'feats': out}


def build(tol=0.08, min_area=0.004, nd=4):
    print(f'descargando Natural Earth 1:10 m ...')
    raw = json.loads(urllib.request.urlopen(URL, timeout=180).read())
    feats = []
    for f in raw['features']:
        g, t = f['geometry'], f['geometry']['type']
        if t == 'Polygon':
            c = _poly(g['coordinates'], tol, min_area, nd)
        else:
            c = [q for q in (_poly(p, tol, min_area, nd) for p in g['coordinates']) if q] or None
        if not c:
            continue
        pr = f['properties']
        feats.append({'type': 'Feature',
                      'properties': {'name': pr.get('NAME') or pr.get('name') or ''},
                      'geometry': {'type': t, 'coordinates': c}})
    json.dump(encode(feats, 1000), open(OUT, 'w'), separators=(',', ':'))

    rings = sum(len(p) if f['geometry']['type'] == 'Polygon' else sum(len(q) for q in p)
                for f in feats for p in [f['geometry']['coordinates']])
    verts = 0
    for f in feats:
        cs = f['geometry']['coordinates']
        for p in ([cs] if f['geometry']['type'] == 'Polygon' else cs):
            for r in p:
                verts += len(r)
    print(f'{len(feats)} countries, {rings} rings, {verts} vertices, '
          f'tolerancia {tol} grados, area minima {min_area} -> {OUT} '
          f'({os.path.getsize(OUT) / 1e6:.2f} MB)')


if __name__ == '__main__':
    build(float(sys.argv[1]) if len(sys.argv) > 1 else 0.08,
          float(sys.argv[2]) if len(sys.argv) > 2 else 0.004)
