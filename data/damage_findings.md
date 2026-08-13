# Damage threshold findings — solar image on CMOS sensor

Task: find published damage thresholds for silicon imagers usable in the disc-source
steady-state rescaling `q_real = q_lab * a_lab / a_real` (centre rise `q*a/k` for a disc
of radius `a` on a semi-infinite solid of conductivity `k`).

RULE OBSERVED IN THIS FILE: no number appears here without a retrievable source AND a
verbatim quote. Anything not verified is written as NOT FOUND.

Status: IN PROGRESS (appended incrementally as each item is verified).

---

## P1. Schwarz, Ritt, Koerber & Eberle (2017) — CONFIRMED, full Table 4 recovered

**Reference.** B. Schwarz, G. Ritt, M. Koerber, B. Eberle, "Laser-induced damage threshold
of camera sensors and micro-optoelectromechanical systems", *Optical Engineering* **56**(3),
034108 (March 2017). DOI 10.1117/1.OE.56.3.034108.
Open access, CC BY 4.0 (also deposited as Fraunhofer-Publica handle/publica/250453,
DOI 10.24406/publica-r-250453).
Retrieved from: publisher PDF, full text held locally at
`/tmp/claude-1000/-home-bcn/d9d8b70c-06ad-43b3-999a-74b92e469356/scratchpad/schwarz2017.txt`
(and `schwarz2017_raw.txt`, `oe.txt`); record cross-checked against
https://api.openalex.org/works/doi:10.1117/1.OE.56.3.034108 and
https://publica.fraunhofer.de/handle/publica/250453 .

### P1.a — CW source, spot size, exposure regime (the load-bearing parameters)

VERBATIM (Sec. 2.1, experimental setup, bullet list of laser sources):

> "• CW-laser system: Diode-pumped solid-state laser (DPSS, Laser Quantum Ventus 532)
> with a wavelength of 532 nm and a beam size of 1.5 mm (1∕e2). The available laser power
> exceeded 500 mW."

VERBATIM (same section, on power control and exposure gating):

> "The power level of the CW-laser source was controlled by changing the current of the
> diode driver from 49% up to 100%. Furthermore, we used a set of neutral density filters
> with different optical densities (ODs) ranging from OD 0.5 to OD 3.0. To control different
> exposure times of the CW-laser source, we used a laser shutter (Uniblitz Shutter Systems
> VS25). Finally, the laser beam was focused by a lens (Apo-Rodagon N 4.0/80, Qioptiq) with
> a focal length of f = 80 mm and an aperture of f∕5.6, thus the beam diameter in the focal
> plane was measured by the beam profiler BP209 from Thorlabs using a scanning slit method.
> The measurement with the beam profiler took place before the actual experiment. Therefore,
> we were able to determine the diameter (1∕e2) of the laser spot in the focal plane and got
> a value of 2ω1 = 25.7 μm for the CW-laser source and 2ω2 = 28.2 μm for the pulsed laser
> source."

VERBATIM (definition of the area used to normalise the quoted power densities, Eqs. 1-2):

> "The effective diameter deff of a uniform cylindrical beam with the same peak intensity and
> total power as a cylindrical Gaussian beam is15
>     deff = √2 ω;                                             (1)
> and the associated effective spot size Aeff
>     Aeff = πω2 / 2 .                                          (2)
> According to this, the effective spot size in the focal plane is Aeff = 3.12 × 10−6 cm2 for
> the pulsed laser and Aeff = 2.59 × 10−6 cm2 for the CW-laser."

VERBATIM (exposure regime / test protocol, Sec. 2.2):

> "The test site of the investigated object was positioned in the focal plane. To measure the
> damage threshold, we used the 1-on-1 test mode, so each test site was irradiated by one
> pulse or in the case of CW-laser radiation for a certain exposure time (0.25, 1, 5, and 10 s)."

SO, FOR THE RESCALING `q_real = q_lab * a_lab / a_real`:
- Source: CW (continuous wave), 532 nm, focused, NOT pulsed.
- Exposure durations: 0.25, 1, 5, 10 s — i.e. long enough that a 25.7 µm spot in silicon is
  fully at its steady state (a²/kappa for a = 12.85 µm is ~2 µs), so these ARE steady-state
  numbers in the sense the model needs.
- Spot size quoted by the authors, verbatim, three consistent ways:
  1/e² DIAMETER 2ω1 = 25.7 µm  →  ω = 12.85 µm (1/e² radius),
  effective (top-hat-equivalent) diameter deff = √2 ω, effective area Aeff = 2.59e-6 cm².
  [The values 25.7 µm and 2.59e-6 cm² are verbatim from the paper. The step
  "ω = 25.7/2 = 12.85 µm" and "deff = √2 × 12.85 = 18.2 µm, effective RADIUS 9.08 µm" is
  arithmetic performed HERE, not quoted from the paper — flagged as derived.]
- Their thresholds are POWER DENSITIES in kW/cm². Because Aeff is the top-hat-equivalent
  area of a Gaussian, a threshold quoted as F_th (kW/cm²) is the PEAK on-axis intensity.
  The paper does not state the conversion in words; the reader must decide which radius to
  put in a_lab. The conservative choice consistent with a disc of uniform flux q is the
  effective radius a_lab = deff/2 = 9.08 µm (derived above), NOT 12.85 µm.
- Note the authors also report a fitted "reconstructed beam diameter" (RBD) per condition
  (see P1.c) which differs from 25.7 µm; RBD is a fit artefact of the damage-area slope,
  defined verbatim as: "We defined the 'reconstructed beam diameter' (RBD) as the beam
  diameter we got from the slope of Eq. (4). It represents the required beam diameter of the
  laser source on the surface of the test object, if the expansion of disturbance in the
  camera image resembled the physical damage in the sensor."

### P1.b — Sensors tested (Table 1)

VERBATIM caption: "Table 1 Specifications of the samples under test."

