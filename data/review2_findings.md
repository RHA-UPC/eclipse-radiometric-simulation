# Adversarial review #2 — findings

Target: `paper/paper.tex` + `src/{geometry,terrain,pathgeom,eye,perseids,validate,spectral}.py`
Scope: NOT optics, NOT thermal (covered by review #1).
Verdict vocabulary: WRONG / UNSUPPORTED / MISLEADING / OVERSTATED / CORRECT-BUT-FRAGILE / SURVIVES.
Started 2026-08-13. Findings appended in priority order, immediately upon establishment.

---
## P1-A. The Besselian re-implementation reproduces NASA's own path table to <1 s. The "it's not a bug, it's grazing sensitivity" defence is unsupported.

**CLAIM** (paper.tex L297-305): "El cálculo DE440s da \totalityDur\,s [74,1] ... Una reimplementación
independiente a partir de los elementos besselianos publicados por la NASA da \totalityDurBess\,s [59,2].
La horquilla, de unos quince segundos sobre poco más de un minuto, **no indica un error de cálculo** sino
la sensibilidad extrema de esta geometría".

**VERDICT: UNSUPPORTED (and the burden is now the other way round).**

**EVIDENCE** — I ran BOTH of the paper's own solvers at the five points NASA publishes on the
central line of this eclipse
(<https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2026Aug12Tpath.html>, ΔT = 71,4 s,
VSOP87/ELP2000-85). Script: scratchpad `p1_test.py`, run with the project venv from `src/`.

| UT | central line (NASA) | NASA duration | paper's Besselian | paper's DE440s (k=0,2725076) |
|---|---|---|---|---|
| 18:26 | 44°42,8'N 8°23,9'W | 113,0 s | **112,1 s** | 117,2 s |
| 18:28 | 43°22,3'N 6°11,3'W | 109,3 s | **108,5 s** | 113,4 s |
| 18:30 | 41°49,0'N 3°11,1'W | 104,6 s | **103,8 s** | 108,6 s |
| 18:32 | 39°24,5'N 2°57,0'E |  95,8 s | **95,3 s**  |  99,7 s |

The Besselian re-implementation reproduces NASA's published durations to **0,5–0,9 s (<1 %)** at every
tabulated point. It is therefore *not* a broken implementation, and the two solutions are *not* two
equally-defensible "shadow solutions" that happen to differ by 15 s. The DE440s run is high by a
uniform +4,0 to +4,8 s, which is exactly the lunar-radius-convention offset (see finding P1-B), not
grazing sensitivity.

Whatever produces the 15 s gap at the site therefore has to be demonstrated, not asserted. The paper
asserts it ("no indica un error de cálculo") with no test of either implementation against the
authority both of them are supposed to agree with — even though `validate.py` exists precisely to
run such tests and the NASA path table was one HTTP fetch away.

**SEVERITY: critical.** \totalityDur appears in the title-page abstract, in the results, in the eye-safety
operational recommendation ("filtro certificado salvo durante los \totalityDur s de totalidad") and in the
Perseid probability (the exposure window). A 20 % error propagates into all of them.

**FIX**: run both solvers against NASA's central line (four lines of code, done above), report the
agreement, and then diagnose the site-specific gap instead of waving at it. At minimum the sentence
"no indica un error de cálculo" must be deleted: nothing in the manuscript supports it.

---

## P1-B. The headline 74,1 s uses the PENUMBRAL lunar-radius constant for an UMBRAL contact, and misattributes that choice to Espenak & Meeus.

**CLAIM** (`src/geometry.py` L19-22, verbatim):
```
# Lunar radius convention. Espenak & Meeus (2006), NASA TP-2006-214141,
# "Five Millennium Canon of Solar Eclipses", adopt k = R_moon/R_earth_eq =
# 0.2725076 for both umbral and penumbral contacts of total eclipses.
K_ESPENAK = 0.2725076
```
and paper.tex L124-126: "Se emplea $k = 0{,}2725076$, y se reporta también el resultado con
$k_2 = 0{,}272281$, la convención umbral que utiliza el canon de eclipses de la NASA".

**VERDICT: WRONG (the code comment) / MISLEADING (the paper).**

**EVIDENCE**: the project's own `data/literature.json`, entry `nasa_besselian_2026aug12`, records
`"k1_penumbra": 0.272488, "k2_umbra": 0.272281` — i.e. the source itself states that NASA does NOT
use one k "for both umbral and penumbral contacts". C2 and C3 *are* umbral contacts. Espenak &
Meeus use k2 for them, which is why NASA's path table durations are k2 durations. The paper's
primary number is therefore computed with a constant its own cited authority reserves for the
penumbra, and the code comment's justification ("adopt ... for both") is contradicted by the data
file sitting next to it.

Quantitatively: `data/circumstances.json` / `pathgeom.json` give 74,07 s with k=0,2725076 and
70,27 s with k2=0,272281 — the wrong k inflates the headline by **3,8 s (5,1 %)**. My central-line
runs above show the same signature: DE440s+k=0,2725076 overshoots NASA by +4,0…+4,8 s at every
tabulated point, i.e. the whole DE440s-vs-NASA offset on the central line *is* the k offset.

**SEVERITY: major.** The number quoted throughout the paper should be the k2 number, 70,3 s. This
also shrinks the advertised "horquilla de unos quince segundos" to 11 s before any other correction.

**FIX**: adopt k2 = 0,272281 as primary for C2/C3 (report k1 for C1/C4 if desired, as NASA does),
delete the false comment in `geometry.py`, and restate the totality duration everywhere.

---
## P1-C. THE BUG IS REAL AND I LOCATED IT: `validate.py` omits the ephemeris→universal hour-angle correction. The 59,2 s figure is wrong; the 15 s "horquilla" does not exist.

**CLAIM** (paper.tex L303-305): "La horquilla ... no indica un error de cálculo sino la sensibilidad
extrema de esta geometría: con el Sol a 4,75° la sombra incide de forma rasante, y un desplazamiento
de la solución de sombra de un kilómetro en el plano fundamental se amplifica más de diez veces sobre
el terreno."

**VERDICT: WRONG.** It *is* a calculation error, in `src/validate.py`, and it is a one-line omission.

**EVIDENCE.** I asked each solver where it puts the shadow *axis* on the ground at NASA's tabulated
UT instants (the axis is independent of k, so this isolates ground registration):

| UT | NASA central line | `validate.py` Besselian | Δlon | DE440s |
|---|---|---|---|---|
| 18:26 | 44,7133 N  −8,3983 E | 44,7136 N **−8,6966 E** | −0,2983° | 44,7428 −8,4579 (5,7 km) |
| 18:28 | 43,3717 N  −6,1883 E | 43,3725 N **−6,4865 E** | −0,2982° | 43,4052 −6,2606 (6,9 km) |
| 18:30 | 41,8167 N  −3,1850 E | 41,8166 N **−3,4832 E** | −0,2982° | 41,8569 −3,2853 (9,4 km) |
| 18:32 | 39,4083 N  +2,9500 E | 39,4090 N **+2,6510 E** | −0,2990° | 39,5170 +2,5997 (32,5 km) |

Latitude is reproduced exactly; longitude is off by a **constant −0,29825°**. That constant is not a
coincidence:

    1,002738 × ΔT × 15°/3600 s = 1,002738 × 71,4 × 15/3600 = 0,298315°

which is the standard correction converting Espenak's **ephemeris** hour angle μ (tabulated against
TDT) into the observer's **universal** hour angle. `validate.py` L77 writes

