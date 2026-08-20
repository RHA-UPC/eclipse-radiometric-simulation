/*
 * eclipse-radiometric-simulation — solar video stabiliser, in the browser
 * Copyright (C) 2026 Ricardo Heredia Alessandrello
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * A port of tools/stab_solar.py to plain JavaScript, so that the video never
 * has to leave the machine it was filmed on. Same decisions, same reasons; the
 * long version of why each one is what it is lives in the Python file.
 *
 * The short version. A generic stabiliser tracks background features and an
 * eclipse filmed against a dark sky has none. The brightness centroid, the
 * usual planetary-imaging fallback, is worse than useless: the centroid of a
 * crescent sits inside the lit sliver and marches towards the uncovered limb
 * as the Moon advances, so the stabilised Sun would drift by most of a solar
 * radius over the partial phase, in step with the eclipse it is meant to hold
 * still. What stays put is the limb, an arc of constant radius about the solar
 * centre whatever the coverage. So: fit a circle to that arc, ignore
 * everything inside it, and translate each frame by what the fit says.
 *
 * Three regimes, because the thing being tracked changes:
 *   0  the photosphere limb, which saturates and nothing else in frame does
 *   1  the Moon's disk as a hole inside the corona, during totality
 *   2  the Moon's disk against a lit sky, where the photosphere blooms past
 *      its own limb and a threshold would trace the flare instead
 *
 * One thing the Python version does not have to do: guess the scale. It was
 * written for one camera and one framing, with the solar radius hard-coded at
 * 110 px. Here the footage can be anything, so the radius is measured from the
 * first frame that has a usable Sun in it and refined from then on.
 */
