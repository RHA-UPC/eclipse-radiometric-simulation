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
    return { m, L1: e.l1 - zeta * B.tan_f1, L2: e.l2 - zeta * B.tan_f2, d: e.d, H };
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
  function obscurationGrid(B, nlon = 640, nlat = 320, nt = 121) {
    const grid = new Float32Array(nlon * nlat);
    const dmu = dmuOf(B), rows = [];
    for (let j = 0; j < nlat; j++) {
      const lat = (90 - (j + 0.5) * 180 / nlat) * D2R;
      const N = 1 / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
      rows.push({ rc: N * Math.cos(lat), rs: N * (1 - E2) * Math.sin(lat) });
    }
    const clamp = c => c < -1 ? -1 : c > 1 ? 1 : c;
    for (let k = 0; k < nt; k++) {
      const t = -3.2 + 6.4 * k / (nt - 1), e = evaluate(B, t);
      const sd = Math.sin(e.d), cd = Math.cos(e.d);
      const base = (e.mu - dmu) * R2D;              // lon = H - (mu - dmu)
      for (let j = 0; j < nlat; j++) {
        const r = rows[j];
        let cmin = -r.rs * sd / (r.rc * cd), cmax = 1;   // the Sun is up
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
            const zeta = r.rs * sd + r.rc * cH * cd;
            if (zeta <= 0) continue;               // the Sun is below the horizon
            const m = Math.hypot(e.x - r.rc * Math.sin(H), e.y - (r.rs * cd - r.rc * cH * sd));
            const L1 = e.l1 - zeta * B.tan_f1, L2 = e.l2 - zeta * B.tan_f2;
            if (m >= L1) continue;
            const o = obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
            const idx = j * nlon + i;
            if (o > grid[idx]) grid[idx] = o;
          }
        }
      }
    }
    return { grid, nlon, nlat };
  }

  return { evaluate, axisPoint, project, local, observer, geom, altaz, utcOf,
           obscuration, magnitude, centralLine, limits, penumbraOutline, obscurationGrid };
})();

if (typeof module !== 'undefined') module.exports = Bess;