```python
H = mu + lon                       # hour angle of the shadow axis
```

with no ΔT term. The correct relation (Explanatory Supplement to the Astronomical Almanac; Meeus,
*Elements of Solar Eclipses*; identical in Espenak's own key to the Besselian elements) is

```python
H = mu + lon - radians(1.002738 * delta_t_s * 15.0 / 3600.0)
```

At the site's latitude 0,29825° of longitude is **24,98 km**: the whole umbral path is slid 25 km
west relative to the observer, which at 0,58 s/km of across-track gradient is exactly the size of the
missing seconds.

**Adding that one term** (scratchpad `p1_fix.py`, same code otherwise):

| check | before | after | NASA published |
|---|---|---|---|
| central line 18:26 | 112,1 s | **113,0 s** | 113,0 s |
| central line 18:28 | 108,5 s | **109,3 s** | 109,3 s |
| central line 18:30 | 103,8 s | **104,6 s** | 104,6 s |
| central line 18:32 |  95,3 s | **95,8 s**  |  95,8 s |
| central-line mid-time | 4–6 s early | **0,1 s** | exact |
| **at the site (616 m)** | **59,24 s** | **68,86 s** | — |
| at the site (sea level) | — | 69,95 s | — |

Exact agreement, all four rows, plus the mid-times. And the site value moves from 59,2 s to
**68,9 s**, which matches the DE440s value computed with the correct umbral k (70,27 s, from the
project's own `pathgeom.json`) to **1,4 s**.

**So the true bracket is 68,9–70,3 s, not 59,2–74,1 s.** There is no fifteen-second spread, there is
no "extreme sensitivity" story to tell, and the paper's central methodological narrative in
§Resultados and §Discusión de incertidumbres ("la geometría es ... el más frágil en cuanto a
duración ... la horquilla entre soluciones de sombra es de unos quince segundos") is an artifact of
one missing term plus one wrong constant.

**SEVERITY: critical.** This is the paper's own nominated weakest claim and it fails. Two paragraphs
of physical hand-waving were written to explain a typo.

**FIX**: (1) add the ΔT term to `validate.py`; (2) switch the primary k to k2 (finding P1-B);
(3) quote 69–70 s; (4) delete the "sensibilidad extrema / amplificación ×10" paragraph and the
matching passage in §Discusión de incertidumbres; (5) the note "V2 ... shares no code and no
ephemeris with the DE440s calculation" is fine, but V2 must actually be validated — the module
claims "Every one of these must pass before the paper is allowed to quote a number" and V2 has no
pass/fail criterion at all (V1 and V3 have `'pass': ...`, V2 does not).

---

## P1-D. "55 km del límite norte" is a `brentq` artifact — it is the search bracket's endpoint, not a root — and the real figure is ~47 km (due north) / ~41 km (perpendicular).

**CLAIM** (paper.tex, three times: L306, L696, L770): "El emplazamiento está a \northLimit\,km
[55] del límite norte de la franja".

**VERDICT: WRONG (twice over).**

**EVIDENCE 1 — it was never computed.** `src/pathgeom.py` L79-88:
```python
inside = ns[dur > 0]
lo_edge, hi_edge = inside.min(), inside.max()      # hi_edge = 50.0
lim['north_limit_km'] = brentq(dur_at, hi_edge, hi_edge + 5.0, xtol=0.01)
```
`totality_duration()` **returns exactly `0.0`** when the observer is outside the path (L44-45).
`scipy.optimize.brentq` short-circuits: it evaluates the two endpoints and, finding `f(b) == 0`,
returns `b` immediately without iterating. `hi_edge + 5.0 = 55.0`. That is why `pathgeom.json`
records the suspiciously round `"north_limit_km": 55.0`. Change the `+ 5.0` to `+ 8.0` and the paper
would say 58 km; change it to `+ 3.0` and brentq would raise and the paper would say *nothing*. The
number is the arbitrary bracket width, not a property of the eclipse.

**EVIDENCE 2 — the true value.** Because duration goes as √(distance from the limit), extrapolate
D² linearly from the project's own scan (`pathgeom.json`: 38,31 s at +40 km, 17,09 s at +50 km):
zero at **+52,5 km** — and that is still with the inflated k1 (finding P1-B). With the ΔT-corrected
Besselian solver on NASA's own elements (scratchpad `p1_fix.py`, due-north scan at 616 m):
27,18 s at +40 km, 12,71 s at +45 km, 0 at +50 km → limit at **+46,4 km**.

Independent check against NASA's published table, no code at all: Lagrange-interpolate the tabulated
northern-limit points (18:26 → 44°27,4'N 4°56,9'W; 18:28 → 42°54,5'N 2°05,1'W; 18:30 → 40°39,9'N
3°17,7'E) onto the site meridian 0,709488 E. Result **41,632 N**, i.e. **46,6 km due north** of the
site at 41,212878 N. The corrected solver put it at 41,630 N — agreement to 220 m.

**EVIDENCE 3 — "distance to the limit" is not the due-north distance.** `pathgeom.py` scans due
north, but the limit runs at bearing ≈119° here (dlat/dlon = −0,412 from the same three NASA
points). The perpendicular — which is what any reader understands by "está a X km del límite" — is
46,6 × cos 28,7° = **40,9 km**.

So: 55 km claimed, ~47 km due north, ~41 km perpendicular. The margin is **25 % smaller** than
stated, on the very quantity the paper offers as its firmest geometric conclusion ("Lo que sí está
firmemente establecido es que el emplazamiento está dentro de la franja con margen").

A "~59 km implied by NASA's path table" figure is **not present anywhere in this repository**
(`grep` over `*.tex *.py *.json *.md`) and I cannot reproduce it from the table by any route; the
table implies ~47/41 km, not 59.

**SEVERITY: major.** Wrong number, wrong method, wrong direction convention, repeated three times
including in the operational conclusions.

**FIX**: make `totality_duration()` return a signed quantity (e.g. the signed miss distance
`min_t (m + L2')`) so a root-finder can actually bracket the limit; report the perpendicular
distance and say so; state ~41 km.

---
# PRIORITY 2 — OCULAR (ICNIRP 2013)

## P2-A. Omega = pi*gamma^2/4 — **SURVIVES**, and I can show ICNIRP itself used it.

**CLAIM** (`src/eye.py` L40, `src/spectral.py` L30): `OMEGA_GAMMA = np.pi * GAMMA**2 / 4.0`.

**VERDICT: SURVIVES.**

**EVIDENCE**: at γ = 11 mrad the exact cone solid angle 2π(1−cos(γ/2)) = 9,503294e−5 sr and
πγ²/4 = 9,503318e−5 sr — a relative difference of 2,5e−6, utterly negligible. The projected solid
angle π sin²(γ/2) agrees to the same order. Better: ICNIRP's own eq (13) radiance-dose limit
D_B^EL = 1e6 J m⁻² sr⁻¹ times this Ω gives **95,03 J m⁻²**, which ICNIRP rounds to the 100 J m⁻² of
eq (16). So πγ²/4 is demonstrably the convention ICNIRP used to derive the irradiance form the paper
invokes. No finding.

---

## P2-B. Full subtense (not half-angle) — **SURVIVES**.

**CLAIM**: \alphaSun = 9,18 mrad, "el diámetro angular del Sol ... es menor que el ángulo de
aceptación γ_ph = 11 mrad".

**VERDICT: SURVIVES.** `eye.py` L103: `alpha_src = 2.0 * np.radians(df['r_sun_arcsec']/3600.0)`
— full subtense, correctly labelled `# full subtense`. 2 × 946,66″ = 1893,3″ = 9,179 mrad. ICNIRP's
α is the full angular subtense of the source (α_min 1,5 mrad, α_max 100 mrad), so the comparison
9,179 < 11 mrad is the right one and the irradiance branch is correctly selected. No finding.

*(Minor: the `eye.py` module docstring L13 says "the Sun's angular subtense (9.3 mrad)" while the
computed and published value is 9,18 mrad. Stale text, no numerical consequence. SEVERITY: minor.)*

---

## P2-C. The 241,9 W/m² thermal-equivalent irradiance is WRONG: it substitutes the *photochemical* acceptance angle γ_ph for the *source* subtense α in a limit where α is defined as the source subtense. Non-conservative by a factor 1,198.

**CLAIM** (paper.tex L246-247 and L257-259): "$L_R^{EL} = 2{,}8\times10^{4}\,\alpha^{-1}$" ...
"El límite térmico equivale entonces a una irradiancia corneal ponderada de \ERlimit [241,9]
W/m²". Implemented in `src/eye.py` L56-58:
```python
def thermal_limit_irradiance():
    return thermal_limit_radiance(GAMMA) * OMEGA_GAMMA      # GAMMA = gamma_ph = 0.011
```
and `src/spectral.py` L155-156 / `eye.py` L116:
```python
out['L_thermal_W_m2_sr'] = out['E_thermal_W_m2'] / OMEGA_GAMMA
```

**VERDICT: WRONG.**

**EVIDENCE.** In ICNIRP 2013 the symbol α in L_R^EL = 2,8e4·α⁻¹ is **the angular subtense of the
source**, exactly as the project's own `literature.json` records it (`retinal_thermal_limit`:
`"L_R^EL = 2.8e4 * alpha^-1 W m^-2 sr^-1 (Table 4 ..., alpha in rad ...)"`, with
`alpha_min_rad: 0.0015`, `alpha_max_rad_t_ge_0p25s: 0.1`). γ_ph = 11 mrad is a quantity of the
**blue-light photochemical** limit — the same JSON files it under
`blue_light_photochemical_limit.gamma_ph_rad`. It has no role in the retinal thermal limit. The code
uses it in both places at once:

1. it divides the R-weighted corneal irradiance by Ω(γ_ph) instead of Ω(α_source), which
   **under-states the source radiance by (9,179/11)² = 0,696** — a 30 % error, in the unsafe
   direction; and
2. it evaluates the limit at α = γ_ph = 11 mrad instead of α = 9,179 mrad, which **over-states the
   permitted radiance by 11/9,179 = 1,198**.

The two errors do not cancel; the hazard *ratio* is wrong by γ_ph/α = **1,198** and the equivalent
corneal irradiance limit is wrong by the same factor. Doing it with the source subtense
(21991·α = 7000π·α):

| quantity | paper | correct (α = 9,179 mrad) |
|---|---|---|
| equivalent corneal irradiance limit | 241,9 W/m² | **201,9 W/m²** |
| thermal hazard ratio at C1 (\thermRatioCOne) | 1,087 → "1,09", "un 9 % por encima" | **1,302 → 30 % por encima** |
| thermal ratio, uneclipsed Sun at maximum (\thermRatioMax) | 0,284 | **0,340** |

(Recomputed from the project's own `data/eye_timeseries.csv`, row C1: E_thermal = 262,849 W/m²,
α_source = 9,179051 mrad.)

Note also that `eye.py`'s own module docstring L18 states the applicability condition as
"L_R = E_R / Omega_gamma <= 2.8e4 / alpha, **alpha >= gamma**" — but the entire ocular section
rests on the *opposite* inequality, α = 9,18 mrad **<** γ = 11 mrad (paper.tex L253-255). The code's
stated precondition is false for its own source.

**SEVERITY: major.** It is a safety limit, the error is 20 % in the unsafe direction, and the paper
converts it into a public statement ("se supera ligeramente ... un 9 % por encima") that
understates the exceedance by more than a factor three in excess terms (9 % → 30 %).

**FIX**: pass the per-timestep source subtense into both the radiance conversion and the limit:
`L = E_R / (pi*alpha**2/4)` and `L_lim = 2.8e4/alpha`, i.e. simply `ratio = E_R / (7000*pi*alpha)`.
Report 201,9 W/m² (or drop the "equivalent irradiance" shortcut entirely, since it is only valid
for one particular α).

---

## P2-D. Applying the eclipse transmission to the retinal **thermal** hazard contradicts the paper's own physics: radiance is conserved under occultation.

**CLAIM** (`src/spectral.py` L146,155): `'E_thermal_eclipsed': integ(dni_l_ecl * Rw)` and
`out['L_thermal_eclipsed'] = out['E_thermal_eclipsed'] / OMEGA_GAMMA` — i.e. the R-weighted
**radiance** used against the thermal limit is scaled down by the eclipse transmission, falling to
zero as obscuration → 1. Table 5 and figure 6 present it that way.

**VERDICT: WRONG (for the thermal limit; the same treatment is legitimate for the photochemical one).**

**EVIDENCE.** The paper states the correct physics itself, in prose, at L610-611:
> "quien mira al Sol está fijando precisamente el creciente de fotosfera, cuyo brillo *de superficie*
> el eclipse no altera en absoluto: **la Luna quita área, no radiancia**."

Exactly. Radiance is invariant under occultation. The retinal **thermal** limit is a *radiance*
limit (L_R^EL = 2,8e4/α) precisely because thermal injury depends on the retinal irradiance inside
the image, not on the total flux: a 99 %-obscured Sun still projects a crescent whose retinal
irradiance is that of the full photosphere. Dividing the *eclipsed* corneal irradiance by a
*fixed* Ω asserts the opposite — that the source radiance falls with obscuration — and drives the
tabulated thermal hazard ratio to zero as C2 approaches.

The correct treatment lets α, not L, respond to the eclipse: for a crescent ICNIRP takes
α = (α_max+α_min)/2 with α_min clamped at 1,5 mrad, so a thin crescent gives α → (9,18+1,5)/2 =
5,34 mrad and a limit *raised* to 2,8e4/0,00534 = 5,24e6 W m⁻² sr⁻¹ against an **unchanged**
photospheric radiance. The thermal hazard therefore decays roughly as α, i.e. by a factor ~1,7
between the full disc and a thin crescent — not by the factor ~10³ the transmission scaling implies.

The photochemical branch is unaffected: eq (16)/(17) are corneal-irradiance limits derived by
averaging over the γ_ph cone (see P2-A), the crescent stays inside that cone, and total flux is the
right quantity there. So the answer to "is scaling E_B by the direct-beam transmission legitimate?"
is **yes for E_B, no for E_R**, and the paper does both the same way.

**SEVERITY: major.** It is the mechanism by which the paper's tables show the retinal thermal
hazard vanishing during the deep partial phases — which is the phase the safety advice is about.

**FIX**: compute the thermal hazard from the (constant) photospheric R-weighted radiance attenuated
only by the atmosphere, with α taken as the ICNIRP mean subtense of the *visible crescent*, and say
so. At minimum, stop presenting `L_thermal_eclipsed` as a radiance.

---

## P2-E. The (d/3)² pupil correction — **SURVIVES as physics**, but it is an extrapolation beyond the guideline, and it is applied to only one of the two limits ICNIRP states a pupil assumption for.

**CLAIM** (paper.tex L593-599): "la propia guía indica que el límite fotoquímico *se derivó
suponiendo un diámetro de pupila de aproximadamente 3 mm*. La dosis retiniana escala con el área
pupilar, de modo que un observador cuya pupila se haya abierto hasta $d$ milímetros recibe $(d/3)^2$
veces la dosis que el límite presupone."

**VERDICT: SURVIVES (no double-count), with two caveats below.**

**EVIDENCE that it is not a double-count**: ICNIRP eq (2), quoted in the project's own
literature.json, gives retinal irradiance E_r = π L τ d_p²/(4 f²) — retinal dose is strictly ∝ d_p²
at fixed source radiance, and for a source of fixed subtense the corneal irradiance E is ∝ L. So a
corneal-irradiance limit *must* carry a pupil assumption, ICNIRP states it is ~3 mm
(`blue_light_photochemical_limit.pupil_assumption`, verbatim), and rescaling by (d/3)² is the
correct and only way to transport the limit to another pupil. Nothing is folded in twice. The
arithmetic in `eye.py` L64-79 checks out against the published macros
(100/24,02 = 4,2 s; 100/1,579 = 63 s; 100/(1,579·(7/3)²) = 12 s).

**CAVEAT 1 (asymmetry, unsafe direction).** literature.json also records, verbatim, ICNIRP's pupil
assumption for the **thermal** limit: *"two different pupil diameters were assumed, 7 mm for the
dark-adapted eye and approximately 3 mm for bright light conditions."* The paper applies a pupil
correction to the photochemical limit only. Its own worst-case scenario — the reappearance of the
photosphere at C3 with a fully dark-adapted eye — is exactly the case where that matters, and it is
also exactly where P2-D's error is largest. VERDICT for the omission: **UNSUPPORTED**, minor-to-major.

**CAVEAT 2 (status).** ICNIRP does not instruct the user to rescale; the 3 mm is a stated derivation
assumption. Applying (d/3)² is defensible and conservative, but it is the paper's own extrapolation,
not "lo que la guía indica". The text at L595 ("la propia guía indica que el límite fotoquímico se
derivó suponiendo...") is accurate about the *assumption*; the *rescaling* is the paper's, and the
paper should say so. It partly does at L624-627 ("la elección se declara como acotación"). Borderline
**CORRECT-BUT-FRAGILE**, minor.

**CAVEAT 3 (internal inconsistency in what gets quoted).** The abstract (L64-66) quotes the 7 mm
figure operationally; §Conclusiones L788-789 quotes the 3 mm figure ("hasta unos once minutos antes
de la totalidad" = \unlimitedFromPThree = −11,6 min) even though L621-623 says "Para el tercer
contacto ... la de 7 mm es la que hay que respetar" (−5,3 min). The conclusions quote the less
protective of the two. SEVERITY: minor, but it is the sentence a reader acts on.

---

## P2-F. E_B itself — **SURVIVES** an independent check.

I recomputed the blue-weighted corneal irradiance from first principles rather than trusting
SPECTRL2: extraterrestrial ∫E_λ B(λ)dλ ≈ 1,8 W m⁻² nm⁻¹ × ∫B dλ ≈ 67 nm ≈ 120 W/m²; Rayleigh
τ(440 nm) ≈ 0,216 at 950 hPa and aerosol τ(440) ≈ 0,21 for AOD₅₅₀ = 0,16 with Ångström α ≈ 1,3.
At C1 (m = 3,89): 120·e^(−0,216·3,89)·e^(−0,21·3,89) = **23 W/m²** vs the paper's 24,0. At maximum
(m = 10,7): **1,3 W/m²** vs the paper's 1,58. Both agree within the uncertainty of my crude Ångström
exponent. The headline qualitative conclusion — the uneclipsed low Sun still exceeds the 1 W/m²
prolonged-exposure limit — **SURVIVES**. No finding.

---