| Test sample | The Imaging Source DFK21AU04 (color) | The Imaging Source DMK21AU04 (monochromatic) | The Imaging Source DFK22AUC03 (color) | The Imaging Source DMK22AUC03 (monochromatic) | Texas Instruments DLP Discovery 4100 Development Kit |
|---|---|---|---|---|---|
| Device | Sony ICX098BQ | Sony ICX098BL | Aptina MT9V024 | Aptina MT9V024 | Texas Instruments DLP7000 |
| Device type | CCD | CCD | CMOS | CMOS | DMD |
| Format (in.) | 1/4 | 1/4 | 1/3 | 1/3 | 0.7 |
| Resolution (H × V) (px) | 640 × 480 | 640 × 480 | 744 × 480 | 744 × 480 | 1024 × 768 |
| Pixel size (H × V) (μm2) | 5.6 × 5.6 | 5.6 × 5.6 | 6×6 | 6×6 | 13.68 × 13.68 |
| Bit depth (bit) | 8 | 8 | 8 | 8 | — |
| Sensitivity (lx) | 0.1 | 0.03 | 5 | 0.1 | — |
| IR cut filter | Yes | No | Yes | No | — |
| Shutter | Global | Global | Global | Global | — |
| Exposure time used in the experiment (ms) | 120 | 120 | 188 | 188 | — |

(Table 1 is transcribed as laid out in the source; the mono/color assignment of the two Sony
part numbers is as printed. NOTE the paper's body text contradicts its own Table 1 on which
Sony part is which: body text says "an imaging sensor (monochromatic: Sony ICX098BQ, color:
Sony ICX098BL)" while Table 1 lists DFK21AU04 (color) = ICX098BQ and DMK21AU04
(monochromatic) = ICX098BL. Reported as found; do not silently resolve.)

Additional verbatim on packaging, which matters because it sets the optical path:

> "All the investigated samples were encapsulated with a protecting glass plate, so we did not
> expect any contamination (e.g., dust particles) directly on the bare imaging sensor. […]
> The distance from the surface of the cover glass to the surface of the imaging sensor was
> about 1.94 ± 0.15 mm in case of the CMOS and CCD cameras"

### P1.c — TABLE 4, complete, verbatim

VERBATIM CAPTION: "Table 4 Results from the 1-on-1 test for CW-laser sources."

Column headers verbatim: "Test sample" | "Damage threshold experimental data (kW∕cm2)" |
"Damage threshold fit (kW∕cm2)", with the sub-header row "Exposure time (s)" spanning
0.25 / 1 / 5 / 10 under each of the two blocks.

| Test sample | exp. 0.25 s | exp. 1 s | exp. 5 s | exp. 10 s | fit 0.25 s | fit 1 s | fit 5 s | fit 10 s |
|---|---|---|---|---|---|---|---|---|
| **CMOS** Mono | 85 | 85 | 57 | 49 | 75 ± 7 | 73 ± 15 | 56 ± 4 | 48 ± 3 |
| **CMOS** Color | 46 | — | — | — | 56.7 ± 1.8 | — | — | — |
| **CCD** Mono | 163 | 139 | 139 | 139 | 146 ± 9 | 118 ± 9 | 93 ± 19 | 95 ± 21 |
| **CCD** Color | 16 | 16 | 9 | 9 | 14 ± 2 | 13 ± 2 | 11 ± 1 | 8.1 ± 0.8 |
| **DMD** | 19.3 | — | — | — | 21.9 ± 1.2 | — | — | — |

ALL UNITS kW/cm². (In the source, the ± signs render as bare spaces in the extracted text;
the body text confirms each of them explicitly, e.g. "Fth = [75 ± 7; 73 ± 13; 56 ± 4; 48 ± 3]
kW∕cm2" — note the body text says 73 ± 13 for CMOS mono at 1 s where Table 4 reads 73 ± 15.
Reported as found; the discrepancy is in the published paper, not in this transcription.)

THE SINGLE MOST USABLE NUMBER FOR A CONSUMER CMOS: **49 kW/cm² experimental / 48 ± 3 kW/cm²
fitted, monochrome CMOS (Aptina MT9V024), 532 nm CW, 10 s exposure, 1/e² spot diameter
25.7 µm (Aeff = 2.59e-6 cm²).**
Lowest CMOS number of any kind: **46 kW/cm² (color CMOS, 0.25 s, experimental).**

### P1.d — Damage classes and what each threshold actually means

VERBATIM, operational definition of "damage" (Sec. 3.1):

> "Finally, we defined damage as a 10% deviation from intensity of the normalized and scaled
> reference image."

VERBATIM CAPTION AND CONTENTS OF TABLE 2: "Table 2 Groups of laser-induced impact on the devices"

| Group | Description |
|---|---|
| I | No damage is observed |
| II | Spot damage occurs (CMOS and CCD camera) |
| III | Spot damage and line damage occurs (CMOS camera), spot damage elongates in vertical direction and finally transfers into full line damage (CCD camera) |
| IV | Star-shaped spot damage including full line damage (CMOS camera) |

VERBATIM, what the CW thresholds correspond to physically (Sec. 3.5, CW on CMOS):

> "In contrast to pulsed laser-induced damage, no visible damage occurs in the dark image.
> Therefore, only the bright images were used to analyze the visible damage. First damage
> occurred in case of the monochrome CMOS cameras for exposure times of 0.25, 1, 5, and 10 s
> at a power density of 85, 85, 57, and 49 kW∕cm2, respectively. The shape of the damage was
> mostly circular and slightly blurred, because the damaged pixel became less sensitive but
> did not fail completely. The damage appeared dark in the flat-field image in opposition to
> the pulsed-laser damage, where the damage appeared white in the flat-field image. We also
> observed line damage starting from a power density of 196 kW∕cm2."

=> CW CMOS damage class at threshold: PERMANENT LOSS OF SENSITIVITY of the irradiated pixels
(they still respond, but ≥10% down and they stay down — visible only in flat-field/bright
images, not in the dark frame, i.e. NOT hot pixels and NOT reversible saturation). It is a
degradation-of-responsivity threshold, one step BELOW dead pixels. Dead columns/rows (line
damage) on CMOS need 196 kW/cm² — a further factor ~4 above the 49 kW/cm² spot threshold.

VERBATIM (Sec. 3.5, color CMOS CW):

> "In the case of the color CMOS cameras, damage started at a power density of 46 kW∕cm2 for
> an exposure time of 0.25 s. No line damage was observed. Damaged pixels seemed almost
> purple, in other words, a combination of blue and red pixel values. Just as it was in the
> case of damage to the monochromatic device, the shape appeared almost circular and blurred.
> From the fit in Fig. 9(b), we got a damage threshold of Fth = (56.7 ± 1.8) kW∕cm2 and an
> RBD 2ω0 = (12.6 ± 0.5) μm."

VERBATIM (Sec. 3.6, CW on CCD, both variants):