const Stab = (() => {
  'use strict';

  const THR_PHOT = 200;    // the photosphere saturates; nothing else gets near
  const BRIGHT_SKY = 30;   // median level above which the sky, not the Sun, is lit
  const CORONA_THR = 60;   // closes the corona ring once the camera has opened up
  const MIN_PIX = 150;     // lit pixels before a fit is worth attempting
  const MIN_EDGE = 30;     // limb points needed to constrain a three-parameter circle
  const TOL_SCHEDULE = [10, 6, 3, 2, 2];   // annulus half-width per iteration, px
  const JUMP_MAX = 40;     // a centre moving more than this in one frame is lock loss
  const REACQUIRE = 25;    // frames after which the last centre is too stale to seed

  /* ---- small image plumbing ------------------------------------------- */

  // Grey as the MAXIMUM of the three channels, not a luminance mix. A clipped
  // photosphere pins all three; a red-filtered one pins only red, and a
  // luminance mix would drag that back down below the threshold.
  function grey(rgba, w, h) {
    const g = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < g.length; i++, j += 4) {
      const r = rgba[j], gr = rgba[j + 1], b = rgba[j + 2];
      g[i] = r > gr ? (r > b ? r : b) : (gr > b ? gr : b);
    }
    return g;
  }

  // Box average by an integer factor, which is what INTER_AREA does when the
  // factor divides evenly and is the only resampling that does not alias a
  // hard limb into a ring of false edges.
  function shrink(g, w, h, s) {
    const W = Math.floor(w / s), H = Math.floor(h / s);
    const out = new Float32Array(W * H), n = s * s;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let j = 0; j < s; j++) {
          const row = (y * s + j) * w + x * s;
          for (let i = 0; i < s; i++) acc += g[row + i];
        }
        out[y * W + x] = acc / n;
      }
    }
    return { d: out, w: W, h: H };
  }

  function blur(src, w, h, sigma) {
    const r = Math.max(1, Math.ceil(3 * sigma)), k = new Float32Array(2 * r + 1);
    let sum = 0;
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); sum += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= sum;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += k[i + r] * src[y * w + Math.min(w - 1, Math.max(0, x + i))];
        tmp[y * w + x] = a;
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let a = 0;
        for (let i = -r; i <= r; i++) a += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
        out[y * w + x] = a;
      }
    return out;
  }

  // Scharr, not Sobel: the same 3x3 cost with a much flatter response to edge
  // orientation, which matters when what is being scored is a circle.
  function scharr(src, w, h) {
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    const at = (x, y) => src[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        gx[y * w + x] = 3 * (at(x + 1, y - 1) - at(x - 1, y - 1))
                     + 10 * (at(x + 1, y) - at(x - 1, y))
                      + 3 * (at(x + 1, y + 1) - at(x - 1, y + 1));
        gy[y * w + x] = 3 * (at(x - 1, y + 1) - at(x - 1, y - 1))
                     + 10 * (at(x, y + 1) - at(x, y - 1))
                      + 3 * (at(x + 1, y + 1) - at(x + 1, y - 1));
      }
    return { gx, gy };
  }

  /* ---- circle fitting -------------------------------------------------- */

  // Kasa 1976: least squares on x^2 + y^2 = Dx + Ey + F, which is linear in the
  // three unknowns and therefore has a closed form. It is biased towards small
  // radii when the arc is short, which is why the caller keeps trimming and
  // refitting rather than trusting one pass.
  function kasa(xs, ys, keep) {
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
    for (let i = 0; i < xs.length; i++) {
      if (keep && !keep[i]) continue;
      const x = xs[i], y = ys[i], z = x * x + y * y;
      n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
      sz += z; sxz += x * z; syz += y * z;
    }
    if (n < 3) return null;
    // Normal equations of [x y 1] * [D E F]' = z, solved by Cramer.
    const m = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
    const v = [sxz, syz, sz];
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
              - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
              + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    if (!isFinite(det) || Math.abs(det) < 1e-9) return null;
    const col = (c) => m.map((row, i) => row.map((val, j) => (j === c ? v[i] : val)));
    const d3 = (a) => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
                    - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
                    + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
    const D = d3(col(0)) / det, E = d3(col(1)) / det, F = d3(col(2)) / det;
    const cx = D / 2, cy = E / 2;
    const rr = F + cx * cx + cy * cy;
    if (!(rr > 0)) return null;
    return { cx, cy, r: Math.sqrt(rr), n };
  }

  /* ---- coarse acquisition ---------------------------------------------- */

  // Where a FILLED disk of radius r covers the most lit pixels.
  //
  // Filled, not a ring. Solar and lunar limbs share a radius to within a few
  // per cent, so a ring accumulator peaks equally on both centres and cannot
  // tell them apart; only the solar centre has the whole crescent inside its
  // disk. The peak is a plateau rather than a point, because the trial disk is
  // larger than the true one, so the centroid of the tie is taken: on a thin
  // crescent that is worth up to 20 px, and starting the limb fit that far out
  // lets it converge on the wrong circle.
  //
  // Row prefix sums make the disk cost 2r lookups instead of pi*r*r.
  function coarse(mask, w, h, r) {
    const R = Math.max(2, Math.round(r));
    if (2 * R + 1 >= w || 2 * R + 1 >= h) return null;
    const ps = new Float32Array((w + 1) * h);
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = 0; x < w; x++) { acc += mask[y * w + x]; ps[y * (w + 1) + x + 1] = acc; }
    }
    const half = new Int32Array(2 * R + 1);
    for (let dy = -R; dy <= R; dy++) half[dy + R] = Math.floor(Math.sqrt(R * R - dy * dy));
    let best = -1, sx = 0, sy = 0, n = 0;
    for (let cy = R; cy < h - R; cy++) {
      for (let cx = R; cx < w - R; cx++) {
        let acc = 0;
        for (let dy = -R; dy <= R; dy++) {
          const hx = half[dy + R], row = (cy + dy) * (w + 1);
          acc += ps[row + Math.min(w, cx + hx + 1)] - ps[row + Math.max(0, cx - hx)];
        }
        if (acc > best * 1.000001) { best = acc; sx = cx; sy = cy; n = 1; }
        else if (acc >= best * 0.999) { sx += cx; sy += cy; n++; }
      }
    }
    return best <= 0 ? null : { cx: sx / n, cy: sy / n, score: best };
  }

  /* ---- the dark lunar disk against a lit sky --------------------------- */

  // Against a bright sky the emerging photosphere is useless as a reference: it
  // blooms far past its own limb, so a threshold traces the flare rather than
  // the Sun. The Moon does not bloom -- it is a black disk of fixed radius and
  // its edge survives intact right next to the glare.
  //
  // Polarity separates the two. Going outward, the lunar limb steps dark to
  // bright and the bloom boundary bright to dark, so scoring the SIGNED radial
  // gradient around a ring keeps one and rejects the other; an unsigned Hough
  // scores both alike and settles on whichever is brighter.
  const ringCache = new Map();
  function ring(r) {
    let k = ringCache.get(r);
    if (k) return k;
    const pts = [];
    for (let dy = -r - 1; dy <= r + 1; dy++)
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const d = Math.hypot(dx, dy);
        if (Math.abs(d - r) < 1) pts.push([dx, dy, dx / Math.max(d, 1e-6), dy / Math.max(d, 1e-6)]);
      }
    k = { pts, w: 1 / Math.max(pts.length, 1) };
    ringCache.set(r, k);
    return k;
  }

  function darkDisk(g, w, h, r, centre, scale, span) {
    const sm = shrink(g, w, h, scale);
    const b = blur(sm.d, sm.w, sm.h, 1.5);
    const { gx, gy } = scharr(b, sm.w, sm.h);
    const R = Math.max(2, Math.round(r / scale));
    if (2 * R + 3 >= sm.w || 2 * R + 3 >= sm.h) return null;
    const k = ring(R);
    let x0 = R + 1, x1 = sm.w - R - 2, y0 = R + 1, y1 = sm.h - R - 2;
    if (centre) {
      x0 = Math.max(x0, Math.round(centre[0] / scale) - span);
      x1 = Math.min(x1, Math.round(centre[0] / scale) + span);
      y0 = Math.max(y0, Math.round(centre[1] / scale) - span);
      y1 = Math.min(y1, Math.round(centre[1] / scale) + span);
    }
    if (x1 < x0 || y1 < y0) return null;
    const sw = x1 - x0 + 1, sh = y1 - y0 + 1;
    const sc = new Float32Array(sw * sh);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        let acc = 0;
        for (let i = 0; i < k.pts.length; i++) {
          const p = k.pts[i], idx = (y + p[1]) * sm.w + (x + p[0]);
          acc += gx[idx] * p[2] + gy[idx] * p[3];
        }
        sc[(y - y0) * sw + (x - x0)] = acc * k.w;
      }
    let best = -Infinity, bx = 0, by = 0;
    for (let i = 0; i < sc.length; i++) if (sc[i] > best) { best = sc[i]; bx = i % sw; by = (i / sw) | 0; }
    // Sub-grid peak by a parabola through the three samples, in each axis.
    const par = (a, b2, c) => {
      const den = a - 2 * b2 + c;
      return (!isFinite(den) || den === 0) ? 0 : Math.max(-1, Math.min(1, 0.5 * (a - c) / den));
    };
    const dx = (bx > 0 && bx < sw - 1)
      ? par(sc[by * sw + bx - 1], sc[by * sw + bx], sc[by * sw + bx + 1]) : 0;
    const dy = (by > 0 && by < sh - 1)
      ? par(sc[(by - 1) * sw + bx], sc[by * sw + bx], sc[(by + 1) * sw + bx]) : 0;
    return { cx: (x0 + bx + dx) * scale, cy: (y0 + by + dy) * scale, score: best };
  }

  /* ---- the photosphere limb -------------------------------------------- */

  // Trimmed least squares: keep only edge points within a tolerance of the
  // current radius, refit, tighten, repeat. The annulus is what discards the
  // lunar limb cutting across the crescent -- a different circle about a
  // different centre -- and it has to tighten, because a wide annulus still
  // admits the stretch of lunar limb that happens to pass at roughly the solar
  // radius, and a tenth of the points on the wrong circle drags the centre by
  // pixels.
  function fitLimb(g, w, h, thr, r, centre, band) {
    const mask = new Uint8Array(w * h);
    let lit = 0;
    for (let i = 0; i < mask.length; i++) if (g[i] >= thr) { mask[i] = 1; lit++; }
    if (lit < MIN_PIX) return null;
    let cx, cy;
    if (centre) { cx = centre[0]; cy = centre[1]; }
    else {
      const s = 2, sm = shrink(mask, w, h, s);
      const c = coarse(sm.d, sm.w, sm.h, r / s);
      if (!c) return null;
      cx = c.cx * s; cy = c.cy * s;
    }
    // Morphological gradient of a binary mask is just the mixed neighbourhoods.
    const xs = [], ys = [];
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x, v = mask[i];
        if (v !== mask[i - 1] || v !== mask[i + 1] || v !== mask[i - w] || v !== mask[i + w]) {
          xs.push(x); ys.push(y);
        }
      }
    if (xs.length < MIN_EDGE) return null;
    let keep = null, fit = { cx, cy, r };
    for (const tol of TOL_SCHEDULE) {
      keep = new Uint8Array(xs.length);
      let n = 0;
      for (let i = 0; i < xs.length; i++)
        if (Math.abs(Math.hypot(xs[i] - fit.cx, ys[i] - fit.cy) - fit.r) < tol) { keep[i] = 1; n++; }
      if (n < MIN_EDGE) return null;
      const f = kasa(xs, ys, keep);
      if (!f || !(f.r > band[0] && f.r < band[1])) return null;
      fit = f;
    }
    return { cx: fit.cx, cy: fit.cy, r: fit.r, n: fit.n };
  }

  // Dark pixels the border cannot reach: during totality, the Moon's disk.
  function enclosed(g, w, h, thr) {
    const bright = new Uint8Array(w * h);
    for (let i = 0; i < bright.length; i++) bright[i] = g[i] >= thr ? 1 : 0;
    const seen = new Uint8Array(w * h);
    const stack = [];
    const push = i => { if (!seen[i] && !bright[i]) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (y > 0) push(i - w);
      if (y < h - 1) push(i + w);
    }
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < bright.length; i++)
      if (!bright[i] && !seen[i]) { n++; sx += i % w; sy += (i / w) | 0; }
    return { n, cx: sx / Math.max(n, 1), cy: sy / Math.max(n, 1) };
  }

  /* ---- one frame ------------------------------------------------------- */

  // The hole test comes first because totality also saturates plenty of pixels,
  // so a photosphere threshold alone cannot tell the two apart: past second
  // contact it latches onto the brightest patch of inner corona, whose outer
  // edge is neither circular nor fixed, and wanders by a hundred pixels as the
  // camera's automatic exposure opens up.
  function locate(g, w, h, r, centre, scale) {
    const band = [0.6 * r, 1.7 * r];
    // Median by histogram: the frames are large and a sort is not worth it.
    const hist = new Int32Array(256);
    for (let i = 0; i < g.length; i++) hist[g[i]]++;
    let acc = 0, med = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= g.length / 2) { med = v; break; } }
    if (med > BRIGHT_SKY) {
      const res = darkDisk(g, w, h, r, centre, scale, 30);
      return res ? { cx: res.cx, cy: res.cy, r, regime: 2 } : null;
    }
    const hole = enclosed(g, w, h, CORONA_THR);
    if (hole.n >= Math.PI * band[0] * band[0] * 0.6) {
      const req = Math.sqrt(hole.n / Math.PI);
      if (req > band[0] && req < band[1]) return { cx: hole.cx, cy: hole.cy, r: req, regime: 1 };
    }
    const res = fitLimb(g, w, h, THR_PHOT, r, centre, band);
    return res ? { cx: res.cx, cy: res.cy, r: res.r, regime: 0 } : null;
  }

  // First lock: the scale is unknown, so it is measured. The bounding box of
  // the lit region is the solar DIAMETER whatever the phase -- a crescent is
  // thin but it still spans the limb from horn to horn -- which is a good
  // enough seed for the fit to take over.
  function bootstrap(g, w, h) {
    let x0 = w, x1 = -1, y0 = h, y1 = -1, n = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (g[y * w + x] >= THR_PHOT) {
          n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    if (n < MIN_PIX) return null;
    return Math.max(x1 - x0, y1 - y0) / 2;
  }

  /* ---- the whole track ------------------------------------------------- */

  // No smoothing beyond outlier rejection, on purpose. The tripod shake is real
  // motion and removing it is the point; smoothing the measured track would
  // subtract a smoothed position and leave the shake in the output.
  function clean(track, medWin, maxDev) {
    medWin = medWin || 9; maxDev = maxDev || 12;
    const n = track.length, out = [];
    for (const key of ['cx', 'cy']) {
      const v = new Float64Array(n);
      const good = new Uint8Array(n);
      for (let i = 0; i < n; i++) { good[i] = track[i] ? 1 : 0; if (track[i]) v[i] = track[i][key]; }
      let filled = interp(v, good, n);
      const med = new Float64Array(n), half = medWin >> 1, buf = [];
      for (let i = 0; i < n; i++) {
        buf.length = 0;
        for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) buf.push(filled[j]);
        buf.sort((a, b) => a - b);
        med[i] = buf[buf.length >> 1];
      }
      const good2 = new Uint8Array(n);
      for (let i = 0; i < n; i++) good2[i] = (good[i] && Math.abs(filled[i] - med[i]) < maxDev) ? 1 : 0;
      out.push(interp(v, good2, n));
    }
    return { cx: out[0], cy: out[1] };
  }

  function interp(v, good, n) {
    const idx = [];
    for (let i = 0; i < n; i++) if (good[i]) idx.push(i);
    if (idx.length < 2) return null;
    const out = new Float64Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) {
      while (k + 1 < idx.length && idx[k + 1] < i) k++;
      const a = idx[k], b = idx[Math.min(k + 1, idx.length - 1)];
      if (i <= a) out[i] = v[a];
      else if (i >= b) out[i] = v[b];
      else out[i] = v[a] + (v[b] - v[a]) * (i - a) / (b - a);
    }
    return out;
  }

  /* Largest window of the given aspect that holds the Sun dead centre in every
     frame. Shifting a frame exposes blank edges; against a dark sky nobody
     sees them, against a lit one they read as broken.

     Centring is the binding constraint, not the travel: the window has to sit
     symmetric about the Sun in every frame, so its half-width cannot exceed
     the Sun's closest approach to any edge. A Sun framed low in the shot
     therefore costs height, however much unused sky sits above it. */
  function fitWindow(cx, cy, w, h, aspect) {
    aspect = aspect || 16 / 9;
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < cx.length; i++) {
      if (cx[i] < xmin) xmin = cx[i]; if (cx[i] > xmax) xmax = cx[i];
      if (cy[i] < ymin) ymin = cy[i]; if (cy[i] > ymax) ymax = cy[i];
    }
    let ow = 2 * Math.min(xmin, w - xmax);
    const oh0 = 2 * Math.min(ymin, h - ymax);
    ow = Math.min(ow, oh0 * aspect);
    ow = Math.max(2, Math.floor(ow / 2) * 2);
    const oh = Math.max(2, Math.floor(ow / aspect / 2) * 2);
    return { w: ow, h: oh, tx: ow / 2, ty: oh / 2 };
  }

  return { grey, locate, bootstrap, clean, fitWindow, fitLimb, darkDisk, coarse,
           kasa, enclosed, shrink,
           K: { THR_PHOT, BRIGHT_SKY, CORONA_THR, JUMP_MAX, REACQUIRE, MIN_PIX } };
})();

if (typeof module !== 'undefined') module.exports = Stab;
