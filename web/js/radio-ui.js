/*
 * eclipse-radiometric-simulation — the irradiance panel
 * Copyright (C) 2026 Ricardo Heredia Alessandrello
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The atmosphere form, the chart and the writing of the radiometric result.
 * None of it can run before radiometry.js is downloaded, which is a button
 * nobody has to press, so it is fetched with it rather than ahead of it.
 *
 * A classic script sharing the page's global scope: it writes `lastR` and
 * `atmForm`, both declared in app.js, and app.js repaints the chart from
 * `lastR` on a theme change.
 */
// Physically admissible ranges. Without them a negative water column runs the
// Bird transmittance through a negative power and the panel prints NaN, or an
// AOD of -1 prints 1e242 W/m2, both in the same styling as a real answer and
// both under a note saying the model is inside its fitted range.
const ATM_RANGE = {
  aod500: [0, 5], precipitable_water_cm: [0, 12],
  ozone_atm_cm: [0.05, 0.7], p_surface_Pa: [30000, 110000]
};

function atmPanel(A) {
  const f = (k, label, step, unit) =>
    `<label class="f"><span>${label}${unit ? ' (' + unit + ')' : ''}</span>
      <input data-atm="${k}" type="number" step="${step}" min="${ATM_RANGE[k][0]}"
       max="${ATM_RANGE[k][1]}" value="${A[k]}"></label>`;
  return `<div class="atm">
    <h3>${t('atm_h')}</h3>
    <select id="atm-preset">
      <option value="g173">${t('atm_g173')}</option>
      <option value="ebro">${t('atm_ebro')}</option>
      <option value="custom">${t('atm_custom')}</option>
    </select>
    <div class="grid" style="margin-top:.45rem">
      ${f('aod500', t('atm_aod'), '0.001', '500 nm')}
      ${f('precipitable_water_cm', t('atm_water'), '0.01', 'cm')}
      ${f('ozone_atm_cm', t('atm_ozone'), '0.001', 'atm-cm')}
      ${f('p_surface_Pa', t('atm_pressure'), '100', 'Pa')}
    </div>
    <p class="hint">${t('atm_hint')}</p>
  </div>`;
}

function readAtm() {
  const A = Object.assign({}, Radio.tables.atmospheres.g173);
  const clamped = [];
  document.querySelectorAll('[data-atm]').forEach(i => {
    const k = i.dataset.atm, [lo, hi] = ATM_RANGE[k];
    let v = parseFloat(i.value);
    if (!Number.isFinite(v)) { i.value = A[k]; return; }
    if (v < lo || v > hi) { v = Math.min(hi, Math.max(lo, v)); clamped.push(k); i.value = v; }
    A[k] = v;
  });
  A.T_air_C = 15;
  A.ground_albedo = 0.2;
  A.clamped = clamped;
  return A;
}

// Direct-beam irradiance against time, logarithmic because it spans three or
// four decades. Contacts are ticked so the curve can be read against them.
function drawCurve(cv, R) {
  const w = cv.width = cv.clientWidth * 2, h = cv.height = 300;
  const g = cv.getContext('2d');
  const up = R.series.filter(s => !s.below && s.dni > 1e-6);
  if (up.length < 2) return;
  const t0 = R.series[0].t, t1 = R.series[R.series.length - 1].t;
  const lo = Math.log10(Math.max(1e-4, Math.min(...up.map(s => s.dni))));
  const hi = Math.log10(Math.max(...up.map(s => s.dni0)));
  const X = t => (t - t0) / (t1 - t0) * (w - 60) + 46;
  const Y = v => h - 34 - (Math.log10(Math.max(v, 10 ** lo)) - lo) / (hi - lo) * (h - 56);

  g.fillStyle = cssv('--chart-bg'); g.fillRect(0, 0, w, h);
  g.font = '18px system-ui'; g.textBaseline = 'middle';
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
    const y = Y(10 ** e);
    if (y < 10 || y > h - 30) continue;
    g.strokeStyle = cssv('--chart-grid'); g.beginPath(); g.moveTo(46, y); g.lineTo(w - 14, y); g.stroke();
    g.fillStyle = cssv('--chart-axis'); g.textAlign = 'right';
    g.fillText(e >= 0 && e <= 3 ? String(10 ** e) : '1e' + e, 42, y);
  }
  for (const [k, lbl] of [['C1', 'C1'], ['C2', 'C2'], ['C3', 'C3'], ['C4', 'C4']]) {
    if (!R.loc[k]) continue;
    const x = X(R.loc[k].t);
    if (x < 46 || x > w - 14) continue;
    g.strokeStyle = cssv('--chart-axis'); g.setLineDash([4, 5]);
    g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h - 30); g.stroke(); g.setLineDash([]);
    g.fillStyle = cssv('--chart-axis'); g.textAlign = 'center'; g.fillText(lbl, x, h - 16);
  }
  const line = (key, colour, width) => {
    g.strokeStyle = colour; g.lineWidth = width; g.beginPath();
    let started = false;
    for (const s of R.series) {
      if (s.below || !(s[key] > 0)) { started = false; continue; }
      const x = X(s.t), y = Y(s[key]);
      started ? g.lineTo(x, y) : g.moveTo(x, y);
      started = true;
    }
    g.stroke();
  };
  line('dni0', cssv('--chart-base'), 2);
  line('dni', cssv('--chart-line'), 3);
  g.fillStyle = cssv('--chart-axis'); g.textAlign = 'left';
  g.fillText(t('rad_chart_label'), 50, 16);
}

