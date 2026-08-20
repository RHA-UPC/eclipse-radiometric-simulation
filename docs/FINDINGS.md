# Results

Every figure comes from `src/` or from a source cited in
`data/literature.json`. Times are CEST.

## Geometry

| Event | Time | Solar altitude | Obscuration |
|---|---|---|---|
| C1 | 19:35:27.5 | 14.70° | 0 |
| C2 | 20:29:25.6 | 4.85° | 1 |
| Maximum | 20:29:59.8 | 4.75° | 1 (magnitude 1.0333) |
| C3 | 20:30:35.9 | 4.63° | 1 |
| C4 | 21:21:19.1 | −4.49° | 0 |

Totality **70.27 s**. The Sun set still partially eclipsed: C4 happens below
the horizon, and sunset came at 21:00:20.

The site was **41.9 km** from the northern limit measured perpendicularly, 47.8
km measured due north. Duration grows by 0.58 s per kilometre southwards.

Two independent shadow solutions bound the duration within 1.4 s: DE440s with
the umbral constant gives 70.27 s, and NASA's Besselian elements give 68.86 s.
The Besselian reimplementation reproduces NASA's four published central
durations with a maximum deviation of **0.04 s**.

## Visibility

The topographic horizon towards the west is **depressed by 0.42°**. The Sun
cleared it by 5.17°. The site commands the valley in the direction that
mattered.

## Irradiance

At first contact the direct normal irradiance was 490 W/m². At the instant of
totality it would have been 186 W/m² **with no eclipse at all**, from the Sun's
descent alone: dusk took 62 % of the signal before the Moon contributed
anything.

At air mass 10.7 the three clear-sky models differ by a factor of 3 (SPECTRL2
186, Bird-Hulstrom 154, Ineichen-Perez 61). The work adopts SPECTRL2 for being
the highest, which is the conservative choice for ocular risk.

## Sensors

Focal-plane irradiance depends on the f-number and not on the focal length. The
phone at f/1.9 concentrates 3288 suns; the SLR at f/6.3 concentrates 299.

Local temperature rise at 300 mm and f/6.3 at first contact, by idealization:

| Regime | ΔT |
|---|---|
| One-dimensional, good heat sink (0.3 mm die) | 0.37 K |
| Semi-infinite (Carslaw and Jaeger) | 1.71 K |
| Thin plate, adiabatic back face | **6.84 K** |

The characteristic time is a²/κ = 21 ms. 95 % of the asymptote is reached at
0.7 s, so nothing thermal limits the exposure.

Against the only continuous-wave damage threshold published with its spot size
(Schwarz et al. 2017: 49 kW/cm², 532 nm, 10 s, effective spot of 9.08 µm
radius), rescaled by the invariance of q·a:

| Configuration | Peak E | Margin A | Margin B |
|---|---|---|---|
| 300 mm f/6.3, eclipse C1 | 18.4 W/cm² | **18×** | 2669× |
| phone f/1.9, eclipse C1 | 202 W/cm² | 69× | 243× |
| 300 mm f/6.3, midday | 33.7 W/cm² | 10× | 1452× |
| 300 mm f/2.8, midday | 171 W/cm² | **1.9×** | 287× |

Hypothesis A assumes damage is governed by conduction in the silicon, so the
threshold falls as 1/a. B assumes it is governed by absorption in a thin
low-conductivity layer, in which case the threshold does not depend on spot
size. A is the conservative one.

What the table teaches: the fast, long lenses used to photograph the Sun are
the ones that approach the threshold. The slow zoom at 4.75° altitude was two
orders of magnitude away.

Stack temperatures, corrected after review: the microlens is the most fragile
part and reflows between 125 and 150 °C. The colour filter is baked at
150-250 °C during manufacture, so that interval is a survival bound and not a
degradation one.

## Eye

Here the conclusion inverts.

| Instant | E_B | 3 mm fixation | 7 mm fixation |
|---|---|---|---|
| C1 | 24.0 W/m² | 4.2 s | 0.9 s |
| 30 min before maximum | 8.2 W/m² | 12.1 s | 2.2 s |
| Instant of totality, Sun uneclipsed | 1.58 W/m² | 63 s | 12 s |

The retinal thermal limit is exceeded by **30 %** at first contact. The
equivalent corneal irradiance is 201.9 W/m², evaluated at the angular diameter
of the source and not at the photochemical acceptance angle.

A low Sun does not dazzle, and that is the trap: the aversion response
disappears before the danger does.

The pupil correction deserves a qualification. ICNIRP derived the photochemical
limit assuming 3 mm, and retinal dose scales with pupil area. But anyone
looking at the Sun fixates the crescent of photosphere, whose surface
brightness the eclipse does not alter, so while photosphere remains visible a
pupil close to the nominal one is what to expect. Where the dilated pupil rules
is at third contact, with the eye just out of totality and a constriction time
constant of seconds. That is what supports the rule of replacing the filter
before the Sun reappears.

## Diamond ring

10 s from second contact there was a thousandth of the disk's area left and
three ten-thousandths of the flux. In the last second the residual flux falls
with an e-folding time of **0.244 s**: it divides by ten every six tenths.

The calculation uses the mean lunar limb. Real mountains break the crescent
into Baily's beads, so the true curve is stepped and contact instants can shift
by a second or two.

## Perseids

The radiant was at 9.2° altitude and 80° from the eclipsed Sun. The solar
longitude at the instant of totality was 139.694° J2000, some eight hours
before the maximum's node.

Probability of at least one Perseid in the frame during totality: **0.67 %** in
the most favourable configuration of the whole sweep, which is 16 mm with
limiting magnitude 4 and ZHR 100. Dropping the limiting magnitude to 3, 0.31 %.

## Exposure

During totality the limit is not thermal but trailing from the Earth's
rotation. The Sun moved at 14.3 arcseconds per second, which on the EOS 200D
sensor gives 0.18 s at 300 mm and 3.35 s at 16 mm before it crosses a pixel.

## What the observer's photographs confirmed

See `docs/PHOTOS.md`. In short: the predicted plate scale matches the measured
one to 0.1 %, the observer shot the partial phases at f/40 (the lens's minimum
aperture, well below the modelled worst case), and there is not a single
persistent hot pixel at ISO 12800 in 24.2 million.