> "For the monochrome CCD camera, it was quite challenging to cause damage to the sensor.
> Damage started to occur for exposure times of 0.25, 1, 5, and 10 s at power densities of
> 163, 139, 139, and 139 kW∕cm2, respectively. No damage occurred below a value of
> 135 kW∕cm2 for exposure times of 1, 5, and 10 s and below a value of 159 kW∕cm2 for an
> exposure time of 0.25 s. The shape of damage is almost circular and the damaged pixels are
> dark in the output image. From the fit in Fig. 10(a), we got a damage threshold of
> Fth = [146 ± 9; 118 ± 9; 93 ± 19; 95 ± 23] kW∕cm2 and an RBD 2ω0 = [22 ± 3; 27 ± 3;
> 25 ± 3; 25 ± 3] μm, respectively."

> "First damage for exposure times of 0.25, 1, 5, and 10 s started at a power density of
> 16, 16, 9, and 9 kW∕cm2 and no damage occurred below a level of 9.2, 9.2, 5.5, and
> 5.5 kW∕cm2. No line damage was observed. The damage shape was circular. Damaged pixels
> were almost purple or deep red because of the high red levels. The information of the green
> pixels was reduced, but they were not completely insensitive. From the fit in Fig. 10(b),
> we estimated a damage threshold of Fth = [14 ± 2; 13 ± 2; 11 ± 1; 8.1 ± 0.8] kW∕cm2 and an
> RBD of 2ω0 = [18.5 ± 3.6; 18.5 ± 3.6; 18.6 ± 3.6; 17.5 ± 3.8] μm."

=> LOWEST "NO DAMAGE BELOW" FLOOR IN THE WHOLE CW DATASET: **5.5 kW/cm² (color CCD, 5 and
10 s)**, which is a true lower bound, not a threshold. For CMOS the paper gives NO
"no damage below" floor for the CW case.

VERBATIM (Sec. 3.3, pulsed, on the colour-filter array — the ONLY statement in the paper
attributing damage to the Bayer/CFA layer):

> "The fact that the damage threshold of the color CMOS camera was lower than the damage
> threshold of the monochromatic device is an indication that the first damage in color
> cameras emerges in the Bayer filter."

VERBATIM (abstract, on permanence):

> "In addition to the destruction of single pixels, we observe aftereffects, such as
> persistent dead columns or rows of pixels in the sensor image."

VERBATIM (Sec. 3.4, catastrophic destruction levels, PULSED not CW):

> "The camera sensor was completely destroyed in the sense that the output image no longer
> reacted to incident light, at a level of 2.9 kJ∕cm2."
> "At a fluence value of F = 147 J∕cm2, the whole sensor was broken."
> "At a level of 3.16 J∕cm2, the camera was destroyed."

NOT FOUND: any CW power density at which the sensor was catastrophically destroyed. The
paper reports catastrophic destruction only for the pulsed regime.
NOT FOUND: any statement of microlens damage, or of a reversible-saturation threshold, in
this paper.
NOT FOUND: any temperature. The paper measures irradiance thresholds only and never converts
them to a temperature; the section title "Estimation of the Damage Threshold Based on
Thermal-Induced Damages" refers to the log-area fitting method, not to a temperature.

### P1.e — Table 3 (PULSED, for completeness; NOT usable for a CW solar image)

VERBATIM CAPTION: "Table 3 Results from the 1-on-1 test for pulsed laser sources."
Pulsed source, verbatim: "The temporal pulse length was 10 ns and the beam diameter was
6 mm (1∕e2)." Focused spot 2ω2 = 28.2 µm, Aeff = 3.12e-6 cm².
Columns: Damage threshold experimental data (J/cm²) | Damage threshold fit to data (J/cm²) |
Line-damage threshold (J/cm²) | Star-shape^a or vertical elongated^b threshold (J/cm²).
Footnotes verbatim: "a In case of damage to CMOS sensor." / "b In case of damage to CCD sensor."

| Test sample | exp. (J/cm²) | fit (J/cm²) | line-damage (J/cm²) | star/elongated (J/cm²) |
|---|---|---|---|---|
| CMOS Mono | 0.099 | 0.08 ± 0.02 | 14.9 | 47.2 |
| CMOS Color | 0.053 | 0.035 ± 0.01 | 38.6 | 102 |
| CCD Mono | 0.032 | — | 0.35 | 0.14 |
| CCD Color | 0.034 | 0.041 ± 0.003 | 0.49 | — |

---
## P3.a — Consumer CMOS image-sensor datasheet, max operating / storage temperature — CONFIRMED

**Reference.** OmniVision Technologies, *OV5647 — 1/4" color CMOS QSXGA (5 megapixel) image
sensor with OmniBSI technology, datasheet*, PRELIMINARY SPECIFICATION, version 1.0,
document dated 11.03.2009, "Copyright © 2009 OmniVision Technologies, Inc."
(This is the sensor in the Raspberry Pi Camera v1; the PDF is public.)
Local copy: `.../scratchpad/ov5647.pdf`, 140 pages; text `.../scratchpad/ov5647.txt`.

VERBATIM, Sec. 8.1, "table 8-1 absolute maximum ratings":

> "ambient storage temperature        -40°C to +125°C"

with the verbatim footnote to that table:

> "a. exceeding the absolute maximum ratings shown above invalidates all AC and DC electrical
> specifications and may result in permanent damage to the device. Exposure to absolute
> maximum rated conditions for extended periods may affect device reliability."

VERBATIM, Sec. 8.2, "table 8-2 functional temperature":

> "operating temperature rangea        -30°C to +70°C"
> "stable image temperature rangeb     0°C to +50°C"
> "a. sensor functions but image quality may be noticeably different at temperatures outside
> of stable image range"
> "b. image quality remains stable throughout this temperature range"

=> USABLE NUMBERS: max storage (absolute maximum rating) **+125 °C**; max operating
**+70 °C**; upper end of "stable image" range **+50 °C**. Note that +125 °C is explicitly an
ABSOLUTE MAXIMUM RATING (a do-not-exceed reliability limit), not a damage temperature, and
+70 °C is a functional/image-quality limit, not a damage temperature either. Neither is a
destruction threshold and the paper must not present them as one.

