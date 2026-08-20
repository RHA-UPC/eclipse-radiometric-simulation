/*
 * eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
 *
 * The browser stabiliser against the same synthetic cases as the Python one,
 * because a port that agrees on prose and disagrees on numbers is worse than
 * no port. Every case here exists in tools/stab_solar.py `_selftest`, with the
 * same tolerances, so the two can be compared line by line.
 */
const Stab = require('./stabilise.js');

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log('FAIL ' + msg); fails++; } };
const near = (a, b, tol, msg) =>
  ok(Math.abs(a - b) < tol, `${msg}: ${a.toFixed(3)} against ${b} (tolerance ${tol})`);

// --- a minimal canvas: filled disks over a greyscale image -----------------
const img = (w, h, v) => ({ w, h, d: new Uint8Array(w * h).fill(v || 0) });
function disc(im, cx, cy, r, v) {
  for (let y = Math.max(0, Math.ceil(cy - r)); y <= Math.min(im.h - 1, cy + r); y++)
    for (let x = Math.max(0, Math.ceil(cx - r)); x <= Math.min(im.w - 1, cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) im.d[y * im.w + x] = v;
}
function gauss(im, sigma) {
  const out = new Uint8Array(im.d.length);
  const r = Math.ceil(3 * sigma), k = [];
  let s = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); s += v; }
  const tmp = new Float64Array(im.d.length);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++)
      a += k[i + r] * im.d[y * im.w + Math.min(im.w - 1, Math.max(0, x + i))];
    tmp[y * im.w + x] = a / s;
  }
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++)
      a += k[i + r] * tmp[Math.min(im.h - 1, Math.max(0, y + i)) * im.w + x];
    out[y * im.w + x] = Math.round(a / s);
  }
  im.d = out;
  return im;
}

// ---------------------------------------------------------------------------
// 1. The synthetic occultation. The limb fit has to hold the centre the
//    centroid loses, which is the entire reason this module exists.
// ---------------------------------------------------------------------------
{
  const TX = 200, TY = 190, R = 105;
  let worstFit = 0, bestCentroid = Infinity;
  // No Moon, then three separations. With equal radii the lit crescent is d
  // wide, so the last case leaves a 15 px sliver: past that the arc is too
  // short to constrain a circle, which is exactly where the real video goes
  // black anyway.
  for (const d of [null, 90, 40, 15]) {
    const im = img(400, 400);
    disc(im, TX, TY, R, 255);
    if (d !== null) disc(im, TX + d, TY, R, 0);
    const res = Stab.fitLimb(im.d, im.w, im.h, Stab.K.THR_PHOT, R, null, [0.6 * R, 1.7 * R]);
    ok(res, `no fit at d=${d}`);
    if (!res) continue;
    const err = Math.hypot(res.cx - TX, res.cy - TY);
    ok(err < 1.0, `d=${d}: the centre drifts ${err.toFixed(2)} px`);
    near(res.r, R, 2.0, `d=${d}: radius`);
    worstFit = Math.max(worstFit, err);
    if (d !== null) {
      let n = 0, sx = 0, sy = 0;
      for (let i = 0; i < im.d.length; i++)
        if (im.d[i] >= Stab.K.THR_PHOT) { n++; sx += i % im.w; sy += (i / im.w) | 0; }
      bestCentroid = Math.min(bestCentroid, Math.hypot(sx / n - TX, sy / n - TY));
    }
  }
  // The reason this is not four lines of image moments.
  ok(bestCentroid > 20, `the centroid is only off by ${bestCentroid.toFixed(0)} px`);
  console.log(`  limb <= ${worstFit.toFixed(2)} px, centroid >= ${bestCentroid.toFixed(0)} px`);
}

