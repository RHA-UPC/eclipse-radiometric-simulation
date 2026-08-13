# Adversarial review — §Perseidas (paper.tex)

Reviewer stance: refute. Every claim assumed wrong until independently reproduced.
Independent recomputation with skyfield + plain spherical trig, cross-checked against
the primary IMO 2026 Meteor Shower Calendar where reachable.

Site: 41.212878 N, 0.709488 E, 616.1 m. Totality 2026-08-12 18:29:23.7–18:30:37.8 UT.

Files under review:
- `paper/paper.tex` (§Perseidas, L292–313; Resultados L690–718)
- `paper/keyvals.tex` (L57, 70–72, 78–81)
- `src/perseids.py`
- `data/perseids.csv`, `perseids_meta.json`, `literature.json`
- `paper/tab6_perseids.tex`

---

## F1 — The Table 6 interpolation is evaluated at the wrong epoch (Aug 12.0 UT, not 12.77)

**CLAIM.** `paper.tex:298-300`: "La posición del radiante para el 12 de agosto, \radiantRA\textdegree{}
y \radiantDec\textdegree, se interpola de la tabla 6 del mismo documento."
`keyvals.tex:79-80`: `\radiantDec{57,4}`, `\radiantRA{47,4}`.
Used at `paper.tex:692-693` as the radiant **"En el instante de la totalidad"**.
Code: `perseids.py:107` — `ra, dec = radiant_on(12.0)`.

**VERDICT. WRONG** (arithmetic correct, epoch wrong).

**EVIDENCE.** I retrieved the primary source (https://www.imo.net/files/meteor-shower/cal2026.pdf,
IMO INFO(3-25)) and extracted Table 6 with `pdftotext -layout`. The PER row reads verbatim:

```
Aug     5   ...   37◦ +56◦
Aug 10      ...   45◦ +57◦
Aug 15      ...   51◦ +58◦
Aug 25      ...   63◦ +58◦
```

`literature.json` transcribes this faithfully — the transcription is **not** the problem.
Implied drift: **+1.2 deg/day in alpha, +0.2 deg/day in delta** (not the +1.4/+0.25 assumed in
the review brief; the brief's hypothesis that delta was moved 0.6 deg in 8 h at ~1.8 deg/day is
**not** the mechanism and does not hold — see F2).

The real defect: `radiant_on(12.0)` interpolates to **August 12.000 UT**, but totality is at
**2026-08-12 18:30:00 UT = August 12.7708**. The code discards **18.5 hours = 0.77 day** of
radiant drift. Correct linear interpolation of the same table at the totality epoch:

| epoch | alpha | delta |
|---|---|---|
| Aug 12.0000 (**what the paper uses**) | 47.400 | 57.400 |
| Aug 12.7708 (**totality**) | **48.325** | **57.554** |
| Aug 13.083–13.167 (IMO stated max) | 48.70–48.80 | 57.62–57.63 |

So the published radiant is **0.93 deg too low in RA and 0.15 deg too low in Dec** on the
paper's own stated method. The paper's prose is self-contradictory: §Metodología calls it "la
posición del radiante para el 12 de agosto" (a whole-day label, consistent with 12.0), while
§Resultados uses the identical numbers as the radiant "en el instante de la totalidad".

Secondary, and worth stating because it bounds how much precision the source can carry: the
IMO's own narrative radiant at maximum is "α = 48◦, δ = +58◦" (cal2026.txt:455, verbatim),
whereas linear interpolation of *its own* Table 6 to the maximum gives 48.7 / +57.6. The two
IMO statements disagree by 0.7 deg in RA and 0.4 deg in Dec. **Quoting the interpolation to
0.1 deg (47,4 / 57,4) asserts a precision the source does not support** — Table 6 is tabulated
to whole degrees at 5-day spacing.

Also: Table 6's caption is verbatim "Table 6 (next page). Radiant positions during the year in
α and δ." (cal2026.txt:1165). It states **no time-of-day and no equinox**. The calendar's
glossary fixes the equinox only for λ⊙ ("All λ⊙ are given for the equinox 2000.0",
cal2026.txt:1080) — the J2000 status of the Table 6 *radiant* coordinates is an unstated
assumption in both the source and the paper (`literature.json` asserts "(J2000)" in
`radiant_drift_note`; that parenthetical is **not** in the source).

**SEVERITY. Major** as a methodological defect (the stated method is not the method executed,
and it is the difference between "for August 12" and "at totality"); **minor** in propagated
effect (see F2: 0.08 deg of altitude, <1 % of the rate).