Cross-check attempted on ON Semiconductor AR0521: the ON Semi "AR0521 Product Overview"
(local `.../scratchpad/tis_ar0521.pdf`) is a marketing overview that states
"For complete documentation, see the data sheet." and carries NO temperature table.
The full AR0521 datasheet is behind a login/NDA. Sony IMX477 and IMX219 full datasheets are
likewise not public (the files `imx477.pdf`, `ar0521.pdf`, `li_imx219.pdf` left by an earlier
run are HTML/JavaScript error pages, not PDFs).
=> Sony IMX and ON Semi AR max-temperature specs: NOT FOUND in any public PDF.

---

## P3.b — Colour-filter-array (pigmented photoresist) thermal limits — PARTIAL, AND IT CUTS AGAINST THE PAPER'S CLAIM

**Reference.** Y. Nemoto and N. Sasaki (Fujifilm Corp.), "Method for producing color filter
for image sensor", US patent 8,053,149 B2, granted 8 November 2011.
Retrieved from https://patents.google.com/patent/US8053149B2/en .

VERBATIM (post-bake step of colour-filter manufacture):

> "heating the coating film which has been irradiated with ultraviolet radiation at 100° C.
> to 300° C."

> "the heating temperature in this process is, preferably, from 100 to 300° C., more
> preferably, from 150 to 250° C."

VERBATIM (the only degradation statement located):

> "discoloration of a dye may possibly occur in a case of using a dye sensible to heat."

**Reference.** H. Takakuwa (Fujifilm Corp.), "Colored curable composition, color filter, and
method for producing color filter", US patent 8,741,509 B2, granted 3 June 2014.
Retrieved from https://patents.google.com/patent/US8741509B2/en .
VERBATIM temperatures found, both pigment-processing not device-limit:

> "the temperature during the solvent salt milling is preferably from 30° C. to 150° C., and
> more preferably from 80° C. to 100° C."
> "the pigment may be dried in a batch or continuous manner under heating at 80° C. to 120° C.
> by, for example, a heating source mounted on a dryer"

**INTERPRETATION — IMPORTANT, DO NOT SKIP.** These are *process* temperatures, not damage
temperatures, and they point the OPPOSITE way from the paper's current uncited assertion of
"150 a 250 °C" as a *degradation* range for CFA dyes. A pigmented colour filter that is
routinely POST-BAKED at 150-250 °C during manufacture demonstrably SURVIVES 150-250 °C.
The only degradation statement retrieved is qualitative ("discoloration of a dye may possibly
occur in a case of using a dye sensible to heat") and applies to dye-type, not pigment-type,
filters. A quantitative CFA bleaching/degradation temperature: NOT FOUND.
The paper's sentence must therefore either cite these as *bake* temperatures (i.e. a lower
bound on survival) or drop the "150-250 °C degradation" claim.

---

## P2. Cross-checks — the spread, reported without picking a favourite

### P2.a — Westgate & James (2022), Sensors — PULSED ONLY, does not satisfy the CW brief

**Reference.** C. Westgate and D. James, "Visible-Band Nanosecond Pulsed Laser Damage
Thresholds of Silicon 2D Imaging Arrays", *Sensors* **22**(7), 2526 (2022).
DOI 10.3390/s22072526. Open access (MDPI, CC BY). Retrieved from
https://pmc.ncbi.nlm.nih.gov/articles/PMC9002732/ (PMC9002732).

VERBATIM (laser): "Quanta Ray GCR170 Nd:YAG laser (9 ns FWHM pulse width), frequency doubled
to λ = 532 nm." Outdoor set: "Nd:YAG laser (Quantel by Lumibird, Lannion, France) with a
6 ns FWHM pulse width."
VERBATIM (spot): "The measured spot sizes were d0.135 = 12.36 µm at 532 nm, and
d0.135 = 18.82 µm at 1064 nm." (d0.135 = the 1/e² diameter.)

Table 1, sensors tested (verbatim contents):

| Name | Mono or Colour | Shutter | Type | Px Size/μm | Res/px |
|---|---|---|---|---|---|
| CCD1 | Mono + colour | Global | CCD FSI | 3.75 | 1280 × 960 |
| CCD2 | Mono | Global | CCD FSI | 6.45 | 1280 × 1024 |
| CMOS1 | Colour | Global | CMOS FSI | 4.5 | 5120 × 5120 |
| CMOS2 | Mono | Global | CMOS FSI | 5.3 | 1280 × 1024 |
| BSI | Colour | Global | CMOS BSI | 2.4 | 3088 × 2076 |

Table 2, damage-class definitions, VERBATIM:
- No damage: "Camera output unaffected after the laser event."
- Single-pixel: "Permanent damage to a single pixel or group of pixels smaller than the laser spot size."
- Multi-pixel: "Permanent pixel damage of a cluster of pixels greater than the laser spot size."
- Line: "Permanent pixel damage that results in row/column effects."
- Sensor kill: "A global effect is caused to the sensor, e.g., the sensor output could fail completely, or the whole-array responsivity could be affected."

Table 3, thresholds. All values are 1/e² fluence in J cm⁻². FD95 = fluence for 95% damage
probability; "Kill" = sensor-kill fluence.

| Name | Type | Setting | λ/nm | FD95 (J/cm²) | Kill (J/cm²) |
|---|---|---|---|---|---|
| CCD1 (mono) | CCD FSI | Lab | 532 | 0.075 | 1.59 |
| CCD1 (mono) | CCD FSI | Outdoor | 532 | 0.23 | 1.58 |
| CCD1 (colour) | CCD FSI | Lab | 532 | 0.081 | 1.73 |
| CCD1 (colour) | CCD FSI | Outdoor | 532 | 0.11 | 1.80 |
| CCD2 | CCD FSI | Lab | 532 | 0.067 | 2.68 |
| CMOS1 | CMOS FSI | Lab | 532 | 0.069 | 7.61 |
| CMOS1 | CMOS FSI | Lab | 1064 | 0.34 | not tested |
| CMOS2 | CMOS FSI | Outdoor | 532 | 0.35 | 11.5 |
| BSI | CMOS BSI | Lab | 532 | 0.091 | >129 |
| BSI | CMOS BSI | Outdoor | 532 | 0.22 | 4110, 358 (five-pulse event) |

USE WITH CARE: these are 9 ns single-pulse FLUENCES (J/cm²), an adiabatic regime in which the
heat does not diffuse at all during the pulse. They CANNOT be rescaled with `q*a/k`, which is
a steady-state conduction result, and they cannot be converted to a CW irradiance. Included
here only to show that the pulsed and CW literature agree on the ordering
(colour ≈ mono at threshold; CMOS FSI ≈ CCD at first damage; sensor kill orders of magnitude
above first damage; BSI far more robust than FSI).