// ---------------------------------------------------------------------------
// 2. The three regimes. A corona around a dark Moon has to read as regime 1,
//    and a crescent can never read that way, or the tail of the video tracks
//    the wrong thing.
// ---------------------------------------------------------------------------
{
  const R = 105;
  const tot = img(400, 400);
  disc(tot, 210, 180, R * 1.5, 120);
  disc(tot, 210, 180, R, 0);
  const r1 = Stab.locate(tot.d, tot.w, tot.h, R, null, 2);
  ok(r1 && r1.regime === 1, `totality read as regime ${r1 && r1.regime}`);
  if (r1) ok(Math.hypot(r1.cx - 210, r1.cy - 180) < 1.0, 'the centre of totality');

  const cre = img(400, 400);
  disc(cre, 200, 190, R, 255);
  disc(cre, 240, 190, R, 0);
  const r0 = Stab.locate(cre.d, cre.w, cre.h, R, null, 2);
  ok(r0 && r0.regime === 0, `crescent read as regime ${r0 && r0.regime}`);

  // Lit sky: the Moon has to beat a bloom edge of opposite polarity and
  // comparable strength, which is the case an unsigned Hough gets backwards.
  const sky = img(500, 500, 90);
  disc(sky, 330, 250, 160, 230);
  disc(sky, 200, 250, R, 20);
  gauss(sky, 3.0);
  const r2 = Stab.locate(sky.d, sky.w, sky.h, R, null, 2);
  ok(r2 && r2.regime === 2, `lit sky read as regime ${r2 && r2.regime}`);
  if (r2) ok(Math.hypot(r2.cx - 200, r2.cy - 250) < 3.0,
             `the Moon against a lit sky drifts ${Math.hypot(r2.cx - 200, r2.cy - 250).toFixed(1)} px`);
}

// ---------------------------------------------------------------------------
// 3. The crop. That it centres the Sun and that no frame runs off the source
//    is checked directly, which is cheaper than checking the arithmetic that
//    produced it.
// ---------------------------------------------------------------------------
{
  const cx = [974, 1230], cy = [689, 880];
  const f = Stab.fitWindow(cx, cy, 1920, 1080);
  near(f.w / f.h, 16 / 9, 0.02, 'window aspect ratio');
  near(f.tx, f.w / 2, 1.0, 'the Sun centred in x');
  near(f.ty, f.h / 2, 1.0, 'the Sun centred in y');
  for (let i = 0; i < cx.length; i++) {
    ok(cx[i] - f.tx >= 0 && (f.w - 1) - f.tx + cx[i] <= 1919, `frame ${i} runs off in x`);
    ok(cy[i] - f.ty >= 0 && (f.h - 1) - f.ty + cy[i] <= 1079, `frame ${i} runs off in y`);
  }
}

// ---------------------------------------------------------------------------
// 4. Outlier rejection has to survive one wild fit and a run of untracked
//    frames.
// ---------------------------------------------------------------------------
{
  const track = [];
  for (let i = 0; i < 60; i++) track.push({ cx: i * 0.5 + 100, cy: 50 });
  for (let i = 20; i < 30; i++) track[i] = null;
  track[40] = { cx: 900, cy: 50 };
  const c = Stab.clean(track);
  let peor = 0;
  for (let i = 0; i < 60; i++) {
    peor = Math.max(peor, Math.abs(c.cx[i] - (i * 0.5 + 100)), Math.abs(c.cy[i] - 50));
  }
  ok(peor < 1e-6, `the cleaning leaves ${peor.toFixed(3)} px of error`);
}

// ---------------------------------------------------------------------------
// 5. The scale is measured, not assumed: the same Sun filmed at two framings
//    has to give the same relative centre.
// ---------------------------------------------------------------------------
{
  for (const R of [40, 105, 200]) {
    const im = img(600, 600);
    disc(im, 300, 280, R, 255);
    disc(im, 300 + R * 0.6, 280, R, 0);
    const r0 = Stab.bootstrap(im.d, im.w, im.h);
    ok(r0 !== null && Math.abs(r0 - R) < 0.15 * R,
       `bootstrap at R=${R}: estimates ${r0 === null ? 'nothing' : r0.toFixed(0)}`);
    const res = Stab.locate(im.d, im.w, im.h, r0, null, 2);
    ok(res && Math.hypot(res.cx - 300, res.cy - 280) < 1.5,
       `R=${R}: the centre drifts ${res ? Math.hypot(res.cx - 300, res.cy - 280).toFixed(2) : 'nothing'} px`);
  }
}

console.log(fails ? `${fails} FAILURES` : 'stabilise.js OK — matches tools/stab_solar.py');
process.exit(fails ? 1 : 0);
