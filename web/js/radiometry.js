// eclipse-radiometric-simulation
// Copyright (C) 2026 Ricardo Heredia Alessandrello
// SPDX-License-Identifier: AGPL-3.0-only
//
// Spectral irradiance and ICNIRP ocular limits, computed on the visitor's own
// machine. Port of src/spectral.py, src/limbdark.py, src/radiometry.py and
// src/eye.py, restricted to the direct beam, which is what both hazard limits
// are driven by. The fixed tables come from web/data/spectral.json, exported
// with their citations by src/webdata.py.
//
// Two things this deliberately does NOT do, because SAFETY.md forbids them:
// it never reports an exposure time as permission, and it never hides that the
// atmosphere is an assumption the user supplied rather than a measurement.
'use strict';

const Radio = (() => {
  const D2R = Math.PI / 180;
  let T = null;                                  // the tables, loaded once

  const load = async (url = 'data/spectral.json') =>
    (T = T || await (await fetch(url)).json());
  const setTables = t => (T = t);                // for the node test

  // --- atmosphere ---------------------------------------------------------

  // Kasten & Young (1989). Diverges at the horizon, which is the regime this
  // whole study lives in, so the caller checks the altitude first.
  const airmass = zenDeg => zenDeg >= 90 ? NaN :
    1 / (Math.cos(zenDeg * D2R) + 0.50572 * Math.pow(96.07995 - zenDeg, -1.6364));

  // Bennett (1982) refraction, scaled for pressure and temperature.
  function refract(altDeg, pPa, tC) {
    if (altDeg < -1) return altDeg;
    const r = 1 / Math.tan((altDeg + 7.31 / (altDeg + 4.4)) * D2R) / 60;
    return altDeg + r * (pPa / 101000) * (283 / (273 + tC));
  }

  // Spencer's Earth-Sun distance correction, the same one pvlib applies.
  function spencer(doy) {
    const b = 2 * Math.PI * (doy - 1) / 365;
    return 1.00011 + 0.034221 * Math.cos(b) + 0.00128 * Math.sin(b)
         + 0.000719 * Math.cos(2 * b) + 0.000077 * Math.sin(2 * b);
  }

  // Direct normal spectral irradiance, Bird & Riordan (1984) section 2.
  // W m^-2 nm^-1 over the 122 tabulated wavelengths.
  function spectrl2(zenDeg, am, atm, doy) {
    const n = T.wavelength_nm.length, out = new Float64Array(n);
    const D = spencer(doy);
    const amAbs = am * atm.p_surface_Pa / 101300;
    const h0 = 22 / 6370;
    const cz = Math.cos(zenDeg * D2R);
    const ozMass = (1 + h0) / Math.sqrt(cz * cz + 2 * h0);
    for (let i = 0; i < n; i++) {
      const lam = T.wavelength_nm[i], um = lam / 1000;
      const Tr = Math.exp(-amAbs / (um ** 4 * (115.6406 - 1.3366 / um ** 2)));
      const tau = atm.aod500 * Math.pow(lam / 500, -T.angstrom_alpha);
      const Ta = Math.exp(-tau * am);
      const aW = T.Aw[i] * atm.precipitable_water_cm * am;
      const Tw = Math.exp(-0.2385 * aW / Math.pow(1 + 20.07 * aW, 0.45));
      const To = Math.exp(-T.Ao[i] * atm.ozone_atm_cm * ozMass);
      const aM = T.Au[i] * amAbs;
      const Tu = Math.exp(-1.41 * aM / Math.pow(1 + 118.3 * aM, 0.45));
      out[i] = T.E0[i] * D * Tr * Ta * Tw * To * Tu;
    }
    return out;
  }

  // --- photosphere --------------------------------------------------------

  // Hestroffer & Magnan (1998) eq. 5. The Balmer gap between 357 and 417 nm
  // has no published relation, so the two branches are blended there rather
  // than one of them being extrapolated in silence.
  function alphaHestroffer(lamNm) {
    const inv = 1000 / lamNm;
    const lo = -0.023 + 0.292 * inv, hi = -0.507 + 0.441 * inv;
    const w = Math.min(1, Math.max(0, (inv - 2.4) / 0.4));
    return Math.min(1.5, Math.max(0, (1 - w) * lo + w * hi));
  }

  // Fraction of the solar FLUX hidden, with limb darkening I(mu) = mu^alpha.
  //
  // The radial quadrature of limbdark.py, substituting rho = Rs sin(theta).
  // That substitution is what makes plain Simpson enough: mu = cos(theta) is
  // smooth in theta, whereas in rho it has an infinite derivative at the limb
  // and eats quadrature nodes. It also makes the denominator analytic,
  // int_0^{pi/2} cos^a(t) 2 pi sin t cos t dt = 2 pi / (a + 2).
  function fluxObscuration(sep, rs, rm, alpha, n = 800) {
    if (sep >= rs + rm) return 0;
    if (sep <= Math.abs(rm - rs)) return rm >= rs ? 1 : (rm * rm) / (rs * rs);
    const h = (Math.PI / 2) / n;
    let acc = 0;
    for (let k = 0; k <= n; k++) {
      const th = k * h, ct = Math.max(0, Math.cos(th)), st = Math.sin(th);
      const rho = rs * st;
      let phi;
      if (rho <= rm - sep) phi = Math.PI;
      else if (rho >= sep + rm || rho <= sep - rm) phi = 0;
      else phi = Math.acos(Math.min(1, Math.max(-1,
        (rho * rho + sep * sep - rm * rm) / (2 * rho * sep))));
      const f = Math.pow(ct, alpha) * 2 * phi * st * ct;
      acc += f * (k === 0 || k === n ? 1 : (k % 2 ? 4 : 2));
    }
    return acc * h / 3 / (2 * Math.PI / (alpha + 2));
  }

  // --- ICNIRP -------------------------------------------------------------

  // Angular subtense of the visible photosphere: the mean of its shortest and
  // longest dimension, each clamped, as ICNIRP prescribes for a non-circular
  // source.
  //
  // Nested discs are TWO cases and only one of them is harmless. If the Moon
  // is the larger the photosphere is gone and the subtense is zero: totality,
  // hazard zero rather than undefined. If the SUN is the larger what is left
  // is a complete ring at full photospheric brightness -- annularity -- and
  // returning zero there declares no thermal hazard at the exact moment the
  // whole limb is on show. ICNIRP does not treat annuli explicitly; this takes
  // the outer subtense, which is the conservative reading (a larger alpha
  // means a lower limit, hence a higher reported hazard) and joins the
  // uneclipsed case continuously as the Moon shrinks away.
  function crescentSubtense(sep, rs, rm) {
    const { alpha_min_rad: lo, alpha_max_rad: hi } = T.icnirp;
    const cl = v => Math.min(hi, Math.max(lo, v));
    if (sep <= Math.abs(rm - rs)) return rm >= rs ? 0 : cl(2 * rs);
    if (sep >= rs + rm) return cl(2 * rs);
    const short = Math.max(rs + sep - rm, 0);
    const c = Math.min(1, Math.max(-1, (sep * sep + rs * rs - rm * rm) / (2 * sep * rs)));
    const long = 2 * rs * Math.sin(Math.acos(c));
    return 0.5 * (cl(short) + cl(long));
  }

  const thermalLimitRadiance = a => T.icnirp.L_R_COEFF /
    Math.min(T.icnirp.alpha_max_rad, Math.max(T.icnirp.alpha_min_rad, a));

  // The two ICNIRP branches meet exactly at 100 s, so this is continuous.
  function staringTime(E_B, pupilMm) {
    const E = E_B * (pupilMm / T.icnirp.pupil_icnirp_mm) ** 2;
    return E <= T.icnirp.E_B_LIMIT ? Infinity : T.icnirp.H_B_LIMIT / E;
  }

  const trapz = (y, x) => {
    let s = 0;
    for (let i = 1; i < x.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
    return s;
  };

  // --- the run ------------------------------------------------------------

  // One eclipse at one point. `atm` carries the user's declared atmosphere.
  // Returns a time series plus the handful of numbers the panel shows.
  // pad_h extends the window either side of C1/C4. The hazard does not begin
  // at first contact -- the uneclipsed Sun is the worst case of all -- so the
  // series starts before it, as src/spectral.py does.
  function run(B, lat, lon, elev, atm, nsteps = 240, pad_h = 180 / 3600) {
    const o = Bess.observer(B, lat, lon, elev);
    const loc = Bess.local(B, lat, lon, elev);
    if (!loc) return null;
    const lam = T.wavelength_nm;
    const alphaL = lam.map(alphaHestroffer);
    const aMin = Math.min(...alphaL), aMax = Math.max(...alphaL);
    const nodes = Array.from({ length: 14 }, (_, i) => aMin + (aMax - aMin) * i / 13);
    const doy = Math.floor((Bess.utcOf(B, 0) - Date.UTC(Bess.utcOf(B, 0).getUTCFullYear(), 0, 0)) / 86400000);

    const ta = (loc.C1 ? loc.C1.t : loc.MAX.t - 1.6) - pad_h;
    const tb = (loc.C4 ? loc.C4.t : loc.MAX.t + 1.6) + pad_h;
    const series = [];
    for (let i = 0; i <= nsteps; i++) {
      const t = ta + (tb - ta) * i / nsteps;
      const g = Bess.geom(B, o, t);
      const aa = Bess.altaz(o, g);
      const altR = refract(aa.alt, atm.p_surface_Pa, atm.T_air_C);
      if (altR <= 0) { series.push({ t, alt: aa.alt, below: true }); continue; }
      const am = airmass(90 - altR);

      // Angular radii at the observer, recovered from the elements. The Moon's
      // distance along the axis is z_moon - zeta_observer; the Sun's angular
      // radius then follows from the ratio the fundamental plane already
      // encodes, (L1'+L2')/(L1'-L2').
      const e = Bess.evaluate(B, t);
      const f1 = Math.atan(B.tan_f1);
      const zMoon = (e.l1 - B.k1_penumbra / Math.cos(f1)) / B.tan_f1;
      const zetaObs = (g.L2 - e.l2) / -B.tan_f2;
      const rMoonAng = B.k2_umbra / (zMoon - zetaObs);
      const rSunAng = rMoonAng * (g.L1 + g.L2) / (g.L1 - g.L2);

      const dni0 = spectrl2(90 - altR, am, atm, doy);
      // Flux obscuration is expensive, and alpha(lambda) is smooth, so it is
      // evaluated on 14 alpha nodes and interpolated across the 122 channels.
      const On = nodes.map(a => fluxObscuration(g.m, (g.L1 + g.L2) / 2, (g.L1 - g.L2) / 2, a));
      const dni = new Float64Array(lam.length);
      const wB = new Float64Array(lam.length), wR = new Float64Array(lam.length);
      const wV = new Float64Array(lam.length), wR0 = new Float64Array(lam.length);
      for (let j = 0; j < lam.length; j++) {
        const f = (alphaL[j] - aMin) / (aMax - aMin) * 13;
        const k = Math.min(12, Math.floor(f)), u = f - k;
        const O = On[k] * (1 - u) + On[k + 1] * u;
        dni[j] = dni0[j] * Math.max(0, 1 - O);
        wB[j] = dni[j] * T.B_lambda[j];
        wR[j] = dni[j] * T.R_lambda[j];
        wV[j] = dni[j] * T.V_lambda[j];
        wR0[j] = dni0[j] * T.R_lambda[j];
      }
      const alphaC = crescentSubtense(g.m, rSunAng, rMoonAng);
      const E_R = trapz(wR, lam), E_R0 = trapz(wR0, lam);

      // The retinal thermal hazard is a RADIANCE, and radiance is invariant
      // under occultation: the Moon removes area, not surface brightness. So
      // it comes from the UNECLIPSED beam over the full solar subtense, and
      // only the atmosphere attenuates it. What the eclipse changes is the
      // LIMIT, through the shrinking angular subtense of the crescent.
      // Dividing the eclipsed irradiance by a solid angle instead drives the
      // hazard towards zero exactly when it is not falling; that error lived
      // in this project once and is why eye.py carries a warning about it.
      const alphaSun = 2 * rSunAng;
      const L_therm = E_R0 / (Math.PI * alphaSun * alphaSun / 4);
      const L_limit = alphaC > 0 ? thermalLimitRadiance(alphaC) : Infinity;
      series.push({
        t, alt: aa.alt, alt_refr: altR, airmass: am,
        obsc_flux: 1 - trapz(dni, lam) / trapz(dni0, lam),
        obsc_area: Bess.obscuration(g.m, (g.L1 + g.L2) / 2, (g.L1 - g.L2) / 2),
        dni0: trapz(dni0, lam), dni: trapz(dni, lam),
        lux: 683 * trapz(wV, lam),
        E_blue: trapz(wB, lam), E_therm: E_R, E_therm0: E_R0,
        alpha_rad: alphaC, alpha_sun_rad: alphaSun,
        L_therm, L_limit,
        thermal_ratio: alphaC > 0 ? L_therm / L_limit : 0,
        stare_3mm: staringTime(trapz(wB, lam), T.icnirp.pupil_icnirp_mm),
        stare_7mm: staringTime(trapz(wB, lam), T.eye.pupil_dark_mm)
      });
    }

    const up = series.filter(s => !s.below);
    if (!up.length) return null;
    const at = key => up.reduce((b, s) => (s[key] > b[key] ? s : b), up[0]);
    const worstTherm = up.reduce((b, s) => (s.thermal_ratio > b.thermal_ratio ? s : b), up[0]);
    const worstBlue = at('E_blue');
    const maxObsc = at('obsc_flux');
    return {
      series, loc, atm,
      first: up[0], last: up[up.length - 1],
      brightest: at('dni'),
      max_obsc: maxObsc,
      worst_thermal: worstTherm,
      thermal_ratio: worstTherm.thermal_ratio,
      worst_blue: worstBlue,
      stare_3mm: staringTime(worstBlue.E_blue, T.icnirp.pupil_icnirp_mm),
      stare_7mm: staringTime(worstBlue.E_blue, T.eye.pupil_dark_mm),
      // Transmittance at which each limit is met, and the binding (smaller) of
      // the two, exactly as eye.py::required_filter_transmittance defines it.
      // The two branches are reported separately and not only as their minimum,
      // because whichever one is larger is invisible in the minimum and a bug
      // there cannot be seen at all -- which is how the thermal branch spent a
      // while dividing by the eclipsed irradiance instead of the uneclipsed
      // one. The Moon is not part of the filter and it will move.
      filter_blue: T.icnirp.E_B_LIMIT / Math.max(worstBlue.E_blue, 1e-30),
      filter_thermal: thermalLimitRadiance(worstTherm.alpha_sun_rad)
        * (Math.PI * worstTherm.alpha_sun_rad ** 2 / 4)
        / Math.max(worstTherm.E_therm0, 1e-30),
      get filter_needed() { return Math.min(this.filter_blue, this.filter_thermal); },
      airmass_max: Math.max(...up.map(s => s.airmass))
    };
  }

  return { load, setTables, run, spectrl2, airmass, refract, spencer,
           alphaHestroffer, fluxObscuration, crescentSubtense, staringTime,
           thermalLimitRadiance, trapz, get tables() { return T; } };
})();

if (typeof module !== 'undefined') module.exports = Radio;
