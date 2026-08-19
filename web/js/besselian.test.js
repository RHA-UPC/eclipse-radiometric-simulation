// eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
//
// The JavaScript geometry has to agree with src/eclipsecat.py, which in turn is
// checked against DE440s and against NASA. Run: node web/js/besselian.test.js
//
// Written after an adversarial review found that the previous version left 17
// mutations alive, so most of what follows exists to kill a specific one. Where
// a check reads oddly, that is why: it is aimed at a bug, not at a number.
'use strict';
const fs = require('fs'), path = require('path');
const Bess = require('./besselian.js');
const ROOT = path.join(__dirname, '..', '..');
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/eclipses.json')));
const CIRC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/circumstances.json')));

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.error('FAIL ' + msg); fails++; } };
const close = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol,
  `${msg}: ${a} vs ${b} (tol ${tol})`);
const of = id => CAT.eclipses.find(e => e.id === id);
const D2R = Math.PI / 180;
const km = (a, b) => Math.hypot((a[0] - b[0]) * 111.19,
  (a[1] - b[1]) * 111.19 * Math.cos((a[0] + b[0]) / 2 * D2R));
const move = (p, d, brg) => [p[0] + d * Math.cos(brg) / 111.19,
  p[1] + d * Math.sin(brg) / (111.19 * Math.cos(p[0] * D2R))];

const E26 = of('2026-08-12'), B = E26.elements;

// ---------------------------------------------------------------------------
// 1. Local circumstances at the study site, against the project's own DE440s
//    solver. The end-to-end check: elements, observer transform, contact
//    root-finder and obscuration together, independent of NASA.
// ---------------------------------------------------------------------------
const S = CIRC.site;
const loc = Bess.local(B, S.lat_deg, S.lon_deg, S.elev_m);
ok(loc !== null, 'el emplazamiento del estudio ve el eclipse de 2026');
for (const c of ['C1', 'C2', 'C3', 'C4', 'MAX']) {
  const want = (CIRC.contacts[c].tt_jd - B.t0_TT_jd) * 24;
  close(loc[c].t * 3600, want * 3600, 1.5, `${c} (s desde t0)`);
}
close(loc.duration_s, (CIRC.contacts.C3.tt_jd - CIRC.contacts.C2.tt_jd) * 86400, 1.0, 'duración');
close(loc.magnitude, CIRC.contacts.MAX.magnitude, 2e-3, 'magnitud');
close(loc.obscuration, 1.0, 1e-9, 'obscuración');
close(loc.MAX.alt, CIRC.contacts.MAX.sun_alt_geometric_deg, 0.02, 'altura solar en el máximo');
close(loc.MAX.az, CIRC.contacts.MAX.sun_az_deg, 0.05, 'acimut solar en el máximo');
ok(Math.abs(loc.C2.utc - new Date(CIRC.contacts.C2.utc)) < 1500,
   `C2 UTC ${loc.C2.utc.toISOString()} vs ${CIRC.contacts.C2.utc}`);

// The observer transform must actually use the ellipsoid and the elevation.
// Both survived mutation before: sea level and 616 m differ by ~0.3 s of
// totality, and swapping the equatorial radius for the polar one by ~1 s.
ok(Math.abs(Bess.local(B, S.lat_deg, S.lon_deg, 0).duration_s - loc.duration_s) > 0.05,
   'la altura del observador tiene que cambiar la duración');

// ---------------------------------------------------------------------------
// 2. Contacts are named by how the curve crosses zero, not by root order.
//    2038-07-02 at 13 S 75 W has C1 at t = -3.26 h; a window that stops at 3.2
//    used to label the surviving root (C4) as C1, and the point 3 degrees west
//    was then reported as seeing no eclipse at all.
// ---------------------------------------------------------------------------
const E38 = of('2038-07-02').elements;
const p38 = Bess.local(E38, -13, -75, 0);
ok(p38 && p38.C1 && p38.C4, '2038-07-02 en 13 S 75 O debe tener C1 y C4');
ok(p38.C1.t < p38.MAX.t && p38.MAX.t < p38.C4.t,
   `orden de contactos roto: C1 ${p38.C1.t} MAX ${p38.MAX.t} C4 ${p38.C4.t}`);
