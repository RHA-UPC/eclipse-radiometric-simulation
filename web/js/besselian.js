// eclipse-radiometric-simulation
// Copyright (C) 2026 Ricardo Heredia Alessandrello
// SPDX-License-Identifier: AGPL-3.0-only
//
// Besselian shadow geometry in the browser. This is a port of
// src/eclipsecat.py, which is where the elements come from and where the
// checks live; keep the two in step. Everything below is a pure function of
// the elements, so no ephemeris and no network call is involved.
//
// Longitudes are EAST-positive throughout. Meeus tabulates them west-positive
// and mixing the conventions mirrors every path about Greenwich without
// producing anything that looks wrong.
'use strict';

const Bess = (() => {
  const F = 1 / 298.257223563, E2 = 2 * F - F * F, SQ = Math.sqrt(1 - E2);
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const poly = (c, t) => { let v = 0; for (let i = c.length - 1; i >= 0; i--) v = v * t + c[i]; return v; };
  const dpoly = (c, t) => { let v = 0; for (let i = c.length - 1; i >= 1; i--) v = v * t + i * c[i]; return v; };

  // Elements at t hours from t0 (TT). Angles come back in radians.
  function evaluate(B, t) {
    return {
      x: poly(B.x, t), y: poly(B.y, t),
      d: poly(B.d_deg, t) * D2R, mu: poly(B.mu_deg, t) * D2R,
      l1: poly(B.l1, t), l2: poly(B.l2, t),
      xd: dpoly(B.x, t), yd: dpoly(B.y, t)
    };
  }

  const dmuOf = B => 1.002738 * B.delta_t_s * 15 / 3600 * D2R;

  // Where a point (px, py) of the fundamental plane meets the ellipsoid.
  // The ellipsoid is mapped onto a unit sphere through the reduced latitude,
  // which turns the intersection into one square root instead of an iteration.
  function project(B, e, px, py) {
    const r1 = Math.sqrt(1 - E2 * Math.cos(e.d) ** 2);
    const sd1 = Math.sin(e.d) / r1, cd1 = SQ * Math.cos(e.d) / r1;
    const e1 = py / r1, q = 1 - px * px - e1 * e1;
    if (q <= 0) return null;                       // the point misses the Earth
    const c = Math.sqrt(q);
    const su = e1 * cd1 + c * sd1;
    if (Math.abs(su) >= 1) return null;
    const cu = Math.sqrt(1 - su * su);
    const H = Math.atan2(px, c * cd1 - e1 * sd1);
    const lat = Math.atan2(su, SQ * cu) * R2D;
    let lon = (H - e.mu + dmuOf(B)) * R2D;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    const zeta = SQ * su * Math.sin(e.d) + cu * Math.cos(H) * Math.cos(e.d);
    return { lat, lon, zeta, H, cu };
  }

  const axisPoint = (B, t) => { const e = evaluate(B, t); return project(B, e, e.x, e.y); };

  // Exact circle-circle lens area, the same expression as geometry.py.
  function obscuration(sep, rs, rm) {
    if (sep >= rs + rm) return 0;
    if (sep <= Math.abs(rm - rs)) return rm >= rs ? 1 : (rm * rm) / (rs * rs);
    const a1 = rs * rs * Math.acos(Math.min(1, Math.max(-1, (sep * sep + rs * rs - rm * rm) / (2 * sep * rs))));
    const a2 = rm * rm * Math.acos(Math.min(1, Math.max(-1, (sep * sep + rm * rm - rs * rs) / (2 * sep * rm))));
    const a3 = 0.5 * Math.sqrt(Math.max(0, (-sep + rs + rm) * (sep + rs - rm) * (sep - rs + rm) * (sep + rs + rm)));
    return (a1 + a2 - a3) / (Math.PI * rs * rs);
  }

  // Fraction of the solar DIAMETER covered while the phase is partial, ratio
  // of diameters once the discs nest. The two branches are what NASA tabulates.
  function magnitude(sep, rs, rm) {
    if (sep >= rs + rm) return 0;
    if (sep <= Math.abs(rm - rs)) return rm / rs;
    return (rs + rm - sep) / (2 * rs);
  }

  // Observer constants, computed once per site instead of once per time step.
  function observer(B, lat, lon, elev) {
    const p = lat * D2R, h = (elev || 0) / 1000 / 6378.1366;
    const N = 1 / Math.sqrt(1 - E2 * Math.sin(p) ** 2);
    return { p, lon: lon * D2R, rc: (N + h) * Math.cos(p), rs: (N * (1 - E2) + h) * Math.sin(p), dmu: dmuOf(B) };
  }

  function geom(B, o, t) {
    const e = evaluate(B, t);
    const H = e.mu + o.lon - o.dmu;
    const cH = Math.cos(H), sd = Math.sin(e.d), cd = Math.cos(e.d);
    const xi = o.rc * Math.sin(H);
    const eta = o.rs * cd - o.rc * cH * sd;
    const zeta = o.rs * sd + o.rc * cH * cd;
    const m = Math.hypot(e.x - xi, e.y - eta);
    return { m, zeta, L1: e.l1 - zeta * B.tan_f1, L2: e.l2 - zeta * B.tan_f2, d: e.d, H };
  }

  function altaz(o, g) {
    const alt = Math.asin(Math.sin(o.p) * Math.sin(g.d) + Math.cos(o.p) * Math.cos(g.d) * Math.cos(g.H));
    const az = Math.atan2(-Math.cos(g.d) * Math.sin(g.H),
      Math.sin(g.d) * Math.cos(o.p) - Math.cos(g.d) * Math.sin(o.p) * Math.cos(g.H));
    return { alt: alt * R2D, az: ((az * R2D) % 360 + 360) % 360 };
  }

  const utcOf = (B, t) => new Date((B.t0_TT_jd + t / 24 - B.delta_t_s / 86400 - 2440587.5) * 86400000);

  function bisect(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 60; i++) { const c = (a + b) / 2, fc = f(c); if ((fa < 0) === (fc < 0)) { a = c; fa = fc; } else b = c; }
    return (a + b) / 2;
  }

  // Contacts, magnitude, obscuration and duration for one observer. Returns
  // null when no part of the eclipse reaches the site: a very small magnitude
  // and "no eclipse here" must not be confusable.
  function local(B, lat, lon, elev, span = 4.0, n = 4000) {
    const o = observer(B, lat, lon, elev);
    const step = 2 * span / n;
    let best = null, gs = [];
    for (let i = 0; i <= n; i++) {
      const t = -span + i * step, g = geom(B, o, t);
      // The inner contact is |m| = |L2|. L2 is negative inside an umbra and
      // POSITIVE inside an antumbra, so the m + L2 form that holds for a total
      // eclipse has no root for an annular one: annularity would report zero
      // seconds everywhere while the magnitude still came out right.
      gs.push({ t, out: g.m - g.L1, inn: g.m - Math.abs(g.L2), mag: (g.L1 - g.m) / (g.L1 + g.L2) });
      if (!best || gs[i].mag > best.mag) best = gs[i];
    }
    if (best.mag <= 0) return null;

    // Golden-section on the magnitude, which is monotone either side of maximum.
    let a = best.t - step, b = best.t + step;
    const magAt = t => { const g = geom(B, o, t); return (g.L1 - g.m) / (g.L1 + g.L2); };
    for (let i = 0; i < 80; i++) {
      const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618;
      if (magAt(m1) > magAt(m2)) b = m2; else a = m1;
    }
    const tMax = (a + b) / 2, gm = geom(B, o, tMax);

    const fOf = key => t => { const g = geom(B, o, t); return key === 'out' ? g.m - g.L1 : g.m - Math.abs(g.L2); };
    const roots = key => {
      const f = fOf(key), r = [];
      for (let i = 0; i < n; i++)
        if ((gs[i][key] < 0) !== (gs[i + 1][key] < 0)) r.push(bisect(f, gs[i].t, gs[i + 1].t));
      return r;
    };
    // Contacts are named by which way the curve crosses zero, never by the
    // order the roots came out. First-root-is-C1 assumes both are inside the
    // window; when only one is, a LAST contact gets stamped as a first one and
    // every consumer that scans forward from C1 then finds an empty interval
    // and concludes there is no eclipse here.
    const name = (key, cIn, cOut) => {
      const f = fOf(key), rr = roots(key), eps = 1e-6;
      const before = rr.filter(r => r <= tMax && f(r + eps) < 0);
      const after = rr.filter(r => r >= tMax && f(r + eps) > 0);
      if (before.length) out[cIn] = stamp(Math.max(...before));
      if (after.length) out[cOut] = stamp(Math.min(...after));
    };

    const stamp = t => {
      const g = geom(B, o, t), aa = altaz(o, g);
      return { t, utc: utcOf(B, t), alt: aa.alt, az: aa.az };
    };
    const rSun = (gm.L1 + gm.L2) / 2, rMoon = (gm.L1 - gm.L2) / 2;
    const out = {
      magnitude: magnitude(gm.m, rSun, rMoon),
      obscuration: obscuration(gm.m, rSun, rMoon),
      central: gm.L2 < 0 ? 'total' : 'annular',
      MAX: stamp(tMax), duration_s: 0
    };
    name('out', 'C1', 'C4');
    name('inn', 'C2', 'C3');
    if (out.C2 && out.C3) out.duration_s = (out.C3.t - out.C2.t) * 3600;

    // The shadow geometry does not care whether the Sun is up, and a user
    // does. An eclipse whose maximum falls below the horizon is not visible
    // from here even though every number above is correct.
    if (out.MAX.alt > 0) { out.visible_obscuration = out.obscuration; out.visible_max = out.MAX; }
    else {
      // Fall back to the whole window rather than to C1: if a contact is
      // missing the interval must widen, never collapse.
      const ta = out.C1 ? out.C1.t : -span, tb = out.C4 ? out.C4.t : span;
      let vo = 0, vt = null;
      for (let i = 0; i <= 400; i++) {
        const t = ta + (tb - ta) * i / 400, g = geom(B, o, t);
        if (altaz(o, g).alt <= 0) continue;
        const ob = obscuration(g.m, (g.L1 + g.L2) / 2, (g.L1 - g.L2) / 2);
        if (ob > vo) { vo = ob; vt = t; }
      }
      out.visible_obscuration = vo;
      out.visible_max = vt === null ? null : stamp(vt);
    }
    return out;
  }

  // --- path geometry ------------------------------------------------------

  // Great-circle distance in km, for deciding when a track needs more samples.
  const R_KM = 6371.0088;
  function arcKm(a, b) {
    const p1 = a[0] * D2R, p2 = b[0] * D2R, dl = (b[1] - a[1]) * D2R;
    const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // A fixed time step cannot sample a shadow track evenly: the umbra's ground
  // speed diverges where the path ends at sunset, so six seconds that give a
  // 2 km spacing mid-track give 110 km at the very end. Rather than sample the
  // whole track at that rate, bisect only the intervals that need it.
  function densify(pts, at, maxKm = 25, depth = 6) {
    const out = [];
    const fill = (a, b, d) => {
      if (d >= depth || arcKm(a, b) <= maxKm) return;
      const m = at((a[2] + b[2]) / 2);
      if (!m) return;
      fill(a, m, d + 1);
      out.push(m);
      fill(m, b, d + 1);
    };
    for (let i = 0; i < pts.length; i++) {
      out.push(pts[i]);
      const a = pts[i], b = pts[i + 1];
      if (a && b) fill(a, b, 0);
    }
    return out;
  }

  // Central line: the axis intersection, sampled while it exists. The step is
  // six seconds, not one minute: near the end of a path at grazing incidence
  // the umbra crosses the ground at some 3 km/s, so a minute leaves 180 km
  // gaps and the drawn line stops being where the shadow is.
  //
  // A sample that misses the Earth pushes a null instead of being dropped.
  // Dropping it closes the array over the hole and the renderer then draws a
  // straight chord across a gap the shadow never crossed.
  function centralLine(B, step = 1 / 600) {
    const pts = [];
    let had = false;
    for (let t = -4.0; t <= 4.0; t += step) {
      const p = axisPoint(B, t);
      if (p) { pts.push([p.lat, p.lon, t]); had = true; }
      else if (had && pts[pts.length - 1] !== null) pts.push(null);
    }
    return densify(pts, tt => {
      const q = axisPoint(B, tt);
      return q ? [q.lat, q.lon, tt] : null;
    });
  }

  // Northern and southern limits of a shadow, offsetting the axis in the
  // fundamental plane perpendicular to the shadow's motion RELATIVE TO THE
  // GROUND, by the cone radius at the observer's own zeta. Both corrections
  // matter and both need iterating, because each depends on the point the
  // other produces:
  //
  //  * the radius depends on zeta, which depends on where the point lands;
  //  * the perpendicular depends on the relative velocity, and the observer's
  //    own eastward speed is a few hundred m/s against an umbra doing a few
  //    km/s. Ignoring it narrows the drawn band by up to 5 km on each side at
  //    low latitude, which is a 4 % error on a 130 km half-width and puts the
  //    edge of the band inside the region the same code calls total.
  //
  // The two edges are returned as `edges`, NOT as north and south. Those names
  // do not survive: they are the left and right side of the shadow's motion,
  // which coincides with latitude only while the shadow travels roughly
  // eastward, and the two disagree at some 170 of 6200 sampled epochs across
  // this catalogue. Relabelling them per epoch by latitude fixes the names and
  // destroys the curves, because membership then flips mid-track and each
  // polyline zigzags between the two edges. Each edge stays a continuous
  // curve; whoever needs "the northern one" compares latitudes at one epoch.
  function limits(B, which = 'l2', step = 1 / 600) {
    const tanf = which === 'l2' ? B.tan_f2 : B.tan_f1;
    const muDot = B.mu_deg[1] * D2R;                   // radians of hour angle per hour
    const edges = [[], []];
    const had = [false, false];
    for (let t = -4.0; t <= 4.0; t += step) {
      const e = evaluate(B, t);
      const side = [1, -1].map(s => edgePoint(B, which, t, s));
      side.forEach((p, k) => {
        const arr = edges[k];
        if (p) { arr.push(p); had[k] = true; }
        else if (had[k] && arr[arr.length - 1] !== null) arr.push(null);
      });
    }
    return { edges: edges.map((arr, k) => densify(arr, tt => edgePoint(B, which, tt, k ? -1 : 1))) };
  }

  // One edge point at one instant, factored out so densify() can resample.
  function edgePoint(B, which, t, s) {
    const tanf = which === 'l2' ? B.tan_f2 : B.tan_f1;
    const muDot = B.mu_deg[1] * D2R;
    const e = evaluate(B, t);
    let zeta = 0, xiD = 0, etaD = 0, p = null;
    for (let k = 0; k < 5; k++) {
      const L = Math.abs((which === 'l2' ? e.l2 : e.l1) - zeta * tanf);
      const vx = e.xd - xiD, vy = e.yd - etaD, nrm = Math.hypot(vx, vy);
      p = project(B, e, e.x - s * L * vy / nrm, e.y + s * L * vx / nrm);
      if (!p) return null;
      zeta = p.zeta;
      xiD = p.cu * Math.cos(p.H) * muDot;
      etaD = p.cu * Math.sin(p.H) * Math.sin(e.d) * muDot;
    }
    return [p.lat, p.lon, t];
  }

  // Outline of the penumbra on the globe at one instant: the locus where the
  // observer's distance from the axis equals the penumbral radius.
  function penumbraOutline(B, t, nth = 181) {
    const e = evaluate(B, t), seg = [];
    let cur = [];
    for (let i = 0; i < nth; i++) {
      const th = 2 * Math.PI * i / (nth - 1);
      let zeta = 0, p = null;
      for (let k = 0; k < 4; k++) {
        const L = e.l1 - zeta * B.tan_f1;
        p = project(B, e, e.x + L * Math.cos(th), e.y + L * Math.sin(th));
        if (!p) break;
        zeta = p.zeta;
      }
      if (p) cur.push([p.lat, p.lon]);
      else if (cur.length) { seg.push(cur); cur = []; }
    }
    if (cur.length) seg.push(cur);
    return seg;
  }

  // Greatest obscuration on a lat/lon grid, for shading the visibility zone.
  // The elements are evaluated once per time step and the observer transform
  // once per cell, which is what keeps a global grid inside a few hundred ms.
  // Max obscuration over the whole eclipse, on an equirectangular grid.
  //
  // The pruning is what makes a fine grid affordable, and it is exact rather
  // than a heuristic. Every condition that can rule a cell out at one instant
  // is monotone in cos H: the Sun is up when zeta = rs*sd + rc*cd*cos H > 0,
  // and the observer is within reach of the penumbra along eta only when
  // |eta - y| < L1, with eta = rs*cd - rc*sd*cos H. Intersecting both in
  // cos H leaves a single interval, which is two arcs in H and therefore at
  // most two runs of columns; the rest of the row is skipped without
  // evaluating anything. L1 is replaced by its bound l1 -- zeta is in [0,1]
  // and tan_f1 > 0, so l1 - zeta*tan_f1 <= l1 -- which makes the interval a
  // superset. The test inside the loop is the same one as before, so the
  // pruning cannot change a single cell; besselian.test.js checks that
  // against an unpruned sweep.
  // Golden section on the maximum in time, starting from an instant already
  // known to be the closest of a coarse scan.
  //
  // This is not a refinement anyone can skip. Measured on 2026-08-12, the
  // coarse scan at 3.2-minute steps undershoots the true maximum by 4e-4 in
  // the median and by 1.4e-2 in the tail away from the terminator, which at a
  // typical gradient is tens of kilometres of contour displacement. Worse, it
  // undershoots by DIFFERENT amounts at different points, so a grid built on
  // the coarse scan and a refinement built on the exact value are level sets
  // of two different functions: 13 % of contour vertices came out with no sign
  // change to bisect. The grid and the refinement have to be the same
  // function, and this is it.
  const T_SPAN = 3.2;

  // Obscuration at one instant for one observer, without allocating.
  //
  // evaluate() and geom() each build an object, and this is called millions of
  // times while the contours are refined: the objects alone were most of the
  // run time. The arithmetic below is the same as those two functions
  // composed, and besselian.test.js checks that it agrees with them.
  function obsAt(B, o, t) {
    const x = poly(B.x, t), y = poly(B.y, t);
    const d = poly(B.d_deg, t) * D2R, mu = poly(B.mu_deg, t) * D2R;
    const H = mu + o.lon - o.dmu;
    const cH = Math.cos(H), sd = Math.sin(d), cd = Math.cos(d);
    // The Sun has to be above the GEODETIC horizon, which is what local()
    // uses to decide whether there is a visible eclipse in the panel.
    // zeta > 0 is the geocentric horizon, and on an ellipsoid they are not
    // the same: the two criteria disagree by up to 0.091 degrees of solar
    // altitude and, near sunset, those minutes were worth 19 points of
    // obscuration between the band the map painted and the figure the panel
    // gave for the same point. A map that contradicts its own answer is
    // worse than a coarse map.
    if (Math.sin(o.p) * sd + Math.cos(o.p) * cd * cH <= 0) return 0;
    const zeta = o.rs * sd + o.rc * cH * cd;
    const L1 = poly(B.l1, t) - zeta * B.tan_f1;
    const m = Math.hypot(x - o.rc * Math.sin(H), y - (o.rs * cd - o.rc * cH * sd));
    if (m >= L1) return 0;
    const L2 = poly(B.l2, t) - zeta * B.tan_f2;
    return obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
  }

  // Visibility margin: how much the observer has to spare, or is short of,
  // being inside the penumbra, in Earth radii, with the Sun above the
  // horizon. Positive inside, negative outside, zero exactly at external
  // contact.
  //
  // It is the exact criterion for "something is visible here", which is why
  // the visibility limit contours it instead of a very small obscuration
  // level. The difference is not cosmetic: near that edge the eclipse lasts
  // minutes, and a 121-instant sweep of the obscuration misses it by as much
  // as 0.0165 -- thirty-two of every two thousand two hundred fringe points
  // read as zero. L1 - m, by contrast, is smooth in time and does not depend
  // on the sampling landing inside the eclipse: it passes through zero
  // exactly where the edge of the penumbra touches the ground.
  function visAt(B, o, t) {
    const x = poly(B.x, t), y = poly(B.y, t);
    const d = poly(B.d_deg, t) * D2R, mu = poly(B.mu_deg, t) * D2R;
    const H = mu + o.lon - o.dmu;
    const cH = Math.cos(H), sd = Math.sin(d), cd = Math.cos(d);
    if (Math.sin(o.p) * sd + Math.cos(o.p) * cd * cH <= 0) return -1;
    const zeta = o.rs * sd + o.rc * cH * cd;
    const L1 = poly(B.l1, t) - zeta * B.tan_f1;
    const m = Math.hypot(x - o.rc * Math.sin(H), y - (o.rs * cd - o.rc * cH * sd));
    const v = L1 - m;
    return v < -1 ? -1 : v;
  }

  function timeMax(B, o, k, nt, span, at) {
    span = span || T_SPAN;
    at = at || (t => obsAt(B, o, t));
    const T = kk => -span + 2 * span * kk / (nt - 1);
    let a = T(Math.max(0, k - 1)), b = T(Math.min(nt - 1, k + 1));
    const gr = 0.6180339887498949;
    let c = b - gr * (b - a), d = a + gr * (b - a), fc = at(c), fd = at(d);
    // Nine steps leave the interval at 1.3 % of its 6.4 minutes, that is,
    // five seconds of time. Near a smooth maximum that is 1e-6 of
    // obscuration; going further does not pay. T(k) itself is not
    // re-evaluated here: the caller already has it from the coarse sweep.
    for (let i = 0; i < 9; i++) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = at(c); }
      else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = at(d); }
    }
    return Math.max(fc, fd);
  }

  function obscurationGrid(B, nlon = 640, nlat = 320, nt = 121) {
    const grid = new Float32Array(nlon * nlat);
    // At which instant each cell's maximum happens. The drawing does not use
    // it: the contour refinement does, so it can look at a few instants
    // around it rather than sweeping the six hours again. It is the
    // difference between refining a vertex in 4 us and in 18.
    const tmax = new Int16Array(nlon * nlat).fill(-1);
    // A second field, the visibility margin, in the same pass: the loop
    // already has m and L1 in hand and keeping their maximum costs nothing.
    // The dashed outer limit comes out of this, and it comes out exact where
    // a small-obscuration contour only got as far as approximate.
    const vis = new Float32Array(nlon * nlat).fill(-1);
    const tvis = new Int16Array(nlon * nlat).fill(-1);
    const dmu = dmuOf(B), rows = [];
    for (let j = 0; j < nlat; j++) {
      const lat = (90 - (j + 0.5) * 180 / nlat) * D2R;
      const N = 1 / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
      rows.push({ p: lat, rc: N * Math.cos(lat), rs: N * (1 - E2) * Math.sin(lat),
                  tan: Math.tan(lat) });
    }
    const clamp = c => c < -1 ? -1 : c > 1 ? 1 : c;
    for (let k = 0; k < nt; k++) {
      const t = -T_SPAN + 2 * T_SPAN * k / (nt - 1), e = evaluate(B, t);
      const sd = Math.sin(e.d), cd = Math.cos(e.d);
      const base = (e.mu - dmu) * R2D;              // lon = H - (mu - dmu)
      for (let j = 0; j < nlat; j++) {
        const r = rows[j];
        let cmin = -r.tan * sd / cd, cmax = 1;           // el Sol sobre el horizonte
        const P = r.rs * cd - e.y, Q = r.rc * sd;        // |eta - y| < l1
        if (Math.abs(Q) < 1e-12) {
          if (Math.abs(P) >= e.l1) continue;
        } else {
          const a = (P - e.l1) / Q, b = (P + e.l1) / Q;
          cmin = Math.max(cmin, Math.min(a, b));
          cmax = Math.min(cmax, Math.max(a, b));
        }
        if (cmin > cmax || cmin > 1 || cmax < -1) continue;
        const h0 = Math.acos(clamp(cmax)), h1 = Math.acos(clamp(cmin));
        for (const arc of [[h0, h1], [-h1, -h0]]) {
          const lo = Math.ceil((arc[0] * R2D - base + 180) / 360 * nlon - 0.5);
          const hi = Math.floor((arc[1] * R2D - base + 180) / 360 * nlon - 0.5);
          for (let ii = lo; ii <= hi; ii++) {
            const i = ((ii % nlon) + nlon) % nlon;
            const H = e.mu + (-180 + (i + 0.5) * 360 / nlon) * D2R - dmu;
            const cH = Math.cos(H);
            // Geodetic horizon, the same one obsAt and local() use.
            if (Math.sin(r.p) * sd + Math.cos(r.p) * cd * cH <= 0) continue;
            const zeta = r.rs * sd + r.rc * cH * cd;
            const m = Math.hypot(e.x - r.rc * Math.sin(H), e.y - (r.rs * cd - r.rc * cH * sd));
            const L1 = e.l1 - zeta * B.tan_f1;
            const idx = j * nlon + i;
            const vm = L1 - m;
            if (vm > vis[idx]) { vis[idx] = vm; tvis[idx] = k; }
            if (m >= L1) continue;
            const L2 = e.l2 - zeta * B.tan_f2;
            const o = obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
            if (o > grid[idx]) { grid[idx] = o; tmax[idx] = k; }
          }
        }
      }
    }

    // Second pass: where the eclipse is partial, the maximum is refined in
    // time. Outside that it is not needed -- a cell in totality is already 1
    // and one with no eclipse is 0 -- so this costs about 20 % of the grid.
    for (let j = 0; j < nlat; j++) {
      const r = rows[j], lat = (90 - (j + 0.5) * 180 / nlat) * D2R;
      for (let i = 0; i < nlon; i++) {
        const idx = j * nlon + i, v = grid[idx];
        if (!(v > 0 && v < 1)) continue;
        const o = { p: lat, lon: (-180 + (i + 0.5) * 360 / nlon) * D2R,
                    rc: r.rc, rs: r.rs, dmu };
        const w = timeMax(B, o, tmax[idx], nt, T_SPAN);
        if (w > v) grid[idx] = w;
      }
    }

    // And the same for the margin, except the fringe needs more care there.
    // A cell right on the shore can fail to be inside the penumbra at ANY of
    // the 121 instants and be inside between two of them: it keeps the floor,
    // -1, and the limit passes through the wrong place. So the whole cell is
    // recomputed, with no hint, whenever its sign disagrees with a
    // neighbour's; a hint is enough where the value is already near zero.
    const near = new Uint8Array(nlon * nlat);
    for (let j = 0; j < nlat; j++) {
      for (let i = 0; i < nlon; i++) {
        const idx = j * nlon + i, v = vis[idx];
        if (v > -0.05 && v < 0.05) { near[idx] = 1; continue; }
        const p = v >= 0;
        for (const q of [j > 0 ? idx - nlon : -1, j < nlat - 1 ? idx + nlon : -1,
                         j * nlon + (i + nlon - 1) % nlon, j * nlon + (i + 1) % nlon])
          if (q >= 0 && (vis[q] >= 0) !== p) { near[idx] = 2; break; }
      }
    }
    for (let j = 0; j < nlat; j++) {
      const r = rows[j], lat = (90 - (j + 0.5) * 180 / nlat) * D2R;
      for (let i = 0; i < nlon; i++) {
        const idx = j * nlon + i;
        if (!near[idx]) continue;
        const lon = -180 + (i + 0.5) * 360 / nlon;
        const o = { p: lat, lon: lon * D2R, rc: r.rc, rs: r.rs, dmu };
        const w = (near[idx] === 1 && tvis[idx] >= 0)
          ? timeMax(B, o, tvis[idx], nt, T_SPAN, t => visAt(B, o, t))
          : visMargin(B, lat * R2D, lon, { nt, o });
        if (w > vis[idx]) vis[idx] = w;
      }
    }
    return { grid, tmax, vis, tvis, nlon, nlat, nt };
  }


  // Max obscuration at one point, from the elements alone and to the same
  // accuracy as the grid, because it runs the same refinement.
  //
  // `k` narrows the coarse scan to the neighbourhood of an instant already
  // known to be close, which is what makes refining thousands of contour
  // vertices affordable. It is a hint, not a promise: if the window comes up
  // empty the scan falls back to the whole span rather than reporting that
  // there is no eclipse here.
  function maxObscuration(B, lat, lon, opts) {
    return fieldMax(B, lat, lon, opts, obsAt, 0);
  }

  // Same as maxObscuration but over the visibility margin. The floor is -1
  // and not 0: outside the penumbra the margin is negative, and that sign is
  // what the contour needs.
  function visMargin(B, lat, lon, opts) {
    return fieldMax(B, lat, lon, opts, visAt, -1);
  }

  function fieldMax(B, lat, lon, opts, kernel, floor) {
    opts = opts || {};
    const nt = opts.nt || 121, span = opts.span || T_SPAN;
    const o = opts.o || observer(B, lat, lon, 0);
    const at = t => kernel(B, o, t);
    const T = k => -span + 2 * span * k / (nt - 1);
    let best = floor, bk = -1;
    const scan = (a, b) => {
      for (let k = a; k <= b; k++) { const v = at(T(k)); if (v > best) { best = v; bk = k; } }
    };

    // The hint is the instant of a neighbouring grid cell's maximum, and it
    // exists so as not to sweep six hours at every one of the thousands of
    // vertices that need refining. SEVERAL are accepted, and that is not a
    // convenience: near the terminator the visible obscuration has two
    // separate humps, one for each spell the Sun spends above the horizon,
    // and two neighbouring cells can have their maximum in different ones.
    // With a single hint the bisection between those two cells chases the
    // wrong hump: measured on 2036-08-21, at 78 N it gave 0.207 where the
    // full sweep gives 0.715, and the vertex came out pinned four kilometres
    // from its curve, in a spike.
    //
    // Widening the window does not help there, because the wrong hump's
    // maximum is interior to its own window and stops it growing. What holds
    // the case up is looking in both.
    const ks = (Array.isArray(opts.k) ? opts.k : [opts.k]).filter(k => k >= 0);
    let lo = 0, hi = nt - 1;
    if (ks.length) {
      // The window covers EVERYTHING between the hints, not a slice around
      // each. The instant of the maximum moves continuously along the edge
      // being bisected, so at any intermediate point it falls between the two
      // ends'; looking only around each end leaves out exactly the middle,
      // and there the bisected function stops being the intended one.
      lo = Math.max(0, Math.min.apply(null, ks) - 2);
      hi = Math.min(nt - 1, Math.max.apply(null, ks) + 2);
    }
    scan(lo, hi);
    // Y aun asi la ventana se ensancha mientras el maximo caiga en su borde:
    // en el caso normal no cuesta nada, y donde la pista falla acaba
    // barriendolo todo.
    while (lo > 0 && (bk < 0 || bk === lo)) { const n = Math.max(0, lo - 3); scan(n, lo - 1); lo = n; }
    while (hi < nt - 1 && (bk < 0 || bk === hi)) { const n = Math.min(nt - 1, hi + 3); scan(hi + 1, n); hi = n; }
    if (bk < 0) return floor;
    if (floor === 0 && best >= 1) return 1;
    return Math.max(best, timeMax(B, o, bk, nt, span, at));
  }

  // Filled obscuration bands, as closed rings of [lat, lon].
  //
  // The grid decides the TOPOLOGY -- which cells a level runs through and in
  // what order -- and nothing else. Every vertex sits on a grid edge whose two
  // ends straddle the level, and the crossing is recovered by BISECTING the
  // true maximum-obscuration function along that edge, not by interpolating
  // the two grid values. So the vertex position does not inherit the grid step
  // either; what is left is the bisection tolerance, which is metres, and the
  // chord between consecutive vertices. besselian.test.js measures both.
  //
  // The domain is framed with a row and a column of -1 one cell outside the
  // world. Every contour therefore closes inside that frame, with no special
  // case for the poles and none for the antimeridian, and the stretch of ring
  // that runs through the frame is off the map: the view is clamped to the
  // world and cannot pan there. A band that genuinely crosses the antimeridian
  // comes out cut at both edges, which is what a non-wrapping map has to show.
  // The outermost band starts at 5 %, not at 0.1 %.
  //
  // Not an aesthetic choice. Near the edge of the penumbra the eclipse lasts
  // minutes and the 121-instant sweep misses it: measured against a
  // 2001-instant sweep, the loss reaches 0.0165 of obscuration and 32 of 2227
  // fringe points with an eclipse read as zero. A 0.1 % contour chases a
  // function that is zero in patches there, and comes out ragged. 5 % gives
  // three times the margin over that loss. What is left undrawn is some
  // 175 km of fringe over a 7000 km penumbra, and the real limit is drawn
  // already: it is the visibility contour, the dashed line.
  const BAND_LEVELS = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  // Conexiones de marching squares. Bits: tl 8, tr 4, br 2, bl 1.
  // Codigos de lado: 0 arriba, 1 derecha, 2 abajo, 3 izquierda.
  const MS_CASE = [
    [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], null, [[0, 2]], [[3, 0]],
    [[3, 0]], [[0, 2]], null, [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []
  ];

  const KM_PER_DEG = 111.19;
  function contours(B, opts) {
    opts = opts || {};
    const levels = opts.levels || BAND_LEVELS;
    const tolKm = opts.tolKm === undefined ? 0.5 : opts.tolKm;
    // Ten passes and not seven: measured, the seventh was still inserting
    // points in 113 combinations of eclipse and level, that is, the cut-off
    // arrived before convergence did. The subdivision only works where it is
    // needed, so raising the cap costs nothing where it had already
    // finished.
    const maxDepth = opts.maxDepth === undefined ? 10 : opts.maxDepth;
    const G = opts.grid || obscurationGrid(B, opts.nlon || 400, opts.nlat || 200, opts.nt || 121);
    const nlon = G.nlon, nlat = G.nlat, nt = G.nt;
    // The lattice: frame, world edge, cell centres, edge, frame.
    //
    // The world edge carries REAL values, computed, not interpolated. Without
    // it, the edge joining the last cell centre to the -1 frame was cut by
    // interpolating against -1 over 1.35 degrees, and that cut fell INSIDE
    // the map: measured, up to 66 km in along the antimeridian and 39 at the
    // poles, with the wrong band painted there, across all 56 eclipses. With
    // real nodes at +-180 and +-90, every crossing against the frame falls on
    // the world edge or beyond, which is where it was meant to fall.
    const nrow = nlat + 4, ncol = nlon + 4;
    const dlat = 180 / nlat, dlon = 360 / nlon;

    const lats = new Float64Array(nrow), lons = new Float64Array(ncol);
    lats[0] = 90 + dlat; lats[1] = 90;
    lats[nlat + 2] = -90; lats[nlat + 3] = -90 - dlat;
    lons[0] = -180 - dlon; lons[1] = -180;
    lons[nlon + 2] = 180; lons[nlon + 3] = 180 + dlon;
    for (let j = 0; j < nlat; j++) lats[j + 2] = 90 - (j + 0.5) * dlat;
    for (let i = 0; i < nlon; i++) lons[i + 2] = -180 + (i + 0.5) * dlon;

    // Two fields through the same machinery. The bands are traced over the
    // greatest obscuration; the outer limit, over the visibility margin,
    // which passes through zero exactly where the edge of the penumbra
    // touches the ground. Everything below -- marching squares, bisection,
    // subdivision, smoothing -- reads `val`, `kAt` and `FLD`, which are
    // reassigned when the field changes.
    let val, kAt, FLD;
    const lattice = (arr, karr, F) => {
      const v = new Float32Array(nrow * ncol).fill(-1);
      const k = new Int16Array(nrow * ncol).fill(-1);
      for (let j = 0; j < nlat; j++) {
        for (let i = 0; i < nlon; i++) {
          v[(j + 2) * ncol + i + 2] = arr[j * nlon + i];
          k[(j + 2) * ncol + i + 2] = karr[j * nlon + i];
        }
      }
      const edge = (r, c, rIn, cIn) => {
        const kh = k[rIn * ncol + cIn];
        k[r * ncol + c] = kh;
        v[r * ncol + c] = F(lats[r], lons[c], kh);
      };
      for (let c = 1; c <= nlon + 2; c++) {
        const cIn = Math.min(nlon + 1, Math.max(2, c));
        edge(1, c, 2, cIn);
        edge(nlat + 2, c, nlat + 1, cIn);
      }
      for (let r = 2; r <= nlat + 1; r++) {
        edge(r, 1, r, 2);
        edge(r, nlon + 2, r, nlon + 1);
      }
      return { val: v, kAt: k, F };
    };
    const F_OBS = (la, lo, k) => maxObscuration(B, la, lo, { nt, k });
    const F_VIS = (la, lo, k) => visMargin(B, la, lo, { nt, k });
    const jobs = [{ lat: lattice(G.grid, G.tmax, F_OBS), levels }];
    if (opts.visible !== false && G.vis)
      jobs.push({ lat: lattice(G.vis, G.tvis, F_VIS), levels: [0], vis: true });

    // The instant of the maximum in the nearest cells, as a time hint for a
    // point that is not on the grid.
    const kNear = (la, lo) => {
      const j = Math.min(nlat - 1, Math.max(0, Math.floor((90 - la) / dlat)));
      const i = Math.min(nlon - 1, Math.max(0, Math.floor((lo + 180) / dlon)));
      const out = [];
      for (let dj = 0; dj <= 1; dj++) {
        for (let di = 0; di <= 1; di++) {
          const jj = Math.min(nlat - 1, j + dj), ii = Math.min(nlon - 1, i + di);
          const k = kAt[(jj + 2) * ncol + ii + 2];
          if (k >= 0 && out.indexOf(k) < 0) out.push(k);
        }
      }
      return out;
    };

    // A point of the contour on the normal to a chord, searched half a chord
    // to either side. Returns null if there is no sign change there, which is
    // what happens above the terminator: the region boundary there is a jump
    // in the function and not a level curve, and there is nothing to refine.
    const onCurve = (level, a, b) => {
      const la = (a[0] + b[0]) / 2, lo = (a[1] + b[1]) / 2;
      if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
      const cs = Math.max(1e-6, Math.cos(la * D2R));
      const dx = (b[1] - a[1]) * cs, dy = b[0] - a[0];
      const L = Math.hypot(dx, dy);
      if (!(L > 0)) return null;
      const nx = -dy / L, ny = dx / L, kh = kNear(la, lo);
      // The normal is traced in arc distance and converted back to longitude
      // by dividing by the cosine of the latitude. Near the pole that cosine
      // is tiny and a displacement of one degree of arc becomes a hundred of
      // longitude: measured, vertices came out at 185 degrees, outside the
      // domain. Hence the two guards: the search radius never exceeds half a
      // degree of arc, and a result that leaves the frame is discarded.
      const at = u => [la + ny * u, lo + nx * u / cs];
      const inside = q => Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180;
      // Half a chord to either side, which is what the comment used to say
      // and what is needed: with a whole chord the bisection could latch onto
      // ANOTHER branch of the contour passing nearby, and the ring crossed
      // itself. The true curve departs from its chord by far less than half a
      // chord, so if the root is not there, it is not this one.
      const R = Math.min(L / 2, 0.5);
      const f = u => { const q = at(u); return FLD(q[0], q[1], kh) - level; };
      let u0 = -R, u1 = R, f0 = f(u0);
      if ((f0 < 0) === (f(u1) < 0)) return null;
      for (let it = 0; it < 12; it++) {
        const u = (u0 + u1) / 2, fu = f(u);
        if ((f0 < 0) === (fu < 0)) { u0 = u; f0 = fu; } else { u1 = u; }
      }
      const um = (u0 + u1) / 2, q = at(um);
      if (!inside(q)) return null;
      // A sign change is not always a root. Above the terminator the greatest
      // obscuration JUMPS from zero to a finite value, because the Sun sets
      // before the maximum, and a bisection that crosses that jump converges
      // to the sunset line instead of to the level curve. The point it
      // returned was perfectly computed and did not belong to this curve:
      // measured on 2026-08-12, 348 points like that, up to six kilometres
      // out, and every one of them a tooth in the drawing.
      //
      // Twelve bisections over half a degree leave the remainder at some
      // thirteen metres, that is |f| of order 1e-4 at a real root; at a jump
      // |f| stays at the size of the jump. A threshold of 1e-3 separates them
      // unambiguously. Rejecting leaves the segment straight, which is coarse
      // but is the shape of the boundary: a jump has no curve to follow.
      if (Math.abs(f(um)) <= 1e-3) return q;
      // Before rejecting, the same doubt as on the grid edge: it may not be a
      // jump but a time hint that does not hold here. Retried without it.
      const g = u => { const w = at(u); return FLD(w[0], w[1], -1) - level; };
      let g0 = g(-R);
      if ((g0 < 0) === (g(R) < 0)) return null;
      let a0 = -R, a1 = R;
      for (let it = 0; it < 12; it++) {
        const u = (a0 + a1) / 2, gu = g(u);
        if ((g0 < 0) === (gu < 0)) { a0 = u; g0 = gu; } else { a1 = u; }
      }
      const um2 = (a0 + a1) / 2, q2 = at(um2);
      return (inside(q2) && Math.abs(g(um2)) <= 1e-3) ? q2 : null;
    };

    // Adaptive subdivision. The grid decides WHERE THE VERTICES START; the
    // tolerance decides where they end up. For a curve sampled at constant
    // step, the distance h from a vertex to the chord joining its two
    // neighbours is four times the sagitta of one segment, so h/4 estimates
    // the error without evaluating anything. Segments over tolerance get a
    // new point, and that one is computed against the real function.
    const segKm = (a, b) => Math.hypot((b[1] - a[1]) * Math.cos((a[0] + b[0]) / 2 * D2R),
                                       b[0] - a[0]) * KM_PER_DEG;
    function densify(ring, level) {
      for (let pass = 0; pass < maxDepth; pass++) {
        const n = ring.length;
        const h = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const a = ring[(i - 1 + n) % n], b = ring[i], c = ring[(i + 1) % n];
          const cs = Math.cos(b[0] * D2R);
          const ax = (a[1] - b[1]) * cs, ay = a[0] - b[0];
          const cx = (c[1] - b[1]) * cs, cy = c[0] - b[0];
          const L = Math.hypot(cx - ax, cy - ay);
          h[i] = L > 0 ? Math.abs(ax * (cy - ay) - ay * (cx - ax)) / L * KM_PER_DEG : 0;
        }
        const out = [];
        let added = 0;
        for (let i = 0; i < n; i++) {
          const a = ring[i], b = ring[(i + 1) % n];
          out.push(a);
          // a[2] marks a segment already tried that has no root to refine:
          // above the terminator the region boundary is a jump, not a level
          // curve. Without the mark it gets probed again on every pass, and
          // half of an eclipse's contour runs along the terminator.
          if (a[2]) continue;
          const est = Math.max(h[i], h[(i + 1) % n]) / 4;
          const len = segKm(a, b);
          if (est <= tolKm || len < 2 * tolKm || len > 1000) continue;
          const q = onCurve(level, a, b);
          if (q) { out.push(q); added++; } else { a[2] = 1; }
        }
        if (!added) break;
        ring = out;
      }
      return ring;
    }

    // The region boundary above the terminator is a jump, and a jump has no
    // curve to follow: the only thing known about it is which pair of grid
    // nodes it passes between. Bisection places it precisely on each edge,
    // but the grid is 0.56 degrees and at high latitude that is twenty
    // kilometres of longitude against sixty of latitude, so the chain of cuts
    // comes out as a zigzag: teeth up to fifty kilometres, with the ten
    // levels piled on the same jump drawn as a tangle.
    //
    // They get smoothed, and ONLY they do. A level vertex is where the
    // function says it is and does not get touched -- the drawing's measured
    // accuracy lives on that. A jump vertex is on one particular edge and
    // nowhere better inside it, so averaging it with its neighbours loses
    // nothing that was known: it removes the sampling noise and leaves the
    // line the jump actually describes.
    function smoothJumps(ring, rounds = 20) {
      const n = ring.length;
      if (n < 5) return ring;
      for (let it = 0; it < rounds; it++) {
        const next = ring.slice();
        for (let i = 0; i < n; i++) {
          const b = ring[i];
          if (!b[3]) continue;
          const a = ring[(i - 1 + n) % n], c = ring[(i + 1) % n];
          // A ring that crosses the antimeridian carries 360-degree jumps
          // between consecutive vertices; averaging across one of those sends
          // the point to the middle of the map.
          if (Math.abs(a[1] - b[1]) > 5 || Math.abs(c[1] - b[1]) > 5) continue;
          // A Laplacian average, and then PROJECTED ONTO ITS OWN EDGE. That
          // the jump crosses that edge is certain; where along it, the grid
          // knows no better. So the vertex is allowed to run along the edge,
          // which is the direction carrying no information, and forbidden to
          // leave it, which is the direction that does. Free smoothing would
          // eat the curves.
          const mla = (a[0] + 2 * b[0] + c[0]) / 4, mlo = (a[1] + 2 * b[1] + c[1]) / 4;
          const dla = b[6] - b[4], dlo = b[7] - b[5];
          const den = dla * dla + dlo * dlo;
          let t = den > 0 ? ((mla - b[4]) * dla + (mlo - b[5]) * dlo) / den : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          next[i] = [b[4] + t * dla, b[5] + t * dlo, 0, 1, b[4], b[5], b[6], b[7]];
        }
        ring = next;
      }
      // Whatever is still a spike after twenty passes is not a spike of the
      // curve: it is a jump vertex trapped between two neighbours that follow
      // another branch. Its edge does not say where the jump is, only that it
      // crosses it, so removing it erases nothing that was known and leaves
      // the straight chord between its neighbours, which passes through the
      // same place without the tooth.
      const keep = [];
      for (let i = 0; i < ring.length; i++) {
        const b = ring[i];
        if (b[3]) {
          const a = ring[(i - 1 + ring.length) % ring.length];
          const c = ring[(i + 1) % ring.length];
          const cs = Math.cos(b[0] * D2R);
          const ax = (a[1] - b[1]) * cs, ay = a[0] - b[0];
          const cx = (c[1] - b[1]) * cs, cy = c[0] - b[0];
          const L = Math.hypot(cx - ax, cy - ay);
          if (L > 0 && Math.abs(a[1] - b[1]) < 5 && Math.abs(c[1] - b[1]) < 5 &&
              Math.abs(ax * (cy - ay) - ay * (cx - ax)) / L * KM_PER_DEG > 5) continue;
        }
        keep.push(b);
      }
      return keep.length >= 4 ? keep : ring;
    }

    const NH = nrow * ncol, NE = 2 * NH;
    const nb1 = new Int32Array(NE), nb2 = new Int32Array(NE);
    const seen = new Uint8Array(NE);
    const out = [];
    let vertices = 0, fallbacks = 0, jumps = 0;

    const visOut = [];
    for (const job of jobs) {
    val = job.lat.val; kAt = job.lat.kAt; FLD = job.lat.F;
    for (const level of job.levels) {
      nb1.fill(-1); nb2.fill(-1); seen.fill(0);
      const link = (a, b) => {
        if (nb1[a] < 0) nb1[a] = b; else nb2[a] = b;
        if (nb1[b] < 0) nb1[b] = a; else nb2[b] = a;
      };
      for (let r = 0; r < nrow - 1; r++) {
        for (let c = 0; c < ncol - 1; c++) {
          const tl = val[r * ncol + c], tr = val[r * ncol + c + 1];
          const bl = val[(r + 1) * ncol + c], br = val[(r + 1) * ncol + c + 1];
          const idx = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0)
                    | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
          let segs = MS_CASE[idx];
          if (segs === null) {
            // Saddle. The centre decides whether the interior runs through
            // the middle (and then what gets separated are the two outer
            // corners) or the other way round. Either choice gives closed
            // curves; what it cannot do is be decided differently in
            // neighbouring cells.
            const mid = (tl + tr + br + bl) / 4;
            segs = (mid >= level) ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
            if (idx === 10) segs = (mid >= level) ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
          }
          if (!segs.length) continue;
          const E = [r * ncol + c, NH + r * ncol + c + 1,
                     (r + 1) * ncol + c, NH + r * ncol + c];
          for (const sg of segs) link(E[sg[0]], E[sg[1]]);
        }
      }

      // Every cut edge belongs to exactly two cells, so it has degree two and
      // everything walked is a closed ring.
      const rings = [];
      for (let e = 0; e < NE; e++) {
        if (nb1[e] < 0 || seen[e]) continue;
        const chain = [];
        let cur = e, prev = -1;
        while (cur >= 0 && !seen[cur]) {
          seen[cur] = 1; chain.push(cur);
          const a = nb1[cur], b = nb2[cur];
          cur = (a !== prev && a >= 0 && !seen[a]) ? a
              : ((b !== prev && b >= 0 && !seen[b]) ? b : -1);
          prev = chain[chain.length - 1];
        }
        if (chain.length < 3) continue;
        const ring = [];
        for (const id of chain) {
          const h = id < NH;
          const q = h ? id : id - NH;
          const r0 = (q / ncol) | 0, c0 = q % ncol;
          const r1 = h ? r0 : r0 + 1, c1 = h ? c0 + 1 : c0;
          const v0 = val[r0 * ncol + c0], v1 = val[r1 * ncol + c1];
          const la0 = lats[r0], lo0 = lons[c0], la1 = lats[r1], lo1 = lons[c1];
          let t = (v1 === v0) ? 0.5 : (level - v0) / (v1 - v0), jump = 0;
          // Refinement. Only between real nodes: on the frame there is no
          // function to refine, and that part of the ring falls outside the
          // map anyway.
          const real = r0 >= 1 && r0 <= nlat + 2 && c0 >= 1 && c0 <= nlon + 2
                    && r1 >= 1 && r1 <= nlat + 2 && c1 >= 1 && c1 <= nlon + 2;
          if (real) {
            const kh = [kAt[r0 * ncol + c0], kAt[r1 * ncol + c1]];
            const fOf = k => u => FLD(la0 + u * (la1 - la0), lo0 + u * (lo1 - lo0), k) - level;
            const run = f => {
              let a = 0, b = 1, fa = f(0);
              if ((fa < 0) === (f(1) < 0)) return null;
              for (let it = 0; it < 14; it++) {
                const u = (a + b) / 2, fu = f(u);
                if ((fa < 0) === (fu < 0)) { a = u; fa = fu; } else { b = u; }
              }
              const u = (a + b) / 2;
              return { u, res: Math.abs(f(u)) };
            };
            // No sign change does not mean there is none: the time hint can
            // pull the value at one end below the level. Before giving up,
            // the full sweep.
            let r = run(fOf(kh)) || run(fOf(-1));
            // A large residual at the end means one of two things, and they
            // have to be told apart before drawing. Either the time hint did
            // not hold in the middle of the edge -- it happens: the ends
            // bring it from their own cell and in between another hump can
            // govern -- or the boundary really is a jump. The cut is redone
            // with the full sweep, which depends on no hint; if it still
            // does not close, it is a jump and gets marked. A few dozen
            // edges per eclipse, so the full sweep there does not show.
            if (r && r.res > 1e-3) {
              const r2 = run(fOf(-1));
              if (r2) r = r2;
              if (r.res > 1e-3) { jump = 1; jumps++; }
            }
            if (r) t = r.u; else fallbacks++;
          }
          ring.push(jump ? [la0 + t * (la1 - la0), lo0 + t * (lo1 - lo0), 0, 1, la0, lo0, la1, lo1]
                         : [la0 + t * (la1 - la0), lo0 + t * (lo1 - lo0)]);
        }
        vertices += ring.length;
        // Smooth BEFORE subdividing. The other way round, the subdivision has
        // already seeded the zigzag with intermediate points the smoothing
        // does not touch -- it only moves jump vertices -- and the tooth
        // survives, held up by its own children.
        const sm = smoothJumps(ring);
        rings.push(tolKm > 0 ? densify(sm, level) : sm);
      }
      // Drop the unrefinable-segment marker: it is densify() scaffolding and
      // has no business in the result, where Leaflet would read it as an
      // altitude.
      const clean = rings.map(r => r.map(q => [q[0], q[1]]));
      if (job.vis) visOut.push.apply(visOut, clean); else out.push(clean);
    }
    }
    let total = 0;
    for (const rr of out) for (const r of rr) total += r.length;
    for (const r of visOut) total += r.length;
    return { levels, rings: out, visible: visOut, vertices: total, coarse: vertices,
             fallbacks, jumps, grid: G };
  }

  return { evaluate, axisPoint, project, local, observer, geom, altaz, utcOf,
           maxObscuration, obsAt, visMargin, visAt, contours, BAND_LEVELS,
           obscuration, magnitude, centralLine, limits, penumbraOutline, obscurationGrid };
})();

if (typeof module !== 'undefined') module.exports = Bess;
