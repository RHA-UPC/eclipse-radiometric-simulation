// eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
//
// The browser radiometry has to reproduce the manuscript's own chain. This
// test drives it from the geometry that data/spectral_timeseries.csv already
// records, so a failure here points at the radiometry and never at the
// ephemeris: that half is besselian.test.js's job.
//
// Run: node web/js/radiometry.test.js
'use strict';
const fs = require('fs'), path = require('path');
global.Bess = require('./besselian.js');
const Radio = require('./radiometry.js');
const ROOT = path.join(__dirname, '..', '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/spectral.json')));
Radio.setTables(T);

let fails = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL ' + m); fails++; } };
const rel = (a, b, tol, m) =>
  ok(Math.abs(a - b) <= tol * Math.abs(b), `${m}: ${a.toPrecision(6)} vs ${b.toPrecision(6)} (${(100 * (a / b - 1)).toFixed(2)} %, tol ${100 * tol} %)`);

// 1. Limb-darkened flux obscuration against src/limbdark.py, which uses a
//    Gauss-Legendre quadrature in rho where this uses Simpson in theta. Two
//    different quadratures of the same integral agreeing is the point.
for (const c of [
  { sep: 0.6, rs: 1, rm: 1.02, alpha: 0.3, O: 0.6603823008065713 },
  { sep: 0.6, rs: 1, rm: 1.02, alpha: 0.9, O: 0.6960584797723537 },
  { sep: 1.5, rs: 1, rm: 1.02, alpha: 0.6, O: 0.136653089618609 },
  { sep: 0.05, rs: 1, rm: 1.02, alpha: 0.6, O: 0.9942528601717566 },
  { sep: 1.95, rs: 1, rm: 1.02, alpha: 0.6, O: 0.004005105577399564 },
  { sep: 1.0, rs: 1, rm: 0.98, alpha: 0.75, O: 0.38636778403920463 }])
  rel(Radio.fluxObscuration(c.sep, c.rs, c.rm, c.alpha), c.O, 2e-3,
      `flux obscuration sep=${c.sep} alpha=${c.alpha}`);

// Limb darkening must make the flux deficit LAG the area deficit early on:
// the Moon eats the faint limb first. Getting this backwards is the error the
// module exists to avoid, and it is invisible in a plot.
const area = (s, rs, rm) => {
  const a1 = rs * rs * Math.acos((s * s + rs * rs - rm * rm) / (2 * s * rs));
  const a2 = rm * rm * Math.acos((s * s + rm * rm - rs * rs) / (2 * s * rm));
  const a3 = 0.5 * Math.sqrt((-s + rs + rm) * (s + rs - rm) * (s - rs + rm) * (s + rs + rm));
  return (a1 + a2 - a3) / (Math.PI * rs * rs);
};
ok(Radio.fluxObscuration(1.8, 1, 1.02, 0.7) < area(1.8, 1, 1.02),
   'early partial: the flux deficit must be smaller than the area deficit');

// 2. The whole spectral chain against data/spectral_timeseries.csv, row by row,
//    driven by the geometry that file records.
const csv = fs.readFileSync(path.join(ROOT, 'data/spectral_timeseries.csv'), 'utf8').trim().split('\n');
const head = csv[0].split(','), col = n => head.indexOf(n);
const rows = csv.slice(1).map(l => l.split(',').map(Number));
const ATM = T.atmospheres.ebro;
const lam = T.wavelength_nm;
const A2R = Math.PI / (180 * 3600);

const check = r => {
  const alt = r[col('sun_alt_refr_deg')], am = r[col('airmass_rel')];
  const sep = r[col('sep_arcsec')] * A2R, rs = r[col('r_sun_arcsec')] * A2R,
        rm = r[col('r_moon_arcsec')] * A2R;
  const tag = `t=${r[col('seconds_from_max')].toFixed(0)} s`;

  const dni0 = Radio.spectrl2(90 - alt, am, ATM, 224);
  rel(Radio.trapz(dni0, lam), r[col('dni_spectral_noeclipse')], 5e-3, `${tag} DNI sin eclipse`);

  const alphaL = lam.map(Radio.alphaHestroffer);
  const dni = dni0.map((v, j) => v * (1 - Radio.fluxObscuration(sep, rs, rm, alphaL[j])));
  rel(Radio.trapz(dni, lam), r[col('dni_spectral_eclipsed')], 1e-2, `${tag} DNI eclipsado`);
  rel(Radio.trapz(dni.map((v, j) => v * T.B_lambda[j]), lam),
      r[col('E_blue_eclipsed')], 1.5e-2, `${tag} E_azul`);
  rel(Radio.trapz(dni.map((v, j) => v * T.R_lambda[j]), lam),
      r[col('E_thermal_eclipsed')], 1.5e-2, `${tag} E_termico`);
  rel(683 * Radio.trapz(dni.map((v, j) => v * T.V_lambda[j]), lam),
      r[col('Ev_direct_eclipsed')], 1.5e-2, `${tag} iluminancia`);
};
// Away from the steep last minute, where a 1 s difference is a factor of two.
[0, 200, 400, 600, 700].forEach(i => check(rows[i]));