const q38 = Bess.local(E38, -13, -78, 0);
ok(q38 && q38.visible_obscuration > 0.35,
   `13 S 78 O debe ver ~40 % y ve ${q38 && (q38.visible_obscuration * 100).toFixed(1)} %`);

// A contact named by root order rather than by crossing direction only shows up
// where the two disagree, so the invariant is swept instead of spot-checked:
// across the catalogue and a coarse global grid, a first contact must never be
// stamped after maximum, nor a last one before it.
{
  let bad = 0, seen = 0;
  for (const e of CAT.eclipses) {
    for (let la = -80; la <= 80; la += 20) {
      for (let lo = -180; lo < 180; lo += 40) {
        const r = Bess.local(e.elements, la, lo, 0);
        if (!r) continue;
        seen++;
        if ((r.C1 && r.C1.t > r.MAX.t) || (r.C4 && r.C4.t < r.MAX.t)
            || (r.C2 && r.C2.t > r.MAX.t) || (r.C3 && r.C3.t < r.MAX.t)) bad++;
      }
    }
  }
  ok(seen > 500, `el barrido solo encontro ${seen} puntos con eclipse`);
  ok(bad === 0, `${bad} de ${seen} puntos con contactos fuera de orden`);
}

// ---------------------------------------------------------------------------
// 3. Annularity. The inner contact is |m| = |L2'|; written as m + L2' = 0 it
//    has no root when L2' is positive, so every annular eclipse reported zero
//    seconds of annularity while still reporting the right magnitude. Nothing
//    caught it, because the whole suite only ever exercised a total eclipse.
//    Durations below are the published central ones.
// ---------------------------------------------------------------------------
for (const [id, la, lo, want] of [['2027-02-06', -31.30, -48.48, 471],
                                  ['2028-01-26', 2.96, -51.58, 627],
                                  ['2031-05-21', 8.93, 71.71, 326]]) {
  const r = Bess.local(of(id).elements, la, lo, 0);
  ok(r && r.central === 'annular', `${id} debe leerse como anular, no ${r && r.central}`);
  ok(r && r.duration_s > 0, `${id}: anularidad de duración cero`);
  close(r.duration_s, want, 12, `${id} duración de la anularidad`);
}
ok(loc.central === 'total', 'el eclipse de 2026 en el sitio es total, no anular');

// ---------------------------------------------------------------------------
// 4. A point outside the penumbra returns nothing rather than a small number.
// ---------------------------------------------------------------------------
ok(Bess.local(B, -33.87, 151.21, 0) === null, 'Sídney no ve nada del eclipse de 2026');

// ---------------------------------------------------------------------------
// 5. The drawn band must agree with the solver that answers the clicks. This
//    is the invariant, not a distance: on the edge the duration is zero, three
//    kilometres inside it is not, three kilometres outside it is zero again.
//    Ignoring the observer's own rotational velocity in the offset drew the
//    band up to 5 km too narrow on each side and broke exactly this.
// ---------------------------------------------------------------------------
for (const id of ['2026-08-12', '2027-08-02', '2045-08-12', '2027-02-06']) {
  const el = of(id).elements;
  for (const [k, arr] of Bess.limits(el, 'l2').edges.entries()) {
    const pts = arr.filter(Boolean);
    ok(pts.length > 50, `${id} borde ${k}: solo ${pts.length} puntos`);
    const p = pts[Math.floor(pts.length / 2)];
    const here = Bess.local(el, p[0], p[1], 0);
    ok(!here || here.duration_s < 1.0,
       `${id} borde ${k}: ${here && here.duration_s.toFixed(1)} s de fase central SOBRE el borde`);
    let inside = 0, outside = 1;
    for (let j = 0; j < 36; j++) {
      const brg = j * 10 * D2R;
      const a = Bess.local(el, ...move(p, -3, brg), 0);
      const b = Bess.local(el, ...move(p, 3, brg), 0);
      if (a && a.duration_s > 0 && (!b || b.duration_s === 0)) {
        inside = a.duration_s; outside = b ? b.duration_s : 0;
      }
    }
    ok(inside > 5 && outside === 0,
       `${id} borde ${k}: 3 km dentro ${inside.toFixed(1)} s, 3 km fuera ${outside.toFixed(1)} s`);
  }
}