function renderRadio(R) {
  lastR = R;
  // The visitor may have switched mode or moved the marker while this ran.
  const box = document.getElementById('radio-out');
  if (!box) return;
  const maxA = R.max_obsc;
  const amMax = R.max_obsc.airmass;
  const other = Math.max(R.filter_blue, R.filter_thermal);
  box.innerHTML = `
    <canvas class="chart" id="curve"></canvas>
    <h3 class="sec">${t('rad_h_beam')}</h3>
    <div class="kv"><span>${t('rad_no_moon')}</span><b>${fmt(maxA.dni0, 1)} W/m²</b></div>
    <div class="kv"><span>${t('rad_with_moon')}</span><b>${fmt(maxA.dni, maxA.dni < 10 ? 3 : 1)} W/m²</b></div>
    <div class="kv"><span>${t('rad_flux_deficit')}</span><b>${sci(maxA.obsc_flux)}</b></div>
    <div class="kv"><span>${t('rad_area_deficit')}</span><b>${sci(maxA.obsc_area)}</b></div>
    <div class="kv"><span>${t('rad_lux')}</span><b>${fmt(maxA.lux, 0)} lx</b></div>
    <div class="kv"><span>${t('rad_airmass')}</span><b>${fmt(amMax, 1)}</b></div>
    ${R.loc.duration_s > 0 ? `<p class="hint">${t('rad_totality_note')}</p>` : ''}

    <h3 class="sec">${t('rad_h_icnirp')}</h3>
    <div class="kv ${R.thermal_ratio > 1 ? 'hot' : ''}"><span>${t('rad_thermal')}</span>
      <b>${fmt(R.thermal_ratio, 2)} ×</b></div>
    <div class="kv"><span>${t('rad_stare3')}</span><b>${secs(R.stare_3mm)}</b></div>
    <div class="kv"><span>${t('rad_stare7')}</span><b>${secs(R.stare_7mm)}</b></div>
    <div class="kv"><span>${t('rad_filter')}
      <br><span style="color:var(--dim);font-size:.72rem">${t('rad_filter_which', {
        which: t(R.filter_thermal < R.filter_blue ? 'rad_thermal_word' : 'rad_photo_word'),
        other: other >= 1 ? '—' : fmt(other, 4) })}</span></span>
      <b>${R.filter_needed >= 1 ? '—'
          : R.filter_needed < 0.01 ? R.filter_needed.toExponential(2)
          : fmt(R.filter_needed, 4)}</b></div>
    ${R.filter_needed >= 1 ? `<p class="hint">${t('rad_nofilter')}</p>` : ''}

    <div class="assume">
      <b>${t('rad_what_h')}</b> ${t('rad_what')}
      <br><br>
      ${R.clamped && R.clamped.length
        ? t('rad_clamped', { n: R.clamped.length }) + '<br><br>' : ''}
      <b>${t('rad_unc_h')}</b> ${t('rad_unc_am', { am: fmt(amMax, 1) })}
      ${t(amMax > 6 ? 'rad_unc_far' : 'rad_unc_near')}
      ${R.bracket ? '<br>' + t('rad_bracket', {
        lo: fmt(R.bracket.lo.aod, 3), hi: fmt(R.bracket.hi.aod, 3),
        dhi: fmt(R.bracket.hi.dni, 1), dlo: fmt(R.bracket.lo.dni, 1),
        rhi: fmt(R.bracket.hi.ratio, 2), rlo: fmt(R.bracket.lo.ratio, 2) }) : ''}
    </div>`;
  drawCurve(document.getElementById('curve'), R);
}

async function runRadio(btn, lat, lon) {
  btn.disabled = true;
  btn.textContent = t('rad_button_busy');
  await need('js/radiometry.js');
  await Radio.load();
  if (!atmForm) {
    btn.insertAdjacentHTML('beforebegin', atmPanel(Radio.tables.atmospheres.g173));
    atmForm = true;
    document.getElementById('atm-preset').onchange = e => {
      const p = Radio.tables.atmospheres[e.target.value];
      if (!p) return;
      document.querySelectorAll('[data-atm]').forEach(i => {
        if (p[i.dataset.atm] !== undefined) i.value = p[i.dataset.atm];
      });
    };
  }
  // Yield once so the button repaints before the arithmetic blocks the thread.
  await new Promise(r => setTimeout(r, 0));
  const atm = readAtm();
  const R = Radio.run(current.elements, lat, lon, 0, atm);
  if (R) R.clamped = atm.clamped;
  if (R) {
    // Aerosol sensitivity, not a full uncertainty budget, and labelled as such.
    const at = f => {
      const r = Radio.run(current.elements, lat, lon, 0,
        Object.assign({}, atm, { aod500: atm.aod500 * f }), 80);
      // dni0 at the brightest instant, not the eclipsed value at maximum:
      // inside the umbra the latter is exactly zero and the sentence would
      // always read "de 0,00 a 0,00 W/m2", showing a null uncertainty where
      // SAFETY.md rule 4 requires a real one.
      return { aod: atm.aod500 * f, dni: r.brightest.dni0, ratio: r.thermal_ratio };
    };
    R.bracket = { lo: at(0.5), hi: at(2.0) };
    renderRadio(R);
  } else {
    const box = document.getElementById('radio-out');
    if (box) box.innerHTML = `<p class="hint">${t('rad_no_eclipse')}</p>`;
  }
  if (!document.body.contains(btn)) return;
  btn.disabled = false;
  btn.textContent = t('atm_recompute');
}