// 3. ICNIRP, against data/eye_timeseries.csv, which src/eye.py produced. The
//    crescent subtense and the hazard ratio are checked row by row.
const ecsv = fs.readFileSync(path.join(ROOT, 'data/eye_timeseries.csv'), 'utf8').trim().split('\n');
const ehead = ecsv[0].split(','), ecol = n => ehead.indexOf(n);
const erows = ecsv.slice(1).map(l => l.split(',').map(Number));

const sub = i => Radio.crescentSubtense(rows[i][col('sep_arcsec')] * A2R,
  rows[i][col('r_sun_arcsec')] * A2R, rows[i][col('r_moon_arcsec')] * A2R);
for (const i of [0, 200, 400, 600, 690]) {
  rel(sub(i) * 1e3, erows[i][ecol('alpha_crescent_mrad')], 1e-6, `subtensa del creciente fila ${i}`);
  // eye.py divides by a FIXED nominal solar subtense (946,66") while the port
  // uses the instantaneous one from the elements. They differ by 3 ppm, which
  // is why these two are 1e-4 and not 1e-6.
  const alphaSun = 2 * rows[i][col('r_sun_arcsec')] * A2R;
  const L = rows[i][col('E_thermal_noeclipse')] / (Math.PI * alphaSun * alphaSun / 4);
  rel(L, erows[i][ecol('L_thermal_W_m2_sr')], 1e-4, `radiancia fila ${i}`);
  const ratio = sub(i) > 0 ? L / Radio.thermalLimitRadiance(sub(i)) : 0;
  rel(ratio, erows[i][ecol('thermal_hazard_ratio')], 1e-4, `razon termica fila ${i}`);
  const st = Radio.staringTime(rows[i][col('E_blue_eclipsed')], 3);
  const want = erows[i][ecol('safe_stare_p3_s')];
  ok(st === Infinity ? !isFinite(want) : Math.abs(st - want) < 1e-6 * want,
     `fijacion 3 mm fila ${i}: ${st} vs ${want}`);
}

// The radiance must NOT collapse as obscuration approaches one. It falls only
// because the atmosphere thickens, never because the Moon covers area.
const i0 = 0, iLate = 690;
ok(rows[iLate][col('obsc_geometric')] > 0.9, 'la fila tardia tiene que estar muy eclipsada');
ok(erows[iLate][ecol('L_thermal_W_m2_sr')] / erows[i0][ecol('L_thermal_W_m2_sr')] > 0.2,
   'la radiancia no puede desplomarse con la ocultacion');
rel(sub(i0), 2 * rows[i0][col('r_sun_arcsec')] * A2R, 1e-9, 'subtensa sin eclipsar = diametro solar');

// The two branches of the blue-light limit meet at exactly 100 s.
rel(Radio.staringTime(T.icnirp.E_B_LIMIT * 1.0000001, 3), 100, 1e-5, 'ICNIRP branch continuity');
ok(Radio.staringTime(0.5, 3) === Infinity, 'below the limit there is no time bound');
ok(Radio.staringTime(0.5, 7) < Infinity, 'a 7 mm pupil must bind where 3 mm does not');

// 4. The paper's headline number: the thermal limit is exceeded by 30 % at
//    first contact. The previous version of this block also compared a CSV
//    column against the literal 1.34, which exercises no code at all; only the
//    recomputation below is a test.
const alphaSun0 = 2 * rows[0][col('r_sun_arcsec')] * A2R;
const L0 = rows[0][col('E_thermal_noeclipse')] / (Math.PI * alphaSun0 * alphaSun0 / 4);
rel(L0 / Radio.thermalLimitRadiance(sub(0)), 1.34, 2e-2, 'razon termica en C1 (el 30 % del paper)');