// The site sits inside the band, and the manuscript measures 41,9 km to the
// northern limit perpendicular to the path. The nearest sampled point of an
// edge is never closer than that, and with 6 s sampling not much further.
const nearest = Bess.limits(B, 'l2').edges
  .flat().filter(Boolean).reduce((b, p) => Math.min(b, km([S.lat_deg, S.lon_deg], p)), 1e9);
ok(nearest >= 41.0 && nearest <= 47.0,
   `distancia del sitio al borde más cercano: ${nearest.toFixed(2)} km, se esperaba 42-47`);

// ---------------------------------------------------------------------------
// 6. Non-central eclipses. Between gamma 0.9972 and about 1.03 the axis misses
//    the Earth while the cone still clips the limb. Typing those by the axis
//    alone called them partial, so the map drew no band while a click inside
//    it reported totality: a map contradicting its own answer.
// ---------------------------------------------------------------------------
const E43 = of('2043-04-09');
ok(E43.type === 'total', `2043-04-09 es total no central, catalogado ${E43.type}`);
ok(E43.central === false, '2043-04-09 no tiene eje sobre la Tierra');
const nc = Bess.local(E43.elements, 61.82, 164.78, 0);
ok(nc && nc.obscuration > 0.999 && nc.duration_s > 0,
   `2043-04-09 en 61.82 N 164.78 E: obsc ${nc && nc.obscuration}, dur ${nc && nc.duration_s}`);
ok(CAT.eclipses.filter(e => e.type !== 'partial' && !e.central).length >= 1,
   'debe haber al menos un eclipse central no central en el catálogo');

// ---------------------------------------------------------------------------
// 7. Gamma carries a sign. Unsigned it matches no published catalogue and
//    throws away which hemisphere the eclipse belongs to.
// ---------------------------------------------------------------------------
close(of('2026-02-17').gamma, -0.9743, 1e-3, 'gamma de 2026-02-17 (anular antártico)');
close(of('2026-08-12').gamma, +0.8977, 1e-3, 'gamma de 2026-08-12');
close(of('2027-08-02').gamma, +0.1421, 1e-3, 'gamma de 2027-08-02');
close(of('2028-07-22').gamma, -0.6056, 1e-3, 'gamma de 2028-07-22');
ok(CAT.eclipses.some(e => e.gamma < 0), 'ningún gamma negativo: se ha perdido el signo');

// ---------------------------------------------------------------------------
// 8. The path curves. A sample that misses the Earth has to leave a null, or
//    the renderer closes the array over the hole and draws a chord across a
//    gap the shadow never crossed.
// ---------------------------------------------------------------------------
const cl = Bess.centralLine(B);
ok(cl.filter(Boolean).length > 60, `la línea central tiene ${cl.filter(Boolean).length} puntos`);
ok(cl.includes(null), 'la línea central debe marcar el hueco donde el eje deja la Tierra');
{
  let worst = 0, prev = null;
  for (const p of cl) {
    if (p === null) { prev = null; continue; }
    if (prev) worst = Math.max(worst, km(prev, p));
    prev = p;
  }
  ok(worst < 60, `salto máximo dentro de un tramo continuo: ${worst.toFixed(0)} km`);
}

// The penumbra outline must exist and reach thousands of km from the axis.
const out = Bess.penumbraOutline(B, E26.greatest_h);
ok(out.length >= 1 && out[0].length > 10, `contorno de penumbra: ${out.length} tramos`);
ok(Math.max(...out.flat().map(p => km([E26.central_lat, E26.central_lon], p))) > 3000,
   'la penumbra debe alcanzar miles de km desde el eje');

// ---------------------------------------------------------------------------
// 9. The obscuration raster. Uniformly zero still renders as a valid map, and
//    the night side must stay out of it.
// ---------------------------------------------------------------------------
const G = Bess.obscurationGrid(B, 144, 72, 61);
let mx = 0, nz = 0;
for (const v of G.grid) { if (v > mx) mx = v; if (v > 0) nz++; }
close(mx, 1.0, 1e-3, 'obscuración máxima de la malla');
ok(nz > 300 && nz < G.grid.length * 0.5, `la zona parcial cubre ${nz} de ${G.grid.length} celdas`);
{
  // 2026-08-12 peaks over the Atlantic at 17:46 UT, so the Pacific antipode is
  // in darkness. A cell there carrying obscuration means the night-side test
  // has been dropped.
  const j = Math.floor((90 - (-20)) / 180 * 72), i = Math.floor((-170 + 180) / 360 * 144);
  ok(G.grid[j * 144 + i] === 0, 'una celda en el hemisferio nocturno no puede tener obscuración');
}

