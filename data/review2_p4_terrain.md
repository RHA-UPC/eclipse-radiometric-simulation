# Adversarial review — P4: topographic horizon (`terrain.py`, paper §"Horizonte topográfico" / §Resultados)

Reviewer: adversarial pass, 2026-08-13. Posture: assume wrong until proven.
Site: 41.212878 N, 0.709488 E, 616.1 m (Copernicus GLO-30, EGM2008).
Independent calculations run with `~/.venvs/eclipse2026/bin/python`, `PYTHONPATH=src`.

Findings appended in order of establishment.

---

## F1 — Apparent-elevation formula: sign convention and small-angle form

**CLAIM** (`src/terrain.py:78-82`):
```python
def apparent_elevation(h_m, h0_m, d_m, k_r=K_REFR):
    r_eff = R_EARTH_M / (1.0 - k_r)
    return np.degrees(np.arctan2(h_m - h0_m, d_m) - d_m / (2.0 * r_eff))
```
and paper.tex:137-139: "La altura aparente de cada punto de terreno incorpora la curvatura
terrestre y la refracción atmosférica mediante un radio terrestre efectivo
$R_{\mathrm{ef}} = R/(1-k_r)$".

**VERDICT: SURVIVES.**

**EVIDENCE** (independent, my own):
- Dimensional check: `arctan2` returns rad; the curvature term `d/(2 R_eff)` is the angular
  equivalent of the height drop `d²/(2R_eff)` divided by `d`, i.e. also rad. Consistent, then
  `np.degrees()` once on the whole bracket. No unit mixing.
- Sign: curvature is **subtracted** → distant terrain appears lower. Correct.
  Refraction enters as `R_eff = R/(1-k_r) > R` → drop shrinks → terrain appears **raised**.
  Correct sign for positive `k_r`.
- Small-angle truncation: I compared the code form against the exact spherical form
  `alt = atan2((R_e+h)cosθ − (R_e+h0), (R_e+h) sinθ)`, `θ = s/R_e`, at k=0.13:

  | h (m) | s (km) | code | exact | Δ (deg) |
  |---|---|---|---|---|
  | 431.9 | 38.2 | −0.42575 | −0.42573 | −2e−5 |
  | 238.4 | 100 | −0.60762 | −0.60761 | −2e−5 |
  | 651.2 | 20 | +0.02225 | +0.02224 | +1e−5 |

  Error ≤ 2×10⁻⁵ deg at the 100 km range limit — four orders of magnitude below the quoted
  precision. The approximation is fine.

**SEVERITY: n/a (no defect).**
**FIX: none.**

---

## F2 — Geoid/ellipsoid consistency and observer eye height

**CLAIM** (`terrain.py:103-108`): `h0_dem = mos.sample(...)` (GLO-30/EGM2008) is used as the
observer height, and `H` are GLO-30/EGM2008 heights. paper.tex:103 "El modelo digital del
terreno Copernicus GLO-30 sitúa ese punto a [616,1] m".

**VERDICT: SURVIVES inside `terrain.py`; MINOR inconsistency leaks into `siteconf.py`.**

**EVIDENCE:**
- `horizon.json` records `observer_height_dem_m = 616.1207275390625`, sampled from the same
  mosaic as the ridge heights. Observer and terrain are therefore on the **same vertical
  datum (EGM2008)**; only the *difference* `h_m − h0_m` enters the formula, so the geoid
  undulation cancels exactly. Internally self-consistent. This is the right way to do it.
- Leak: `siteconf.py:ELEV_M = 616.1` (an EGM2008 orthometric height) is passed to
  `wgs84.latlon(..., elevation_m=ELEV_M)`, which Skyfield interprets as height **above the
  WGS84 ellipsoid**. Geoid undulation N in NE Spain is ≈ +49…+51 m, so the true ellipsoidal
  height is ≈ 666 m. The site is therefore placed ~50 m too low in the topocentric
  computation. Effect on solar altitude at 4.6°: parallax scale is ~(Δh/R)·cot-ish, i.e.
  sub-milliarcsecond for the Sun and ≲0.03″ for the Moon — **numerically irrelevant** to any
  number in the paper, but the paper never states which datum `616,1` is on and mixes the two.
- Observer eye height is **not** modelled: `h0` is the bare DEM surface. Adding a 1.6 m eye
  height lowers every terrain point by 1.6/38200 rad = **0.0024°** at the 38 km ridge.
  Negligible, and it works *against* the paper's claim by a trivial amount, so it is not a
  concealed favourable choice.

**SEVERITY: minor.**
**FIX:** state explicitly in §2 that DEM and observer share the EGM2008 datum so undulation
cancels; either convert `ELEV_M` to ellipsoidal (≈666 m) before handing it to Skyfield or add
a one-line note that the datum mismatch is below the reported precision.

---

## F3 — Independent check of the horizon dip at 616 m: is −0,42° geometrically possible?

**CLAIM** (paper.tex:343-347): "El perfil del horizonte […] está \emph{deprimido} en todo el
sector de interés: en el acimut de la totalidad la línea de cresta real se sitúa a
\horizonAtTotality\textdegree" with `\horizonAtTotality = -0{,}42` (`keyvals.tex:53`),
`\horizonMax = -0{,}38` (`keyvals.tex:54`).

**VERDICT: SURVIVES** (the specific worry — a skyline more depressed than the true-horizon dip
— does not materialise; it is the opposite).

**EVIDENCE** (my own arithmetic, h = 616.1207 m, R = 6 371 008.8 m):

| k_r | R_eff (km) | dip = acos(R_eff/(R_eff+h)) |
|---|---|---|
| 0.00 | 6371.0 | **0.7968°** |
| 0.07 | 6850.5 | 0.7684° |
| 0.13 | 7323.0 | **0.7432°** |
| 0.20 | 7963.8 | 0.7127° |
| 0.25 (4/3 rule) | 8494.7 | 0.6901° |

The dip to the *sea-level* horizon at this site is −0.74° (k=0.13). The claimed skyline is
−0.42°, i.e. **0.32° ABOVE** the sea-level horizon direction — exactly what you expect when
the ray terminates on land 400 m above sea level rather than on the sea. There is no
geometric impossibility. (The impossible case would have been a skyline below −0.74°; the
most depressed value anywhere in `horizon.json` is −0.589°, still above the dip. Consistent.)

**SEVERITY: n/a (no defect).**
**FIX: none.** Optional: quoting the −0.74° sea-level dip alongside the −0.42° skyline would
let the reader see at a glance that the site really does dominate the valley.

---