// 5. Pieces that no test touched before, each of which survived mutation.

// Kasten & Young (1989), against pvlib.atmosphere.get_relative_airmass. The
// coefficient 0.50572 could be changed to 0.45 with both suites still green.
for (const [z, want] of [[0, 0.9997119918558381], [30, 1.1539922333636758],
                         [60, 1.9942928525292494], [80, 5.5860358798512],
                         [85.4, 11.026751907012784]])
  rel(Radio.airmass(z), want, 1e-9, `masa de aire a ${z} grados de cenit`);
ok(!isFinite(Radio.airmass(90)) || Number.isNaN(Radio.airmass(90)),
   'la masa de aire en el horizonte no puede devolver un numero finito');

// The photochemical limit scales with pupil AREA. The exponent could be
// changed from 2 to 1 and only one loose assertion noticed.
for (const d of [4, 5, 7]) {
  const E = 4.0;
  rel(Radio.staringTime(E, d), Radio.staringTime(E, 3) * (3 / d) ** 2, 1e-12,
      `escalado de pupila ${d} mm`);
}
rel(Radio.staringTime(T.icnirp.E_B_LIMIT * 1.0000001, 3), 100, 1e-5, 'continuidad de ramas ICNIRP');
ok(Radio.staringTime(0.5, 3) === Infinity, 'por debajo del limite no hay cota');
ok(Radio.staringTime(0.5, 7) < Infinity, 'una pupila de 7 mm tiene que acotar donde 3 mm no');

// Annularity: the Sun is the larger disc, so what is left is a full-brightness
// ring. Returning zero subtense there declares no thermal hazard at the moment
// the whole limb is on show. Both this port and src/eye.py did that.
{
  const rs = 4.6e-3, rm = 4.4e-3;
  ok(Radio.crescentSubtense(1.5e-4, rs, rm) > 0,
     'un anillo anular no puede tener subtensa cero');
  rel(Radio.crescentSubtense(1.5e-4, rs, rm), 2 * rs, 1e-12, 'subtensa anular = diametro exterior');
  ok(Radio.crescentSubtense(1.5e-4, 4.4e-3, 4.6e-3) === 0,
     'en totalidad la subtensa si es cero');
}

// 5. End to end: the whole run at the study site, with the site's own measured
//    atmosphere, against what the manuscript published for it.
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/data/eclipses.json'))).eclipses;
const CAT = id => CATALOGUE.find(e => e.id === id).elements;
const el = CAT('2026-08-12');
const R = Radio.run(el, 41.212878, 0.709488, 616.1, T.atmospheres.ebro);
ok(R !== null, 'el emplazamiento del estudio ve el eclipse');
rel(R.first.alt_refr, 15.263, 3e-3, 'altura refractada al inicio de la ventana');
rel(R.first.dni0, 500.96, 1e-2, 'DNI sin eclipse al inicio');
rel(R.thermal_ratio, 1.3400, 2e-2, 'razon termica peor del evento');
rel(R.stare_3mm, 3.9399, 3e-2, 'fijacion admisible, pupila 3 mm');
rel(R.filter_needed, 0.039399, 3e-2, 'transmitancia de filtro exigida');
ok(R.max_obsc.obsc_flux > 0.9999, `obscuracion de flujo maxima ${R.max_obsc.obsc_flux}`);
ok(R.stare_7mm < R.stare_3mm, 'una pupila dilatada tiene que acortar el tiempo');

// The retinal radiance comes from the UNECLIPSED beam over the full solar
// subtense. Swapping it for the eclipsed one left both suites green, and it is
// the exact historical error the module says it exists to prevent.
{
  const deep = R.series.filter(s => !s.below && s.obsc_flux > 0.98 && s.alpha_rad > 0).pop();
  ok(deep, 'debe haber una muestra muy eclipsada con fotosfera visible');
  const om = Math.PI * deep.alpha_sun_rad ** 2 / 4;
  rel(deep.L_therm, deep.E_therm0 / om, 1e-12, 'radiancia desde el haz sin eclipsar');
  ok(deep.L_therm > 20 * (deep.E_therm / om),
     `la radiancia (${deep.L_therm.toExponential(2)}) no puede salir del haz eclipsado ` +
     `(${(deep.E_therm / om).toExponential(2)})`);
}