**FIX.** `perseids.py:107` → `radiant_on(12.0 + (18 + 30/60)/24)`, i.e. interpolate at the
totality epoch, giving 48.3 / +57.6. Then either quote the radiant to whole degrees
(48 / +58, matching the source's own precision and its narrative value) or state explicitly
that the 0.1-deg figures are a linear interpolation of a whole-degree, 5-day-spaced table and
carry ~0.5 deg of source-internal inconsistency. Delete the unsourced "(J2000)" in
`literature.json:radiant_drift_note` or attribute it as an assumption.

---

## F2 — Radiant altitude 9,2 deg: reproduces, but is geometric while the Sun separation mixes conventions

**CLAIM.** `keyvals.tex:78`: `\radiantAlt{9,2}`. `paper.tex:692-693`: "el radiante de las
Perseidas está a solo \radiantAlt\textdegree{} de altura".

**VERDICT. SURVIVES** (value reproduces), with a **CORRECT-BUT-FRAGILE** rider on the
refraction convention.

**EVIDENCE.** Independent recomputation, skyfield + DE440s, site 41.212878 N / 0.709488 E /
616.1 m, at MAX = 2026-08-12T18:30:00Z:

| radiant | alt (geometric) | alt (refracted) | az |
|---|---|---|---|
| 47.4 / +57.4 (paper) | **9.1836** | 9.2736 | 6.239 |
| 48.33 / +57.55 (F1-corrected) | 9.2614 | 9.3508 | 5.718 |
| 48 / +58 (IMO narrative) | 9.7279 | 9.8133 | 5.826 |

The paper's 9.184 → 9.2 is exactly reproduced, and `perseids_meta.json` stores
9.183587221251518. The F1 epoch error moves it to 9.261 — still 9.2 after rounding. **The
altitude claim itself is not falsified**, and the F1 error costs only sin(9.261)/sin(9.184)
= **+0.85 % on the rate**. The value is **geometric** (`perseids.py:57` calls `.altaz()` with
no refraction argument); refracted it would be 9.27 → 9.3.

Refraction consistency, since the brief asks: the ZHR reduction's sin(h_R) uses the
**geometric** radiant elevation by IMO convention, so `perseids.py:81` using the geometric
value is right. Effect either way is +1.0 % on the rate — immaterial.

**The real inconsistency is in the Sun separation, not the altitude.** `perseids.py:138`
takes the Sun's **refracted** altitude (`sun_alt_refracted_deg` = 4.745) while `perseids.py:140`
takes the radiant's **geometric** altitude (9.184). Two different conventions are dotted
together in the same triangle.

**SEVERITY. Minor.**

**FIX.** State in the paper that 9,2 deg is the geometric (unrefracted) radiant elevation, as
the ZHR reduction requires. Use the geometric Sun altitude (`sun_alt_geometric_deg` = 4.593)
at `perseids.py:138` so both legs of the separation share a convention.

---

## F3 — Radiant–Sun separation 80,0 deg: survives, but is epoch-sensitive and over-precise

**CLAIM.** `keyvals.tex:81`: `\radiantSunSep{80,0}`. `paper.tex:694-696`: "El radiante está a
\radiantSunSep\textdegree{} del Sol eclipsado, de modo que ningún encuadre razonable contiene
ambos."

**VERDICT. SURVIVES** (conclusion), **OVERSTATED** (the trailing digit).

**EVIDENCE.** My independent separation, radiant vs Sun at MAX (Sun alt 4.745 refr / 4.593
geom, az 285.669):

- paper radiant (47.4/+57.4): **79.957 deg** → 80.0 ✓ reproduces `perseids_meta.json`
- F1-corrected radiant (48.33/+57.55): **79.439 deg** → 79.4
- IMO narrative radiant (48/+58): 79.520 deg

The headline number shifts by **0.5 deg** the moment the epoch bug in F1 is fixed, and by
0.44 deg if the IMO's own narrative radiant is used instead. Quoting "80,0" to a tenth
implies a stability the input does not have. The **physical conclusion is unaffected**: at
~79–80 deg the radiant and the eclipsed Sun cannot share any rectilinear frame (the widest
entry in `tab6_perseids.tex` is 69.7 deg diagonal-wise across the long axis, so ~35 deg
half-field), so "ningún encuadre razonable contiene ambos" **holds**.

**SEVERITY. Minor.**

**FIX.** Quote "unos 80\textdegree" or "79--80\textdegree" rather than 80,0; the conclusion
carries without the decimal.

---