// ---------------------------------------------------------------------------
// 10. The polynomial is a cubic and the cubic term matters. Dropping it left
//     every check above green.
// ---------------------------------------------------------------------------
{
  const quad = Object.assign({}, B, { x: B.x.slice(0, 3), y: B.y.slice(0, 3) });
  const a = Bess.evaluate(B, 3.0), b = Bess.evaluate(quad, 3.0);
  ok(Math.abs(a.x - b.x) > 1e-5 || Math.abs(a.y - b.y) > 1e-5,
     'el término cúbico de x/y no cambia nada a 3 h: el ajuste es sospechoso');
}

// ---------------------------------------------------------------------------
// 11. The raster prunes each row to the columns where the Sun can be up and
//     the penumbra can reach, which is what makes a finer grid affordable.
//     The pruning is derived, not tuned, so it must return the SAME numbers as
//     a sweep of every column -- not close ones. Checked over the four
//     geometries that stress it: an annular eclipse near the south pole, a
//     total one crossing the north pole, one at low latitude, and a
//     non-central one whose axis misses the Earth entirely.
// ---------------------------------------------------------------------------
{
  const E2 = 0.0066943799901413165;
  const sweep = (Bx, nlon, nlat, nt) => {          // sin podar: todas las columnas
    const grid = new Float32Array(nlon * nlat);
    const dmu = 1.002738 * Bx.delta_t_s * 15 / 3600 * D2R, rows = [];
    for (let j = 0; j < nlat; j++) {
      const lat = (90 - (j + 0.5) * 180 / nlat) * D2R;
      const N = 1 / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
      rows.push({ rc: N * Math.cos(lat), rs: N * (1 - E2) * Math.sin(lat) });
    }
    for (let k = 0; k < nt; k++) {
      const e = Bess.evaluate(Bx, -3.2 + 6.4 * k / (nt - 1));
      const sd = Math.sin(e.d), cd = Math.cos(e.d);
      for (let j = 0; j < nlat; j++) {
        const r = rows[j];
        for (let i = 0; i < nlon; i++) {
          const H = e.mu + (-180 + (i + 0.5) * 360 / nlon) * D2R - dmu, cH = Math.cos(H);
          const zeta = r.rs * sd + r.rc * cH * cd;
          if (zeta <= 0) continue;
          const m = Math.hypot(e.x - r.rc * Math.sin(H), e.y - (r.rs * cd - r.rc * cH * sd));
          const L1 = e.l1 - zeta * Bx.tan_f1, L2 = e.l2 - zeta * Bx.tan_f2;
          if (m >= L1) continue;
          const o = Bess.obscuration(m, (L1 + L2) / 2, (L1 - L2) / 2);
          if (o > grid[j * nlon + i]) grid[j * nlon + i] = o;
        }
      }
    }
    return grid;
  };
  for (const id of ['2026-02-17', '2026-08-12', '2027-08-02', '2043-04-09']) {
    const Bx = of(id).elements;
    const a = sweep(Bx, 180, 90, 41), b = Bess.obscurationGrid(Bx, 180, 90, 41).grid;
    let worst = 0, hit = 0;
    for (let i = 0; i < a.length; i++) {
      worst = Math.max(worst, Math.abs(a[i] - b[i]));
      if (a[i] > 0.001) hit++;
    }
    ok(hit > 200, `${id}: la malla de referencia apenas tiene eclipse (${hit} celdas)`);
    ok(worst === 0, `${id}: podar la malla cambia el resultado (dif ${worst})`);
  }
}

console.log(fails ? `${fails} FALLOS` : 'besselian.js OK — concuerda con eclipsecat.py, DE440s y la NASA');
process.exit(fails ? 1 : 0);