### P2.b — Yoon, Jhang & Shin (2016), CW on a CCD imager — CORRECT REGIME, BUT NUMBERS WITHHELD

**Reference.** S. Yoon, K.-Y. Jhang and W.-S. Shin, "Damage Analysis of CCD Image Sensor
Irradiated by Continuous Wave Laser", *Journal of the Korea Institute of Military Science and
Technology* **19**(6), 690-697 (2016). DOI 10.9766/KIMST.2016.19.6.690.
Open access; PDF at http://koreascience.or.kr/article/JAKO201609636667971.pdf .
Body text is in Korean; abstract in English.

VERBATIM (English abstract): "In this study, the laser-induced damage of the CCD image sensor
irradiated by the CW(continuous wave) NIR(near infrared) laser was experimentally
investigated and mechanisms of those damage occurrences were analyzed." … "As the fluence,
which is the product of the irradiance and the irradiation time, increased, the permanent
damages such as discoloration and breakdown appeared sequentially."

VERBATIM (Sec. 3, 실험 방법 / experimental method, Korean, with translation):
> "실험에 사용된 레이저는 파장 1070 nm의 근적외선대역 광섬유 레이저로 출력범위가
> 100 W ~ 1 kW 이다. 빔 지름은 1/e2 기준으로 5.85 mm 이다. 실험조건은 레이저 출력을
> 100 W 부터 400 W 까지 50 W 씩 증가시켰고, 레이저 조사 시간은 0.05, 0.1, 0.5, 1.0, 1.5,
> 2.0 s로 변화시켰다."
Translation: the laser was a 1070 nm NIR fibre laser with an output range of 100 W to 1 kW;
the beam diameter is 5.85 mm on the 1/e² criterion; laser power was stepped from 100 W to
400 W in 50 W steps; irradiation times were 0.05, 0.1, 0.5, 1.0, 1.5 and 2.0 s.
Sensor: "CCD 영상센서(IC-087C)" — one fresh IC-087C CCD per condition.
An IR-cut filter of "투과율이 16 ± 0.5 %" (transmittance 16 ± 0.5 %) at 1070 nm was inserted,
and a convex lens reduced the beam onto the sensor centre.
The sensor was UNPOWERED during irradiation: "CCD 영상센서는 전원 연결을 하지 않고 레이저를
조사하였다" (the CCD was irradiated without the power supply connected).

**THE DISQUALIFYING SENTENCE, VERBATIM:**
> "레이저 세기는 보안상 상대적인 값으로 표시하였다."
Translation: "The laser intensity is presented as a RELATIVE value for reasons of security."

=> This paper is in exactly the right regime (CW, 0.05-2 s, silicon imager) but reports its
damage thresholds only as *relative* irradiance/fluence. NO absolute W/cm², and the spot
diameter ON THE SENSOR after the convex lens is NOT stated (only the 5.85 mm raw beam).
Therefore it CANNOT be rescaled and CANNOT be used as a quantitative cross-check.
=> Its qualitative content is still directly relevant: it identifies the colour filter as the
FIRST thing to fail under CW irradiation, ahead of the silicon. VERBATIM:
> "색상의 손상이 발생한 경우는 레이저 빔에 의하여 컬러필터가 손상 된 경우이다."
Translation: "The case in which colour damage occurs is the case in which the colour filter
has been damaged by the laser beam." And:
> "이런 컬러필터가 과도한 레이저 에너지를 흡수하여 열적 손상을 입을 경우 각 해당 색을
> 선별적으로 투과시키는 본래의 기능을 상실하게 되어…"
Translation: "when such a colour filter absorbs excessive laser energy and suffers THERMAL
damage, it loses its original function of selectively transmitting the corresponding colour…"
The two damage classes are named verbatim as 색상손상 "(Discoloration)" and
작동불능 "(Breakdown)", breakdown being defined as the laser damaging through the colour
filter down to the photodiode and wiring so that no electrical signal can be output.

### P2.c — THE SPREAD, stated plainly

There is exactly ONE peer-reviewed source that gives a CW damage threshold for a silicon
imager as an absolute irradiance together with its spot size: Schwarz et al. (2017).
The only other CW measurement located (Yoon et al. 2016) withholds its absolute values.
=> A SPREAD CANNOT BE COMPUTED. The paper must say so, and must not present the Schwarz
number as though it were corroborated by an independent measurement.
Ordering the two sources do agree on: under CW irradiation the colour filter array fails
before the silicon (Schwarz: colour CMOS 46 kW/cm² vs mono CMOS 85 kW/cm² at 0.25 s, and
"an indication that the first damage in color cameras emerges in the Bayer filter";
Yoon: discoloration from thermally damaged colour filter is the first-appearing damage class).

### P2.d — Kim et al. (2015), CW on a CMOS imager — LOCATED, ABSTRACT ONLY, FULL TEXT PAYWALLED

