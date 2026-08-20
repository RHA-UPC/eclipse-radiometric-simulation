# Log — paper on the total eclipse of 2026-08-12, La Figuera (Priorat)

**STATUS: CLOSED. PDF in `out/paper.pdf` (21 pages).**
Both adversarial reviews completed and applied. Bibliography verified
mechanically. No model input is left without provenance.

Environment: `~/.venvs/eclipse2026/bin/python`. LaTeX: `tectonic`.
Build: `cd paper && tectonic -X compile paper.tex --outdir ../out`
Regenerate tables and values: `cd src && python paperdata.py` (BEFORE building).
Regenerate figures: `cd src && python figures.py`.

## Computation chain (all in src/, all with self-tests)

| Module | What it does | Self-test |
|---|---|---|
| `siteconf.py` | site and physical constants (IAU 2015, Kopp & Lean) | — |
| `geometry.py` | contacts C1–C4 from DE440s, obscuration, magnitude | — |
| `terrain.py` | real horizon from Copernicus GLO-30 | — |
| `pathgeom.py` | position inside the path, gradient, sensitivities | — |
| `limbdark.py` | flux-weighted obscuration with limb darkening | 5 checks |
| `radiometry.py` | air mass, clear sky, Hestroffer α(λ) | yes |
| `spectral.py` | SPECTRL2 + chromatic transmission + ICNIRP weights | yes |
| `optics.py` | focal-plane irradiance, concentration, power | 4 checks |
| `thermal.py` | Carslaw & Jaeger disk/semi-infinite, time to threshold | 6 checks |
| `eye.py` | ICNIRP thermal and photochemical limits | 5 checks |
| `perseids.py` | radiant, FOV, rate, Poisson | yes |
| `validate.py` | ASTM G173, NASA Besselians, semidiameter, air mass | — |
| `figures.py` | 9 figures | — |
| `paperdata.py` | 6 LaTeX tables + 75 keyvals | — |

## Key results

- **Inside totality**: 74.1 s (DE440s, k = 0.2725076). Range 59–74 s depending
  on the shadow solution. Maximum 20:29:59.8 CEST, Sun at 4.75°, azimuth 285.7°.
- **Real horizon depressed** −0.42°; clearance 5.17°. Site valid.
- 55 km from the northern limit; +0.58 s per km southwards; ~103 s at 115 km
  south.
- DNI: 490 W/m² at C1 → 186 W/m² at the instant of totality **without the
  eclipse** (dusk alone already takes 62 %). Clear sky 0 % (ECMWF), AOD 0.16
  (CAMS).
- **Sensors**: concentration 299× at f/6.3, 3288× at f/1.9. Local ΔT on a
  300 mm f/6.3 at C1: 0.37 K (good heat sink) / 1.71 K (semi-infinite) /
  **6.84 K (adiabatic back face, the defensible worst case)**. Characteristic
  time a²/κ = 21 ms; 95 % of the asymptote at 0.7 s. Thermal risk negligible
  FOR THE SENSOR; shutter, focusing screen and viewfinder fall outside the
  model and are where the real risk sits.
- **Eye**: at C1, E_B = 24 W/m² → 4.2 s of fixation with a nominal 3 mm pupil,
  0.9 s with 7 mm. At the instant of totality, with the Sun **uneclipsed**,
  E_B = 1.58 W/m² → 63 s (3 mm) / 12 s (7 mm). ICNIRP derived the photochemical
  limit assuming 3 mm: with a dilated pupil the margin falls 5.4×.
- **Perseids**: radiant at 9.2°, P ≤ 0.71 % across the whole sweep.
- **Diamond ring**: residual flux falls with an e-folding of 0.244 s in the last
  second; 10 s from C2 there is 1e-3 of the area left but only 3e-4 of the flux.

## Verified sources (data/literature.json, with verbatim quotes)