// The filter transmittance divides by the UNECLIPSED thermal irradiance, like
// eye.py: the Moon is not part of the filter and will move.
{
  const w = R.worst_thermal;
  const limitIrr = Radio.thermalLimitRadiance(w.alpha_sun_rad) * (Math.PI * w.alpha_sun_rad ** 2 / 4);
  rel(R.filter_thermal, limitIrr / w.E_therm0, 1e-12, 'rama termica de la transmitancia');
  rel(R.filter_blue, T.icnirp.E_B_LIMIT / R.worst_blue.E_blue, 1e-12, 'rama azul');
  rel(R.filter_needed, Math.min(R.filter_blue, R.filter_thermal), 1e-12, 'transmitancia exigida');
  ok(w.E_therm0 >= w.E_therm, 'el haz sin eclipsar no puede ser mas debil que el eclipsado');
}

// At the study site the worst thermal instant happens to be un-eclipsed, so
// E_therm0 == E_therm there and the check above cannot tell the two apart.
// 2027-08-02 at 20 N 30 E is the opposite case: its worst thermal instant is
// already 83 % obscured, so the two differ by a factor of six.
{
  const el = CAT('2027-08-02');
  const R2 = Radio.run(el, 20, 30, 0, T.atmospheres.g173);
  ok(R2, '2027-08-02 en 20 N 30 E ve el eclipse');
  const w = R2.worst_thermal;
  ok(w.E_therm0 > 3 * w.E_therm,
     `este punto tiene que discriminar: E0 ${w.E_therm0.toFixed(1)} vs E ${w.E_therm.toFixed(1)}`);
  const limitIrr = Radio.thermalLimitRadiance(w.alpha_sun_rad) * (Math.PI * w.alpha_sun_rad ** 2 / 4);
  rel(R2.filter_thermal, limitIrr / w.E_therm0, 1e-12,
      'rama termica donde el peor instante ya esta eclipsado');
  ok(Math.abs(R2.filter_thermal - limitIrr / w.E_therm) > 0.1 * R2.filter_thermal,
      'este punto tiene que separar las dos formas de la rama termica');
}
// Limb darkening has to CROSS the geometric curve, not sit on one side of it.
// While only the faint limb is covered the flux deficit lags the area deficit;
// once the Moon reaches the bright disc centre it overtakes it. A port that
// gets the sign of the weighting wrong still produces a plausible monotone
// curve, and only the crossover catches it.
const pick = (lo, hi) => R.series.filter(s => !s.below && s.obsc_area > lo && s.obsc_area < hi)[0];
const early = pick(0.03, 0.15), late = pick(0.70, 0.90);
ok(early && early.obsc_flux < early.obsc_area,
   `fase temprana: flujo ${early && early.obsc_flux.toFixed(4)} debe ir por detras del area ${early && early.obsc_area.toFixed(4)}`);
ok(late && late.obsc_flux > late.obsc_area,
   `fase profunda: flujo ${late && late.obsc_flux.toFixed(4)} debe adelantar al area ${late && late.obsc_area.toFixed(4)}`);

// Chromaticity, against the three transmissions the manuscript tabulates. The
// eclipse is not a grey filter: alpha(lambda) is larger in the blue, so the
// blue disc is more centrally concentrated and loses more once the centre goes.
for (const i of [300, 600]) {
  const sep = rows[i][col('sep_arcsec')] * A2R, rs = rows[i][col('r_sun_arcsec')] * A2R,
        rm = rows[i][col('r_moon_arcsec')] * A2R;
  for (const nm of [450, 550, 700])
    rel(1 - Radio.fluxObscuration(sep, rs, rm, Radio.alphaHestroffer(nm)),
        rows[i][col(`trans_${nm}nm`)], 5e-3, `transmision ${nm} nm fila ${i}`);
  // And the chromatic sign flips with the phase for the same reason the
  // crossover exists: early the Moon is eating the red limb, late the blue
  // centre. A grey model would show no difference at either end.
  const deep = rows[i][col('obsc_geometric')] > 0.5;
  const t450 = rows[i][col('trans_450nm')], t700 = rows[i][col('trans_700nm')];
  ok(deep ? t450 < t700 : t450 > t700,
     `fila ${i} (obsc ${rows[i][col('obsc_geometric')].toFixed(2)}): 450 nm ${t450.toFixed(4)} vs 700 nm ${t700.toFixed(4)}`);
}

console.log(fails ? `${fails} FAILED` : 'radiometry.js OK — reproduce la cadena espectral del manuscrito');
process.exit(fails ? 1 : 0);