**Reference.** J.-G. Kim, S. Choi, S. Yoon, K.-Y. Jhang and W.-S. Shin, "High-Power
Continuous-Wave Laser-Induced Damage to CMOS Image Sensor"
(Korean title: 고출력 CW 레이저에 의한 CMOS 영상 센서의 손상 분석),
*Transactions of the Korean Society of Mechanical Engineers A* **39**(1), 105-109 (2015).
DOI 10.3795/KSME-A.2015.39.1.105. Affiliations: Hanyang University; Agency for Defense
Development. Full text paywalled (DOI resolves to
http://www.dbpia.co.kr/Journal/ArticleDetail/NODE06069135).

VERBATIM (English abstract):
> "This paper presents the results of an experimental analysis of the high-power laser
> (HPL)-induced damage to a complementary metal-oxide semiconductor (CMOS) image sensor.
> Although the laser-induced damages to metallic materials have been sufficiently
> investigated, the damages to electric-optic imaging systems, which are very sensitive to
> HPLs, have not been studied in detail. In this study, we experimentally analyzed the
> HPL-induced damages to a CMOS image sensor. A near-infrared continuous-wave (CW) fiber
> laser was used as the laser source. The influences of the irradiance and irradiation time
> on the permanent damages to a CMOS image sensor, such as the color error and breakdown,
> were investigated. The experimental results showed that the color error occurred first, and
> then the breakdown occurred with an increase in the irradiance and irradiation time. In
> particular, these damages were more affected by the irradiance than the irradiation time."

=> Independently supports, for CW on CMOS, the SAME ordering: colour-filter failure first,
electrical breakdown second, and — directly relevant to this paper's steady-state argument —
that damage is governed more by IRRADIANCE than by irradiation time.
=> Numerical thresholds and spot size: NOT FOUND (paywalled; same defence-lab group as
Yoon et al. 2016, which withheld absolute values for security).

Also located and NOT accessible: S. Yoon, K.-Y. Jhang and W.-S. Shin, "Damage analysis of
CMOS electro-optical imaging system by a continuous wave laser", Proc. SPIE 9983, 99831F
(2016), DOI 10.1117/12.2235736 — not open access, no OA location in OpenAlex.
And: M. Han, X. Wang, J. Nie, K. Sun, M. Zhang, "Temporal evolution characteristics and
damage threshold of CCD detector irradiated by 1.06-μm continuous laser", Optik 157,
1282-1291 (2018), DOI 10.1016/j.ijleo.2017.12.080 — CW, CCD, correct regime, but closed
access with no OA location. Both are leads if the authors have institutional access.

---

## P3.c — Polymeric microlens reflow temperature — CONFIRMED, TWO INDEPENDENT PEER-REVIEWED VALUES

Photoresist microlenses are *made* by heating a photoresist cylinder until it melts and
surface tension pulls it into a hemisphere. The reflow temperature is therefore, by
construction, the temperature at which the microlens LOSES ITS SHAPE. This is the correct
number for the paper's "polymeric microlens" degradation claim, and it is the LOWEST
temperature of any element in the stack found in this search.

**Reference 1.** S.-K. Hwang, S.-H. Baek, J.-H. Kwon and Y.-S. Park, "Fabrication of
Microlens Array Using Photoresist Thermal Reflow" (Korean: Photoresist Thermal Reflow를
이용한 Microlens Array 제작), *Hankook Kwanghak Hoeji / Korean Journal of Optics and
Photonics* **20**(2), 118-122 (2009). DOI 10.3807/hkh.2009.20.2.118. Open access (bronze),
PDF: http://koreascience.or.kr/article/JAKO200912840746922.pdf . Text in Korean.

VERBATIM (Sec. IV, fabrication procedure):
> "마지막으로 오븐에 넣어 150℃의 온도에서 5분 정도 thermal reflow를 하면"
Translation: "finally, placing it in an oven and performing thermal reflow at a temperature
of 150 ℃ for about 5 minutes".
VERBATIM (results): "150℃ 온도에 5분간 thermal reflow를 하여 MLA" — "thermal reflow at
150 ℃ for 5 minutes to [form] the MLA"; and the shorter form "150℃의 reflow".
(For completeness, an earlier, separate step: "150℃에서 PET 필름을 15분 정도 pre-baking을
하였다" — the PET substrate was pre-baked at 150 ℃ for about 15 minutes. Do not confuse the
substrate pre-bake with the lens reflow.)
Note the lens material here is a photoresist on a 100 µm PET film for a backlight unit, not
an image-sensor microlens; it is the same class of novolac photoresist, and the paper should
say so rather than imply the measurement was on a sensor.

**Reference 2.** S. H. Kim, S. K. Hong, K. H. Lee and Y. H. Cho, "Shape Error and Its
Compensation in the Fabrication of Microlens Array Using Photoresist Thermal Reflow Method",
*Journal of the Microelectronics & Packaging Society* **20**(2), 23-28 (2013).
DOI 10.6117/kmeps.2013.20.2.023. Open access (bronze), PDF:
http://koreascience.or.kr/article/JAKO201323965810425.pdf . Text in Korean, abstract English.
Photoresists identified verbatim as "AZ P4330-RS(AZ Electronic Materials사…)" and
"AZ P4620(AZ Electronic Materials사, Solvent 함유량: 59%)".

VERBATIM (Sec. 3, results):
> "125oC에서 4분 동안 핫플레이트 위에서 reflow 공정을 진행했을 때 반구의 형상이 나타났다."
Translation: "when the reflow process was carried out on a hot plate at 125 °C for 4 minutes,
the hemispherical shape appeared."

VERBATIM (English abstract, on why the lens changes shape when heated):
> "In the experiment, the diameter of microlens decreased after thermal reflow because the
> solvent within the photoresist was vaporized."

=> **USABLE NUMBER: a novolac-photoresist microlens reflows (loses its shape) at 125-150 °C
on timescales of 4-5 minutes.** Two independent peer-reviewed sources, consistent.
=> This is BELOW the 150-250 °C colour-filter post-bake range of P3.b. So the ordering the
paper needs is: **microlens (~125-150 °C) fails first, colour filter array survives to at
least its 150-250 °C post-bake, sensor absolute-maximum storage rating +125 °C (OV5647).**
The paper's current uncited "150 a 250 °C for colour-filter dyes, polymeric microlenses and
solder" lumps three very different things together and puts the microlens in the wrong place.

---

## P4. "Burnt shutter curtains and focusing screens are the classic real-world failure mode" — UNSUPPORTED

Searched for evidence FOR and AGAINST. Result: **no peer-reviewed source of any kind was
located, and every authoritative non-peer-reviewed source that does address camera damage
names the SENSOR or the EYE, never the shutter curtain or the focusing screen.**

### Evidence AGAINST (i.e. authoritative sources that name the sensor, not the shutter)

**Nikon Inc., "How to Photograph a Solar Eclipse", article by Fred Espenak,
nikonusa.com Learn & Explore.** VERBATIM:
> "You also need to use a 'solar filter' to keep from harming your camera's imaging sensor."
Also verbatim from the same page: "Whereas lunar eclipses are safe to view with the naked eye,
solar eclipses are not." / "You must take the necessary precautions to keep from harming your
eyesight."
=> A camera manufacturer, writing specifically about solar photography, identifies the
IMAGING SENSOR as the part at risk. It says nothing about the shutter or the focusing screen.

**F. Espenak, "Solar Eclipse Photography", mreclipse.com/SEphoto/SEphoto.html (© 2020).**
The only equipment statement is the generic phrase that a solar filter is needed to
"protect your eyes and your camera". No mention of shutter, shutter curtain, mirror,
focusing screen or sensor was found on the page.