ICNIRP 2013 (primary PDF, eqs. 6, 7, 13, 14, 16, 17 + Tables 2–5) · Hestroffer &
Magnan 1998 (ADS PDF, Table 2 + eq. 5) · IMO Meteor Shower Calendar 2026
(primary PDF, p. 11 + Table 6) · NASA Besselians SE2026Aug12T · Kopp & Lean
2011 · Linke turbidity climatology (pvlib/SoDa) · CAMS AOD + ECMWF meteorology
for the day · Tamron B016, 16 elements in 12 groups (official Tamron page plus
the owner's reference) · Copernicus GLO-30 · ASTM G173.

## Adversarial review — BOTH COMPLETED

**Reviewer 1 (optics and thermal): 17 findings, all applied.** What survived:
the focal-plane radiometry, Carslaw & Jaeger (reproduced by Green's function to
1e-10), the choice of central value, and the limb quadrature. What fell: the
false thermal "bracket", three wrong "four orders of magnitude", the Perseid
bound and seven hand-written figures.

**Reviewer 2 (geometry, eye, statistics): 4 critical/major findings, all
applied.** It wrote to disk incrementally (`data/review2_findings.md`), which is
what allowed recovering them after it died on a session limit.

| Finding | Before | Now |
|---|---|---|
| Bug in `validate.py`: the ΔT term was missing from the hour angle | path displaced 25 km west; a "15 s spread" explained as physics | reproduces NASA's 4 central durations to **0.04 s**; real spread **1.4 s** |
| Lunar radius convention | k = 0.2725076 for every contact | **k1 = 0.272488 (C1/C4), k2 = 0.272281 (C2/C3)**; totality 74.07 → **70.27 s** |
| Northern limit of the path | 55 km (a `brentq` artefact: the bracket width) | **47.8 km north, 41.9 km perpendicular** |
| ICNIRP thermal limit | evaluated at γ_ph = 11 mrad → 241.9 W/m², ratio 1.09 | evaluated at the source subtense 9.18 mrad → **201.9 W/m², ratio 1.30** |
| Thermal radiance under eclipse | scaled by the transmission, so it vanished | **radiance invariant under occultation**; the crescent's α is what answers |
| Ω = πγ²/4, full subtense, pupil correction, E_B | — | **ALL SURVIVE** (E_B checked by hand: 23 vs 24 W/m² at C1) |

## CMOS damage threshold — CLOSED

`data/damage_findings.md`. Schwarz et al. (2017), Optical Engineering 56(3)
034108, CC BY: **49 kW/cm², CW 532 nm, 10 s, effective spot of 9.08 µm
radius**, damage class = permanent loss of ≥10 % sensitivity. The only
published CW threshold quoted with its spot size; no second absolute
measurement exists to compare against (Yoon 2016 publishes relative values "for
safety reasons"; Kim 2015 is paywalled).

Applied with the q·a/k rescaling `thermal.py` implemented and had never used:
**margin 18× (hypothesis A, conservative) to 2669× (hypothesis B)** at the
worst instant. A 300 mm f/2.8 at midday comes out at **1.9×**.

Stack temperatures, corrected: **microlens 125–150 °C** (the most fragile part,
and the text had put it in the wrong place), CFA baked at 150–250 °C (a
SURVIVAL bound, not a degradation one), OV5647 70 °C operating / 125 °C
storage.

Shutter curtain and focusing screen: **no citable backing**. Nikon/Espenak and
NASA point at the sensor and at the eye. The paper says so.

## Bibliography — verified (task 8 closed)

29 entries: 16 with a DOI, 8 with a URL, 5 with neither.
- **16/16 DOIs resolve** in Crossref and the registered title matches the cited
  one.
- **7/8 URLs return HTTP 200**; the eighth is the CAMS API endpoint, which
  answers 400 without query parameters (normal behaviour, not a broken link).
- Of the 5 without an identifier: Hestroffer & Magnan and the OV5647 datasheet
  were read directly and are transcribed with literal quotes; Carslaw & Jaeger
  was verified by reproducing the solution through a Green's function
  (agreement 1e-10 over 8 decades) without reading the original; Skyfield is
  cited through ASCL.
- **ISO 12312-2 is cited but has NOT been consulted** (paid). No figure in the
  paper comes from it. Declared explicitly in the manuscript.

Verification artefacts: `data/bib_index.json`, `data/bib_verification.json`,
`data/bib_url_check.json`.

## Rules
- Every number in the paper comes from `src/*.py` or from a citation with a
  quote in `literature.json`.
- `hardware.json` marks the state of each block;
  `paperdata.py::assert_no_provisional()` aborts the build if anything is not
  in `verified` or `verified-secondary`.
- The 7 modules in `src/` have self-tests that fail loudly: all 7 pass.
