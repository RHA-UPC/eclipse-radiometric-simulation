/*
 * eclipse-radiometric-simulation — terrain horizon
 * Copyright (C) 2026 Ricardo Heredia Alessandrello
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Whether an eclipse can be seen from a place is not only a question of
 * geometry. Every other number on this page assumes sea level and an
 * astronomical horizon, and near sunrise or sunset that assumption is the
 * dominant error: a Sun at 3 degrees is behind the ridge, and the page used to
 * say it was up.
 *
 * So this module builds the real horizon: the elevation of the skyline as seen
 * from the marked point, azimuth by azimuth, from a public elevation model.
 * Two things fall out of it. The observer's own elevation, which the eclipse
 * geometry takes as a parameter and was being given as zero. And the terrain
 * horizon, which decides whether the Sun is actually in view at each contact.
 *
 * It runs in the browser. The only thing that leaves the machine is a request
 * for the elevation tiles that cover the area, which pins the visitor to a
 * tile some tens of kilometres across; nothing is computed anywhere else and
 * no coordinate is sent as a coordinate. That is still more than the rest of
 * this page does, which is why it happens on request and never on its own.
 */
const Terrain = (() => {
  'use strict';

  // Terrarium tiles: elevation in metres packed into RGB, from the Mapzen /
  // Amazon open elevation build (SRTM, ASTER, NED, EU-DEM, and others). Public
  // and keyless. The unpacking below is their documented format.
  const TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
  const CREDIT = 'Mapzen / Amazon — SRTM, ASTER, NED, EU-DEM, GMTED, ETOPO1';

  // Curvature plus standard refraction. Light bends towards the ground, so a
  // distant ridge looks higher than plain geometry says; the classical
  // surveyor's dodge is to inflate the Earth's radius by 1/(1-k) with k = 0.13
  // and then treat the ray as straight. It is a mean value: near the ground at
  // sunset the real k swings enough to move a far skyline by a few arcminutes,
  // and that is the honest error bar on everything below.
  const R_EFF = 6371008.8 / (1 - 0.13);
  const D2R = Math.PI / 180;

  const tiles = new Map();
  let footprint = 0;                     // bytes fetched this session

  const load = (z, x, y) => {
    const key = z + '/' + x + '/' + y;
    let hit = tiles.get(key);
    if (hit) return hit;
    hit = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 256;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, 256, 256).data;
        const out = new Float32Array(256 * 256);
        for (let i = 0, j = 0; i < out.length; i++, j += 4)
          out[i] = px[j] * 256 + px[j + 1] + px[j + 2] / 256 - 32768;
        footprint += 256 * 256 * 4;
        resolve(out);
      };
      img.onerror = () => resolve(null);
      img.src = `${TILES}/${z}/${x}/${y}.png`;
    });
    tiles.set(key, hit);
    return hit;
  };

  const xOf = (lon, n) => (lon + 180) / 360 * n;
  const yOf = (lat, n) => {
    const s = Math.sin(Math.max(-85, Math.min(85, lat)) * D2R);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  };

  // One zoom level, chosen so that three tiles across cover the radius asked
  // for. Mercator tiles shrink with the cosine of the latitude, so a fixed
  // zoom would fetch nine tiles at the equator and thirty-six in Lapland.
  function zoomFor(lat, radiusM) {
    // One tile at least as wide as the radius, which makes the fetch a three
    // by three block whatever the latitude: nine tiles, about 1.3 MB. Asking
    // for a tile half that size doubles the resolution and quadruples the
    // download, and the skyline is a ridge line, not a texture.
    const want = radiusM;
    const z = Math.floor(Math.log2(40075016.7 * Math.cos(lat * D2R) / want));
    return Math.max(7, Math.min(12, z));
  }

  // Elevation sampler over a rectangle of tiles, bilinear between posts.
  // Missing tiles read as sea level rather than as a hole: an ocean tile that
  // failed to load and an ocean tile that loaded look the same from here, and
  // a hole would show up as a notch in the skyline that is not there.
  async function sampler(lat, lon, radiusM) {
    const z = zoomFor(lat, radiusM), n = 2 ** z;
    const mPerPx = 40075016.7 * Math.cos(lat * D2R) / (n * 256);
    const rx = radiusM / (mPerPx * 256), cx = xOf(lon, n), cy = yOf(lat, n);
    // The vertical extent in tile units is not the same as the horizontal one
    // away from the equator: Mercator stretches y, so the same ground distance
    // is fewer tiles north-south than the naive radius suggests. It is within
    // a few per cent over one tile, and erring wide only costs a fetch.
    const x0 = Math.floor(cx - rx), x1 = Math.floor(cx + rx);
    const y0 = Math.floor(cy - rx), y1 = Math.floor(cy + rx);
    const grid = new Map();
    const jobs = [];
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        if (y >= 0 && y < n)
          jobs.push(load(z, ((x % n) + n) % n, y).then(d => grid.set(x + ',' + y, d)));
    await Promise.all(jobs);

    const at = (la, lo) => {
      const fx = xOf(lo, n) * 256, fy = yOf(la, n) * 256;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const dx = fx - ix, dy = fy - iy;
      const px = (X, Y) => {
        const tx = Math.floor(X / 256), ty = Math.floor(Y / 256);
        const d = grid.get(tx + ',' + ty);
        return d ? d[(Y - ty * 256) * 256 + (X - tx * 256)] : 0;
      };
      return px(ix, iy) * (1 - dx) * (1 - dy) + px(ix + 1, iy) * dx * (1 - dy)
           + px(ix, iy + 1) * (1 - dx) * dy + px(ix + 1, iy + 1) * dx * dy;
    };
    return { at, z, mPerPx, tiles: jobs.length };
  }

  // Walk one azimuth outwards and keep the highest apparent elevation angle.
  // The step is the ground resolution of the model, because a finer step only
  // resamples the same posts and a coarser one steps over ridges.
  function ridge(sam, lat, lon, h0, az, radiusM) {
    const step = Math.max(60, sam.mPerPx);
    const s = Math.sin(az * D2R), c = Math.cos(az * D2R);
    const mPerDegLat = 111132.9, mPerDegLon = 111319.5 * Math.cos(lat * D2R);
    // Starts below anything, not at zero. From a summit the skyline is BELOW
    // the horizontal -- the dip of the horizon -- and clamping at zero would
    // throw that away and call a Sun at -1 degree hidden when it is in plain
    // view. The dip this can report is capped by the search radius: on flat
    // ground at 1000 m the true dip is 1.03 degrees at 121 km, and 40 km of
    // model gives 1.59. Which is why the radius is stated with the answer.
    let best = -90, at = 0;
    for (let d = step; d <= radiusM; d += step) {
      const la = lat + c * d / mPerDegLat;
      const lo = lon + s * d / Math.max(1e-6, mPerDegLon);
      const ang = Math.atan2(sam.at(la, lo) - h0 - d * d / (2 * R_EFF), d) / D2R;
      if (ang > best) { best = ang; at = d; }
    }
    return { alt: best, distM: at };
  }

  /* The skyline over a range of azimuths, plus the observer's own elevation.
     Returns degrees of altitude on a fixed azimuth step; negative where the
     ground falls away, which is the dip of the horizon and is real. */
  async function horizon(lat, lon, opts) {
    opts = opts || {};
    const radiusM = (opts.radiusKm || 25) * 1000;
    const step = opts.stepDeg || 1;
    const sam = await sampler(lat, lon, radiusM);
    const h0 = sam.at(lat, lon) + (opts.eyeM || 0);
    const from = opts.azFrom === undefined ? 0 : opts.azFrom;
    const to = opts.azTo === undefined ? 360 : opts.azTo;
    const prof = [];
    for (let a = from; a <= to + 1e-9; a += step)
      prof.push(Object.assign({ az: ((a % 360) + 360) % 360 },
                              ridge(sam, lat, lon, h0, a, radiusM)));
    prof.forEach(p => { if (p.alt < -89) { p.alt = 0; p.distM = 0; } });
    return { elevM: sam.at(lat, lon), h0, prof, step, from, to,
             radiusKm: radiusM / 1000, zoom: sam.z, mPerPx: sam.mPerPx,
             tiles: sam.tiles, credit: CREDIT };
  }

  // The skyline at one azimuth, by linear interpolation of the profile. The
  // profile is sampled every degree and a ridge line is smooth at that scale,
  // so interpolating is closer than picking the nearest sample.
  function altAt(hz, az) {
    if (!hz || !hz.prof.length) return 0;
    const a = ((az - hz.from) % 360 + 360) % 360 / hz.step;
    const i = Math.floor(a);
    if (i < 0 || i >= hz.prof.length - 1) return hz.prof[Math.min(hz.prof.length - 1,
                                                                 Math.max(0, Math.round(a)))].alt;
    const f = a - i;
    return hz.prof[i].alt * (1 - f) + hz.prof[i + 1].alt * f;
  }

  /* Buildings, where anyone has bothered to say how tall they are.
   *
   * OpenStreetMap carries `height` in metres or `building:levels`, and the
   * coverage is the whole story: measured in August 2026, of the buildings
   * within 400 m, Manhattan declared a height for 82 % of them, Zaragoza for
   * 0.2 % (20 % gave levels), Nairobi for 3 %. So this can answer the question
   * where the data happens to exist and cannot answer it anywhere else, and
   * the only decent thing to do is say which of the two happened. Levels are
   * converted at 3 m each, which is a guess and is labelled as one.
   *
   * It goes out to a shared public endpoint, so it is asked for explicitly and
   * never as part of anything else.
   */
  async function buildings(lat, lon, radiusM) {
    radiusM = radiusM || 400;
    const q = `[out:json][timeout:25];way["building"](around:${radiusM},${lat},${lon});out geom;`;
    const r = await fetch('https://overpass-api.de/api/interpreter',
                          { method: 'POST', body: q });
    if (!r.ok) throw new Error('overpass ' + r.status);
    const d = await r.json();
    const out = [];
    let total = 0, guessed = 0;
    let withHeight = 0;
    for (const w of d.elements || []) {
      total++;
      const t = w.tags || {};
      let h = parseFloat(t.height);
      let guess = false;
      if (!(h > 0)) {
        const lv = parseFloat(t['building:levels']);
        if (lv > 0) { h = lv * 3 + 1; guess = true; }
      }
      if (!(h > 0) || !w.geometry) continue;
      if (guess) guessed++;
      withHeight++;
      // Wall by wall, not corner by corner. A block seen broadside covers the
      // whole slice of sky between its two ends, and marking only the corners
      // leaves the middle of the wall as a hole to see the Sun through.
      const g = w.geometry;
      for (let i = 0; i + 1 < g.length; i++) {
        const seg = [g[i], g[i + 1]].map(q => {
          const dy = (q.lat - lat) * 111132.9;
          const dx = (q.lon - lon) * 111319.5 * Math.cos(lat * D2R);
          return { az: (Math.atan2(dx, dy) / D2R + 360) % 360, dist: Math.hypot(dx, dy) };
        });
        const dist = Math.max(3, Math.min(seg[0].dist, seg[1].dist));
        out.push({ az0: seg[0].az, az1: seg[1].az, distM: dist, heightM: h, guess,
                   alt: Math.atan2(h - (dist * dist) / (2 * R_EFF), dist) / D2R });
      }
    }
    return { walls: out, total, withHeight, guessed };
  }

  // Fold the buildings into a skyline, taking whichever is higher at each
  // azimuth. A footprint vertex covers a slice of sky, not a line, so each one
  // is spread over the angular width it really subtends.
  function withBuildings(hz, b) {
    if (!b || !b.walls.length) return hz;
    const prof = hz.prof.map(p => Object.assign({}, p));
    for (const q of b.walls) {
      // The wall spans from one end's azimuth to the other's, the short way
      // round; a margin of one profile step keeps a wall that is thinner than
      // the sampling from falling between two samples.
      const mid = q.az0 + (((q.az1 - q.az0 + 540) % 360) - 180) / 2;
      const half = Math.abs((((q.az1 - q.az0 + 540) % 360) - 180)) / 2 + hz.step;
      for (const p of prof) {
        const da = Math.abs(((p.az - mid + 540) % 360) - 180);
        if (da <= half && q.alt > p.alt) {
          p.alt = q.alt; p.distM = q.distM; p.building = true;
        }
      }
    }
    return Object.assign({}, hz, { prof, buildings: b });
  }

  return { horizon, altAt, buildings, withBuildings, zoomFor,
           credit: CREDIT, bytes: () => footprint };
})();

if (typeof module !== 'undefined') module.exports = Terrain;