**NASA Science, "Eclipse Viewing Safety", science.nasa.gov/eclipses/safety/ (page dated
Mar 20, 2026).** All six equipment-related sentences on the page concern the EYE, not the
camera. VERBATIM examples:
> "Viewing any part of the bright Sun through a camera lens, binoculars, or a telescope
> without a special-purpose solar filter secured over the front of the optics will instantly
> cause severe eye injury."
> "Do NOT look at the Sun through a camera lens, telescope, binoculars, or any other optical
> device while wearing eclipse glasses or using a handheld solar viewer — the concentrated
> solar rays will burn through the filter and cause serious eye injury."
> "Note that solar filters must be attached to the front of any telescope, binoculars, camera
> lens, or other optics."
=> NASA's guidance contains NO claim of camera-internal damage at all.

**American Astronomical Society, Solar Eclipse Task Force, eclipse.aas.org "Eye Safety"
(https://eclipse.aas.org/eye-safety) and "Suppliers of Safe Solar Viewers & Filters"
(https://eclipse.aas.org/eye-safety/viewers-filters).** VERBATIM:
> "Do not look at the uneclipsed or partially eclipsed Sun through an unfiltered camera,
> telescope, binoculars, or other optical device."
> "Do not look at the Sun through an unfiltered camera, telescope, binoculars, or any other
> optical device while using your eclipse glasses or handheld solar viewer in front of your
> eyes—the concentrated solar rays could damage the filter and enter your eyes, causing
> serious injury."
> "A solar filter must be attached securely to the front of your telescope, binoculars, or
> camera lens."
> "sunlight concentrated by your optics could destroy it and injure your eye in a flash —
> literally"
The last sentence refers to a rear-mounted eyepiece FILTER being destroyed, not a shutter.
The AAS "Imaging & Video" page (https://eclipse.aas.org/imaging-video) contains no sentence
about camera equipment damage at all.

### Evidence FOR

NOT FOUND. Specifically:
- Literature search of Crossref (query: solar image damage camera shutter curtain focusing
  screen unfiltered sun photography, 20 results) returned nothing on the topic; the hits were
  about shutter speed, rolling-shutter communications and photographic history.
- Literature search of OpenAlex (query: camera sensor damage direct sunlight solar
  concentration imaging, 20 results) returned nothing on the topic; the hits were remote
  sensing, agriculture and solar-cell papers.
- No peer-reviewed experimental study of solar-concentration damage to a camera shutter
  curtain, focal-plane shutter, reflex mirror or focusing screen was located by any route.
- Google Patents full-text search for patents describing sunlight damage to a shutter curtain
  could not be completed: the endpoint returned HTTP 503 on every attempt. This is an
  UNRESOLVED lead, not a negative result — if it matters, retry
  https://patents.google.com/?q=%22shutter+curtain%22+sunlight+damage .

### VERDICT FOR THE PAPER

The claim that burnt shutter curtains and focusing screens are the classic real-world failure
mode is, on the evidence retrievable here, **supported by nothing citable**. It is not merely
"not peer-reviewed" — it is contradicted in emphasis by the only manufacturer statement
located (Nikon/Espenak: the sensor is what the filter protects). The paper's existing hedge at
paper.tex line 543-547 ("circula ampliamente entre fotógrafos, pero no se ha localizado para
ella una fuente revisada por pares; aquí se sostiene sobre el cálculo, no sobre la
literatura") is ACCURATE and should be kept, but it should be strengthened to say that the
authoritative eclipse-safety and manufacturer guidance that does exist points at the sensor
and the eye, and that the shutter/focusing-screen claim rests on this paper's own thin-plate
calculation alone. Do not cite forum posts; none were used here and none should be.

---

## SYNTHESIS — the one threshold the paper can actually cite, and how it rescales

**The only citable CW damage threshold for a silicon imager, with its spot size and exposure
regime, is Schwarz et al. (2017), Table 4.** Everything else located is either pulsed
(Westgate & James 2022), withholds absolute values (Yoon et al. 2016), or is paywalled
(Kim et al. 2015; Yoon et al. SPIE 2016; Han et al. 2018).

Recommended citation for a consumer CMOS under continuous illumination:
- q_lab = **49 kW/cm²** (experimental) or **48 ± 3 kW/cm²** (fitted), monochrome CMOS
  (Aptina MT9V024), 532 nm CW, 10 s exposure — the longest exposure and lowest CMOS
  monochrome value in the table, i.e. the conservative CMOS choice.
- If the paper prefers the single lowest CMOS number regardless of exposure: **46 kW/cm²**
  (colour CMOS, 0.25 s, experimental).
- a_lab = **9.08 µm** (effective/top-hat radius, deff/2 with deff = √2·ω, ω = 12.85 µm)
  or **12.85 µm** (1/e² radius) — state which one is used.
- Damage class at that threshold: PERMANENT REDUCTION OF PIXEL SENSITIVITY (≥10% deviation
  from the reference flat field), NOT dead pixels, NOT reversible saturation, NOT
  catastrophic destruction. Dead columns/rows on the same device need 196 kW/cm².

DERIVED HERE — NOT FROM ANY SOURCE — using the paper's own `q_real = q_lab · a_lab / a_real`
with q_lab = 49 kW/cm²:

| a_lab | a_real = 0.7 mm (1.4 mm solar image, 300 mm lens) | a_real = 8.5 µm (17 µm solar image, phone) |
|---|---|---|
| 9.08 µm (effective) | 636 W/cm² | 5.23e4 W/cm² |
| 12.85 µm (1/e²) | 900 W/cm² | 7.41e4 W/cm² |

Also DERIVED HERE, for the temperature-vs-temperature comparison the paper says it prefers:
putting q_lab = 49 kW/cm² and a_lab into `dT = q·a/k` with k = 148 W/m/K (the value already
in `src/thermal.py`) gives a centre rise of **30 K** (a_lab = 9.08 µm) or **43 K**
(a_lab = 12.85 µm) above ambient at the Schwarz threshold.
THIS IS A WARNING SIGN, NOT A RESULT: a 30-43 K rise is far too small to melt, bleach or
reflow anything, which means either (i) the incident-to-absorbed conversion matters (the paper
must use ABSORBED flux, and Schwarz quotes INCIDENT power density — the paper's model needs an
absorptance it must state and source), or (ii) CW damage at this level is not governed by bulk
silicon conduction at all but by absorption in the low-conductivity CFA/microlens polymer
stack sitting on top, whose thermal conductivity is orders of magnitude below silicon's.
Option (ii) is what both Yoon et al. (2016) and Kim et al. (2015) report qualitatively:
the colour filter fails first. The paper should not present the q·a/k silicon result as
bounding the damage without addressing this.

### What must be written as NOT FOUND in the paper

- No published CW damage threshold exists for a *modern consumer* CMOS (Sony IMX / ON Semi AR
  / OmniVision) — Schwarz et al. tested a 2010-era 6 µm-pixel machine-vision Aptina MT9V024.
- No independent CW cross-check with absolute numbers exists, so no spread can be quoted.
- No quantitative colour-filter-array bleaching/degradation temperature was found; only
  manufacturing post-bake ranges (100-300 °C, preferably 150-250 °C).
- No Sony or ON Semiconductor public datasheet with a temperature table was found.
- No peer-reviewed evidence for or against the burnt-shutter-curtain claim exists.

---

## BIBTEX

```bibtex
@article{schwarz2017lidt,
  author  = {Schwarz, Bastian and Ritt, Gunnar and Koerber, Michael and Eberle, Bernd},
  title   = {Laser-induced damage threshold of camera sensors and micro-optoelectromechanical systems},
  journal = {Optical Engineering},
  volume  = {56},
  number  = {3},
  pages   = {034108},
  year    = {2017},
  doi     = {10.1117/1.OE.56.3.034108},
  note    = {Open access, CC BY 4.0}
}

@article{westgate2022lidt,
  author  = {Westgate, Christopher and James, David},
  title   = {Visible-Band Nanosecond Pulsed Laser Damage Thresholds of Silicon 2D Imaging Arrays},
  journal = {Sensors},
  volume  = {22},
  number  = {7},
  pages   = {2526},
  year    = {2022},
  doi     = {10.3390/s22072526}
}

@article{yoon2016ccd,
  author  = {Yoon, Sunghee and Jhang, Kyung-Young and Shin, Wan-Soon},
  title   = {Damage Analysis of {CCD} Image Sensor Irradiated by Continuous Wave Laser},
  journal = {Journal of the Korea Institute of Military Science and Technology},
  volume  = {19},
  number  = {6},
  pages   = {690--697},
  year    = {2016},
  doi     = {10.9766/KIMST.2016.19.6.690},
  note    = {In Korean; absolute irradiances withheld and reported as relative values}
}

@article{kim2015cmos,
  author  = {Kim, Jin-Gyum and Choi, Sungho and Yoon, Sunghee and Jhang, Kyung-Young and Shin, Wan-Soon},
  title   = {High-Power Continuous-Wave Laser-Induced Damage to {CMOS} Image Sensor},
  journal = {Transactions of the Korean Society of Mechanical Engineers A},
  volume  = {39},
  number  = {1},
  pages   = {105--109},
  year    = {2015},
  doi     = {10.3795/KSME-A.2015.39.1.105},
  note    = {In Korean; full text not open access}
}

@article{hwang2009microlens,
  author  = {Hwang, Seong-Ki and Baek, Sang-Hun and Kwon, Jae-Hyeok and Park, Young-Sik},
  title   = {Fabrication of Microlens Array Using Photoresist Thermal Reflow},
  journal = {Korean Journal of Optics and Photonics (Hankook Kwanghak Hoeji)},
  volume  = {20},
  number  = {2},
  pages   = {118--122},
  year    = {2009},
  doi     = {10.3807/HKH.2009.20.2.118},
  note    = {In Korean; thermal reflow at 150\,\textdegree{}C for 5 min}
}

@article{kim2013microlens,
  author  = {Kim, Sang Hyun and Hong, Sung Kyu and Lee, Kyung Hee and Cho, Young Hak},
  title   = {Shape Error and Its Compensation in the Fabrication of Microlens Array Using Photoresist Thermal Reflow Method},
  journal = {Journal of the Microelectronics and Packaging Society},
  volume  = {20},
  number  = {2},
  pages   = {23--28},
  year    = {2013},
  doi     = {10.6117/KMEPS.2013.20.2.023},
  note    = {In Korean; reflow at 125\,\textdegree{}C for 4 min, AZ P4330-RS / AZ P4620 photoresist}
}

@techreport{ov5647,
  author      = {{OmniVision Technologies, Inc.}},
  title       = {{OV5647}: 1/4-inch color {CMOS} {QSXGA} (5 megapixel) image sensor with {OmniBSI} technology},
  institution = {OmniVision Technologies},
  type        = {Datasheet, preliminary specification},
  number      = {version 1.0},
  year        = {2009},
  note        = {Ambient storage temperature -40\,\textdegree{}C to +125\,\textdegree{}C (absolute maximum rating); operating temperature -30\,\textdegree{}C to +70\,\textdegree{}C}
}

@misc{nemoto2011cfa,
  author = {Nemoto, Yoichi and Sasaki, Nobushige},
  title  = {Method for producing color filter for image sensor},
  year   = {2011},
  note   = {U.S. Patent 8,053,149 B2, granted 8 November 2011, assignee Fujifilm Corporation},
  howpublished = {\url{https://patents.google.com/patent/US8053149B2/en}}
}

@misc{takakuwa2014cfa,
  author = {Takakuwa, Hideki},
  title  = {Colored curable composition, color filter, and method for producing color filter},
  year   = {2014},
  note   = {U.S. Patent 8,741,509 B2, granted 3 June 2014, assignee Fujifilm Corporation},
  howpublished = {\url{https://patents.google.com/patent/US8741509B2/en}}
}

@misc{espenak_nikon,
  author       = {Espenak, Fred},
  title        = {How to Photograph a Solar Eclipse},
  howpublished = {Nikon Inc., Learn \& Explore},
  note         = {\url{https://www.nikonusa.com/learn-and-explore/a/tips-and-techniques/how-to-photograph-a-solar-eclipse.html}}
}

@misc{nasa_eclipse_safety,
  author       = {{NASA Science}},
  title        = {Eclipse Viewing Safety},
  year         = {2026},
  howpublished = {\url{https://science.nasa.gov/eclipses/safety/}},
  note         = {Page dated 20 March 2026}
}

@misc{aas,
  author       = {{American Astronomical Society, Solar Eclipse Task Force}},
  title        = {Eye Safety},
  howpublished = {\url{https://eclipse.aas.org/eye-safety}}
}
```

---

Status: COMPLETE for P1, P3 and P4; P2 closed with an explicit negative result
(no second CW measurement with absolute numbers is publicly available).
