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
    // El Sol tiene que estar sobre el horizonte GEODESICO, que es con el que
    // local() decide si hay eclipse visible en el panel. zeta > 0 es el
    // horizonte geocentrico y sobre un elipsoide no es lo mismo: los dos
    // criterios discrepan hasta 0,091 grados de altura solar y, cerca del
    // ocaso, esos minutos valian 19 puntos de obscuracion entre la banda que
    // pintaba el mapa y la cifra que daba la ficha del mismo punto. Un mapa
    // que contradice a su propia respuesta es peor que un mapa tosco.
    if (Math.sin(o.p) * sd + Math.cos(o.p) * cd * cH <= 0) return 0;
    const zeta = o.rs * sd + o.rc * cH * cd;
    const L1 = poly(B.l1, t) - zeta * B.tan_f1;
    const m = Math.hypot(x - o.rc * Math.sin(H), y - (o.rs * cd - o.rc * cH * sd));
    if (m >= L1) return 0;
    const L2 = poly(B.l2, t) - zeta * B.tan_f2;
    return obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
  }

  function timeMax(B, o, k, nt, span) {
    span = span || T_SPAN;
    const at = t => obsAt(B, o, t);
    const T = kk => -span + 2 * span * kk / (nt - 1);
    let a = T(Math.max(0, k - 1)), b = T(Math.min(nt - 1, k + 1));
    const gr = 0.6180339887498949;
    let c = b - gr * (b - a), d = a + gr * (b - a), fc = at(c), fd = at(d);
    // Nueve pasos dejan el intervalo en el 1,3 % de sus 6,4 minutos, o sea
    // cinco segundos de tiempo. Cerca de un maximo suave eso son 1e-6 de
    // obscuracion; no compensa seguir. El valor del propio T(k) no se vuelve a
    // evaluar aqui: quien llama ya lo tiene del barrido grueso.
    for (let i = 0; i < 9; i++) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = at(c); }
      else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = at(d); }
    }
    return Math.max(fc, fd);
  }

  function obscurationGrid(B, nlon = 640, nlat = 320, nt = 121) {
    const grid = new Float32Array(nlon * nlat);
    // En que instante ocurre el maximo de cada celda. No lo usa el dibujo: lo
    // usa el afinado de los contornos, que asi puede mirar solo unos pocos
    // instantes alrededor en vez de barrer las seis horas otra vez. Es la
    // diferencia entre afinar un vertice en 4 us y en 18.
    const tmax = new Int16Array(nlon * nlat).fill(-1);
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
            // Horizonte geodesico, el mismo que obsAt y que local().
            if (Math.sin(r.p) * sd + Math.cos(r.p) * cd * cH <= 0) continue;
            const zeta = r.rs * sd + r.rc * cH * cd;
            const m = Math.hypot(e.x - r.rc * Math.sin(H), e.y - (r.rs * cd - r.rc * cH * sd));
            const L1 = e.l1 - zeta * B.tan_f1, L2 = e.l2 - zeta * B.tan_f2;
            if (m >= L1) continue;
            const o = obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
            const idx = j * nlon + i;
            if (o > grid[idx]) { grid[idx] = o; tmax[idx] = k; }
          }
        }
      }
    }

    // Segunda pasada: donde el eclipse es parcial, el maximo se afina en el
    // tiempo. Fuera de ahi no hace falta -- una celda en totalidad ya vale 1 y
    // una sin eclipse vale 0 -- asi que esto cuesta sobre el 20 % de la malla.
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
    return { grid, tmax, nlon, nlat, nt };
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
    opts = opts || {};
    const nt = opts.nt || 121, span = opts.span || T_SPAN;
    const o = opts.o || observer(B, lat, lon, 0);
    const at = t => obsAt(B, o, t);
    const T = k => -span + 2 * span * k / (nt - 1);
    let lo = 0, hi = nt - 1;
    if (opts.k >= 0) { lo = Math.max(0, opts.k - 2); hi = Math.min(nt - 1, opts.k + 2); }
    let best = 0, bk = -1;
    const scan = (a, b) => {
      for (let k = a; k <= b; k++) { const v = at(T(k)); if (v > best) { best = v; bk = k; } }
    };
    scan(lo, hi);
    // La pista viene de la celda mas cercana, y el instante del maximo salta
    // de una celda a la vecina justo al cruzar el terminador. Con la ventana
    // fija en k+-2, medido, 59 de 93 290 llamadas devolvian otra cosa que el
    // barrido entero, y una de ellas por 0,54 de obscuracion. Asi que la
    // ventana se ensancha mientras el maximo siga cayendo en su borde: en el
    // caso normal no cuesta nada, y donde la pista falla acaba barriendolo
    // todo. Esto sustituye ademas al respaldo anterior, que estaba mal escrito
    // y no se activaba nunca para k <= 2.
    while (lo > 0 && (bk < 0 || bk === lo)) { const n = Math.max(0, lo - 3); scan(n, lo - 1); lo = n; }
    while (hi < nt - 1 && (bk < 0 || bk === hi)) { const n = Math.min(nt - 1, hi + 3); scan(hi + 1, n); hi = n; }
    if (bk < 0) return 0;
    if (best >= 1) return 1;
    return Math.max(best, timeMax(B, o, bk, nt, span));
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
  // La banda mas exterior empieza en el 5 %, no en el 0,1 %.
  //
  // No es una eleccion estetica. Cerca del borde de la penumbra el eclipse
  // dura minutos, y el barrido de 121 instantes se lo pierde: medido contra un
  // barrido de 2001, la perdida llega a 0,0165 de obscuracion y 32 de 2227
  // puntos de la orla con eclipse se leen como cero. Un contorno del 0,1 %
  // persigue ahi una funcion que vale cero a trozos, y sale dentado. El 5 % da
  // tres veces de margen sobre esa perdida. Lo que queda por fuera son unos
  // 175 km de orla sobre una penumbra de 7000, y el limite de verdad ya esta
  // dibujado: es el contorno de la penumbra, la linea de trazos.
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
    // Diez pasadas y no siete: medido, la septima seguia insertando puntos en
    // 113 combinaciones de eclipse y nivel, o sea que el corte llegaba antes
    // que la convergencia. La subdivision solo trabaja donde hace falta, asi
    // que subir el tope no cuesta donde ya habia terminado.
    const maxDepth = opts.maxDepth === undefined ? 10 : opts.maxDepth;
    const G = opts.grid || obscurationGrid(B, opts.nlon || 400, opts.nlat || 200, opts.nt || 121);
    const nlon = G.nlon, nlat = G.nlat, nt = G.nt;
    // La retícula: marco, borde del mundo, centros de celda, borde, marco.
    //
    // El borde del mundo lleva valores REALES, calculados, no interpolados.
    // Sin él, la arista que une el último centro de celda con el marco de -1
    // se cortaba interpolando contra -1 sobre 1,35 grados, y ese corte caía
    // DENTRO del mapa: medido, hasta 66 km adentro por el antimeridiano y 39
    // por los polos, con la banda equivocada pintada ahí, en los 56 eclipses.
    // Con nodos reales en ±180 y ±90, todo cruce contra el marco cae en el
    // borde o más allá, que es donde se pretendía que cayera.
    const nrow = nlat + 4, ncol = nlon + 4;
    const dlat = 180 / nlat, dlon = 360 / nlon;

    const val = new Float32Array(nrow * ncol).fill(-1);
    const kAt = new Int16Array(nrow * ncol).fill(-1);
    const lats = new Float64Array(nrow), lons = new Float64Array(ncol);
    lats[0] = 90 + dlat; lats[1] = 90;
    lats[nlat + 2] = -90; lats[nlat + 3] = -90 - dlat;
    lons[0] = -180 - dlon; lons[1] = -180;
    lons[nlon + 2] = 180; lons[nlon + 3] = 180 + dlon;
    for (let j = 0; j < nlat; j++) lats[j + 2] = 90 - (j + 0.5) * dlat;
    for (let i = 0; i < nlon; i++) lons[i + 2] = -180 + (i + 0.5) * dlon;
    for (let j = 0; j < nlat; j++) {
      for (let i = 0; i < nlon; i++) {
        val[(j + 2) * ncol + i + 2] = G.grid[j * nlon + i];
        kAt[(j + 2) * ncol + i + 2] = G.tmax[j * nlon + i];
      }
    }
    const edge = (r, c, rIn, cIn) => {
      const kh = kAt[rIn * ncol + cIn];
      kAt[r * ncol + c] = kh;
      val[r * ncol + c] = maxObscuration(B, lats[r], lons[c], { nt, k: kh });
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

    // Instante del maximo en la celda mas cercana, como pista temporal para
    // un punto que no esta en la malla.
    const kNear = (la, lo) => {
      const j = Math.min(nlat - 1, Math.max(0, Math.floor((90 - la) / dlat)));
      const i = Math.min(nlon - 1, Math.max(0, Math.floor((lo + 180) / dlon)));
      return kAt[(j + 2) * ncol + i + 2];
    };

    // Punto del contorno sobre la normal a una cuerda, buscado a media cuerda
    // de distancia a cada lado. Devuelve null si ahi no hay cambio de signo,
    // que es lo que pasa sobre el terminador: alli el borde de la region es un
    // salto de la funcion y no una curva de nivel, y no hay nada que afinar.
    const onCurve = (level, a, b) => {
      const la = (a[0] + b[0]) / 2, lo = (a[1] + b[1]) / 2;
      if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
      const cs = Math.max(1e-6, Math.cos(la * D2R));
      const dx = (b[1] - a[1]) * cs, dy = b[0] - a[0];
      const L = Math.hypot(dx, dy);
      if (!(L > 0)) return null;
      const nx = -dy / L, ny = dx / L, kh = kNear(la, lo);
      // La normal se traza en distancia de arco y se devuelve a longitud
      // dividiendo por el coseno de la latitud. Cerca del polo ese coseno es
      // diminuto y un desplazamiento de un grado de arco se convierte en cien
      // de longitud: medido, salian vertices a 185 grados, fuera del dominio.
      // De ahi las dos guardas: el radio de busqueda no pasa de medio grado de
      // arco, y un resultado que se salga del marco se descarta.
      const at = u => [la + ny * u, lo + nx * u / cs];
      const inside = q => Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180;
      // Media cuerda a cada lado, que es lo que decia el comentario y lo que
      // hace falta: con una cuerda entera la biseccion podia engancharse a
      // OTRA rama del contorno que pasara cerca, y el anillo se cruzaba
      // consigo mismo. La curva verdadera se aparta de su cuerda mucho menos
      // que media cuerda, asi que si la raiz no esta ahi, no es esta.
      const R = Math.min(L / 2, 0.5);
      const f = u => { const q = at(u); return maxObscuration(B, q[0], q[1], { nt, k: kh }) - level; };
      let u0 = -R, u1 = R, f0 = f(u0);
      if ((f0 < 0) === (f(u1) < 0)) return null;
      for (let it = 0; it < 12; it++) {
        const u = (u0 + u1) / 2, fu = f(u);
        if ((f0 < 0) === (fu < 0)) { u0 = u; f0 = fu; } else { u1 = u; }
      }
      const q = at((u0 + u1) / 2);
      return inside(q) ? q : null;
    };

    // Subdivision adaptativa. La malla decide DONDE EMPIEZAN los vertices; la
    // tolerancia decide donde acaban. Para una curva muestreada a paso
    // constante, la distancia h de un vertice a la cuerda que une sus dos
    // vecinos es cuatro veces la flecha de un solo tramo, asi que h/4 estima
    // el error sin evaluar nada. Los tramos que se pasan de tolerancia reciben
    // un punto nuevo, y ese si se calcula contra la funcion real.
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
          // a[2] marca un tramo que ya se probo y no tiene raiz que afinar:
          // sobre el terminador el borde de la region es un salto, no una
          // curva de nivel. Sin esta marca se vuelve a sondear en cada pasada,
          // y la mitad del contorno de un eclipse va por el terminador.
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

    const NH = nrow * ncol, NE = 2 * NH;
    const nb1 = new Int32Array(NE), nb2 = new Int32Array(NE);
    const seen = new Uint8Array(NE);
    const out = [];
    let vertices = 0, fallbacks = 0;

    for (const level of levels) {
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
            // Silla de montar. El centro decide si el interior pasa por el
            // medio (y entonces lo que se separa son las dos esquinas de
            // fuera) o al reves. Cualquiera de las dos da curvas cerradas;
            // lo que no puede es decidirse distinto en celdas vecinas.
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

      // Cada arista cortada pertenece a exactamente dos celdas, asi que tiene
      // grado dos y todo lo que se recorre son anillos cerrados.
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
          let t = (v1 === v0) ? 0.5 : (level - v0) / (v1 - v0);
          // Afinado. Solo entre nodos reales: en el marco no hay funcion que
          // afinar, y esa parte del anillo cae fuera del mapa de todas formas.
          const real = r0 >= 1 && r0 <= nlat + 2 && c0 >= 1 && c0 <= nlon + 2
                    && r1 >= 1 && r1 <= nlat + 2 && c1 >= 1 && c1 <= nlon + 2;
          if (real) {
            const kh = v0 >= v1 ? kAt[r0 * ncol + c0] : kAt[r1 * ncol + c1];
            const f = u => maxObscuration(B, la0 + u * (la1 - la0), lo0 + u * (lo1 - lo0),
                                          { nt, k: kh }) - level;
            let a = 0, b = 1, fa = f(0), fb = f(1);
            if ((fa < 0) === (fb < 0)) { fallbacks++; }
            else {
              for (let it = 0; it < 10; it++) {
                const u = (a + b) / 2, fu = f(u);
                if ((fa < 0) === (fu < 0)) { a = u; fa = fu; } else { b = u; fb = fu; }
              }
              t = (a + b) / 2;
            }
          }
          ring.push([la0 + t * (la1 - la0), lo0 + t * (lo1 - lo0)]);
        }
        vertices += ring.length;
        rings.push(tolKm > 0 ? densify(ring, level) : ring);
      }
      // Fuera la marca de tramo no afinable: es andamiaje de densify() y no
      // tiene por que salir en el resultado, donde Leaflet la leeria como una
      // altitud.
      out.push(rings.map(r => r.map(q => [q[0], q[1]])));
    }
    let total = 0;
    for (const rr of out) for (const r of rr) total += r.length;
    return { levels, rings: out, vertices: total, coarse: vertices, fallbacks, grid: G };
  }

  return { evaluate, axisPoint, project, local, observer, geom, altaz, utcOf,
           maxObscuration, obsAt, contours, BAND_LEVELS,
           obscuration, magnitude, centralLine, limits, penumbraOutline, obscurationGrid };
})();

if (typeof module !== 'undefined') module.exports = Bess;
