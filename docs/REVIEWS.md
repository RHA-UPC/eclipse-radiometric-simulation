# Adversarial reviews

Four independent agents were told to refute the work, not to praise it, with
instructions to write every finding to disk the moment it was established. That
instruction saved the second review: it died on a session limit with the
findings already written. The third died the same way and resumed from its own
context.

The original dumps remain in `data/damage_findings.md` and
`data/review2_findings.md`.

## Review 1: optics and thermodynamics

17 findings.

### What survived the attack

The focal-plane radiometry closes the energy balance exactly and respects the
thermodynamic concentration limit. The Carslaw and Jaeger transient solution
matches an independent half-space Green's function derivation to 10⁻¹⁰ over
eight decades of time. The limb-darkening quadrature reproduces the exact
circle-circle lens area to 10⁻⁵. Using the central value rather than the
area-averaged one is the conservative choice and the work applies it
consistently.

### What fell

**The supposed thermal bracket bracketed nothing.** The paper presented the
one-dimensional case (0.37 K) and the semi-infinite one (1.71 K) as lower and
upper bounds. The reviewer built the physically intermediate and worse case: a
thin die with an adiabatic back face, where heat spreads sideways inside a
0.3 mm plate. It gives 6.84 K, four times the reported value. The paper now
gives all three regimes and quotes the worst.

**"Four orders of magnitude" appeared three times and was wrong all three
times.** In one case the error was a thousandfold: a factor of four written as
four orders of magnitude.

**The Perseid bound contradicted the paper's own figure.** The abstract said
0.32 % as a maximum; the sweep contained 0.71 % and figure 9 drew it. After
correcting the duration of totality that maximum dropped to 0.67 %, which is
the value the paper publishes now.

**The denominator of the safety margin was not cited.** The paper claimed "two
orders of magnitude below any plausible damage threshold" without citing one,
and stayed quiet about the search having failed.

**The model's scope was declared wrongly.** The analysis covered the sensor,
and the operational conclusion said "in no combination of focal length and
aperture" without making clear that with the mirror down the Sun falls on the
focusing screen and not on the sensor.

**Seven hand-written figures, five of them wrong**, in a document whose
footnote claimed none were.

## Review 2: geometry, eye and statistics

Four critical or major findings. All correct.

### The bug

The paper declared a fifteen-second discrepancy between its DE440s calculation
(74.1 s) and its Besselian reimplementation (59.2 s), and attributed it to the
extreme sensitivity of a grazing geometry. It wrote two paragraphs of physics
to explain it.

It was a one-line omission. The hour angle μ Espenak tabulates is referred to
TDT, and converting it to the observer's universal hour angle requires
subtracting 1.002738·ΔT·15°/3600. Without that term the whole umbral path
shifted by 0.29825° of longitude, which at that latitude is 25 km.

Corrected, the reimplementation reproduces NASA's four central durations with a
maximum deviation of 0.04 s, and at the site it gives 68.86 s against DE440s's
70.27 s. The real spread is 1.4 s.

The reviewer added an uncomfortable observation: `validate.py` had a pass
criterion in three of its four checks, and none in the one that was hiding the
failure.

### The wrong constant

`geometry.py` used k = 0.2725076 for every contact and attributed that choice
to Espenak and Meeus. NASA's Besselian elements, transcribed in the project's
own `data/literature.json`, declare k1 = 0.272488 for the penumbral contacts
and k2 = 0.272281 for the umbral ones. C2 and C3 are umbral. The wrong constant
inflated totality by 3.8 s.

### The numerical artefact

The "55 km to the northern limit", repeated three times including in the
operational conclusions, was the end of `brentq`'s search bracket.
`totality_duration()` returns exactly 0.0 outside the path, so `brentq`
evaluated the end, found f(b) == 0 and returned it without iterating. Changing
the `+ 5.0` in the code to `+ 8.0` would have made the paper say 58 km.

The real value: 47.8 km due north, 41.9 km perpendicular. The reviewer verified
it two independent ways, including an interpolation of NASA's table using none
of the project's code, agreeing to 220 m.

### The wrong angle, and a radiance that is not conserved

Two errors in the retinal thermal limit, both in the unsafe direction.

The first: α in L_R = 2.8·10⁴·α⁻¹ is the angular diameter of the source. The
code evaluated it at γ_ph = 11 mrad, which belongs to the photochemical limit.
Corrected to 9.18 mrad, the equivalent corneal irradiance goes from 241.9 to
201.9 W/m², and the hazard ratio at C1 from 1.09 to 1.30.

The second: the code scaled the weighted radiance by the eclipse transmission,
so the tabulated thermal hazard vanished as obscuration approached unity. The
Moon removes area, not radiance. A Sun 99 % covered projects a crescent whose
retinal irradiance is that of the full photosphere, which is why ICNIRP writes
that limit as a radiance. The correct treatment holds the radiance fixed and
lets α respond, taken as the mean of the crescent's major and minor
dimensions.

### What survived

The conversion Ω = πγ²/4, which the reviewer showed is the one ICNIRP used to
derive its own irradiance form. Using the full subtense rather than the half
angle. The pupil correction, which double-counts nothing. And the blue-light
irradiance, which the reviewer recomputed by hand from the extraterrestrial
spectrum and the Rayleigh and aerosol optical depths: 23 W/m² against the
paper's 24 at C1.

## The damage threshold

Five search attempts died on session limits before the sixth, instructed to
write to disk incrementally, closed it.

Schwarz, Ritt, Koerber and Eberle (2017), *Optical Engineering* 56(3) 034108,
open access: 49 kW/cm² for a monochrome CMOS under a continuous 532 nm laser
with 10 s of exposure and an effective spot of 9.08 µm radius. The damage class
is a permanent loss of at least 10 % sensitivity, not dead pixels: in-line
damage on the same device requires 196 kW/cm².

It is the only continuous-wave threshold for a silicon sensor published
together with its spot size. Without that datum the number is useless, because
the rescaling needs it. No second absolute measurement exists to compare
against: the one that does publishes its intensities in relative terms for
safety reasons.

The agent also corrected the direction of one of the paper's claims. The
150-250 °C the manuscript cited as the colour filter's degradation range are
baking temperatures during manufacture, that is, a survival bound. The fragile
part of the stack is the microlens, which reflows between 125 and 150 °C
because it is made by melting it.

And it searched for evidence about the shutter curtain. It found no
peer-reviewed source. The guidance that does exist points at the sensor and at
the eye: Nikon, with Espenak's byline, says the filter is needed to avoid
damaging the image sensor, and NASA's guide does not mention internal damage to
the camera.

## Review 3: the web (19 August 2026)

A third independent agent was told to refute `web/`, `src/eclipsecat.py` and
`src/webdata.py`, with instructions to verify by running and to take nothing on
reading. It returned 17 findings, all outside what the self-checks covered, and
a list of what did hold.

### The worst: contacts named by root order

`local()` took the first root as C1 and the last as C4. That assumes both fall
inside the search window, and with a ±3.2 h window they do not always: in the
eclipse of 2 July 2038, at 13° S 75° W, first contact is at −3.26 h. Only one
root survived, the **last** contact's, and it was labelled as the first.
Everything that then swept forward from C1 found an empty interval, so a point
three degrees west, which sees 40 % of the disk covered with the Sun high,
appeared on screen as **"No eclipse visible"**. The agent's census found 17
such cells and 232 with the contact order inverted.

Fixed twice over: the elements are fitted and evaluated over ±4 h, and contacts
are named by **how the curve crosses zero**, not by the order the roots came
out in.

### The one the review did not find: no annular eclipse was annular

Pulling on the previous finding's thread turned up a bigger one. The interior
contact condition was written `m + L2' = 0`, which is how Meeus tabulates it
for a total eclipse. `L2'` is negative inside the umbra and **positive** inside
the antumbra, so that form has no root in an annular eclipse: the catalogue's
18 annulars declared **zero seconds of annularity** while still giving the
correct magnitude, which is exactly the disguise needed for nobody to notice.
The correct form is `|m| = |L2'|`.

With the fix, the central durations reproduce the published ones: 2027-02-06
gives 468 s against 471, 2028-01-26 gives 624 against 627, 2031-05-21 gives 322
against 326.

The underlying cause is not the formula: it is that the entire test suite
exercised a single total eclipse.

### A map that contradicted itself

Between γ = 0.9972 and γ ≈ 1.03 the shadow axis passes outside the Earth while
the cone still grazes the limb. `classify()` looked only at the axis, so it
called those eclipses partial: the map drew no path and, on marking a point
inside it, the panel answered "total". It is the case rule 5 of
[`SAFETY.md`](../SAFETY.md) names explicitly. The catalogue has one, 9 April
2043. It is now classified correctly and the page declares that it cannot draw
its path rather than implying there is none.

### The drawn path was 5 km narrow

The umbral limits were traced by displacing the axis perpendicular to the
shadow's velocity in the fundamental plane, ignoring that the observer moves
too: a few hundred m/s of Earth rotation against an umbra travelling at a few
km/s. The band came out up to 5.4 km narrow on each side, 4 % of a 130 km half
width, and the drawn edge fell inside the region the same code called total.
The displacement now runs perpendicular to the **relative** velocity, and the
test no longer compares distances but the invariant that matters: on the edge
the duration is zero, three kilometres inside it is not, three kilometres
outside it is zero again.

### North and south were not north and south

The two labels were really the left and right sides of the motion, which
coincide with latitude only while the shadow travels east; they disagreed in
174 of some 6200 sampled epochs. Relabelling epoch by epoch fixes the names and
wrecks the curves, because each polyline starts zigzagging between the two
edges. The name has been removed: the function returns `edges`, two continuous
unnamed curves.

### Wording that safety does not allow

The panel printed **"no limit"** as the admissible fixation time when the blue
irradiance fell below 1 W/m². That overreaches the standard itself, which only
speaks up to 30 000 s, and overreaches rule 3 of `SAFETY.md`, which forbids any
answer that reads as permission. With the default atmosphere it happened in 45
cells of a global sweep. In the same cases the required transmittance came out
**greater than 1**, which means nothing physically and reads as "no filter
needed".

### An unvalidated form

The atmosphere accepted any finite number. With negative precipitable water the
panel printed `NaN W/m²` under a note saying "inside the range where the model
is fitted"; with AOD −1, 4 638 520 W/m². There are physical ranges now, values
are clamped, and the clamping is announced.

### The rest

The crescent's subtense returned zero for **any** pair of nested disks,
annularity included, that is, it declared zero thermal hazard at the instant
there is a whole ring of photosphere in view. It was also in `src/eye.py`; it
has been fixed there, and since this eclipse is total the branch does not fire
and **no published figure changes**. The thermal transmittance divided by the
eclipsed beam where `eye.py` divides by the uneclipsed one. The aerosol
sensitivity sentence cited an irradiance that inside the umbra is exactly zero,
so it always read "from 0.00 to 0.00 W/m²". γ was stored unsigned, so it
matched no published catalogue and lost the hemisphere. The curves closed over
the gaps where the shadow leaves the globe and drew them as straight chords up
to 252 km long. And invalid coordinates were rejected in silence, leaving the
previous point's result on screen under the new coordinates.

### The tests did not test

The agent killed 20 of 37 mutations and documented the 17 survivors. Among
them: swapping `total` for `annular`, removing the night-hemisphere check,
changing the equatorial radius for the polar one, dropping the cubic term of
the polynomial, and substituting the eclipsed radiance for the uneclipsed one —
which is precisely the historical error the module says it exists to avoid.
There was also an assertion comparing a CSV column against a literal without
running anything, and a "bracket invariant" comparing three different epochs
while believing it compared one.

Both suites were rewritten around that. Of the mutations that were still alive
and are real, all now die; two equivalent ones remain, in which naming contacts
by order gives the same result as naming them by crossing direction **because
the window is wide**, and the narrow-window test covers that.

### Provenance and licences

`THIRD-PARTY-DATA.md` claimed to preserve the BSD notices of pvlib and Leaflet.
It did not: there was a bibliographic citation and a `@preserve` with the
copyright, but the licence text and the disclaimer were nowhere in the
repository. They now live in `web/vendor/LICENSE-pvlib.txt` and
`web/vendor/LICENSE-leaflet.txt`, and the page footer links to both.

The Ångström exponent and the ASTM G173 conditions were literals with no entry
in `data/literature.json`, against the rule that governs the repository. The
first is now read from `pvlib` itself at export time, so it cannot drift from
what `spectral.py` runs; the second have an entry of their own, with the
warning that the standard is paid and was not consulted. The ICNIRP limits are
checked against the literal quote before being written.

### What survived

`spectrl2` reproduces `pvlib.spectrum.spectrl2` **exactly** in 160 cases (four
atmospheres × ten zenith angles × four days of the year): worst relative
difference, 0.000000 %. The catalogue's greatest-eclipse points match NASA's
published ones. The ICNIRP constants match the literal quotes. Longitudes at
±180 and the poles are handled correctly. And the five conditions of
`SAFETY.md` hold in what the page renders: the entry screen, the red block
under every result, the assumptions attached to the figures, the air-mass
warning and the prior verification of the geometry.

## Review 4: the vector bands (20 August 2026)

The obscuration bands went from raster to polygons, because a raster has one
resolution and a map has as many as it has zoom levels. An independent agent
was told to break the new code, given the list of claims it rested on and
instructed to refute them with code, not with reading. It found eleven things.
These are the ones that mattered.

### The frame was not outside the map

The contour domain was framed with a row and a column of −1 one cell outside
the world, and the comment said the stretch of ring running along that frame
falls outside what the view can reach. **It was false.** The edges touching the
frame were not refined, so their crossing came from linearly interpolating
against −1 over 1.35°; since the last real node sat 0.45° from the world edge,
the crossing fell **inside** the map whenever the value was less than
(1+3·level)/2 — for level 0.9, always.

Measured: the band drawn was the wrong one up to **66 km inside the map** along
the antimeridian (2039-06-21, 46° N 179.15° E: real value 0.724, band 0.6
painted) and **39 km** at the poles (2039-12-15, 89.65° S: real value 0.941,
two bands short). 3126 wrong points in the antimeridian strip and 3114 in the
polar ones, spread across the 56 eclipses. Inside the map, zero errors out of
thousands of control points.

Fixed by putting **real nodes at ±180 and ±90**, computed and not interpolated:
with them, every crossing against the frame falls on the world edge or beyond,
which is where it was meant to fall. Re-measured with the reviewer's own
procedure: **zero** points with the wrong band, across all 56.

### 1434 rings that crossed themselves

With `fill-rule: evenodd` every loop inverts the fill, so a ring that crosses
itself paints the neighbouring band in the tongue it forms. There were 1447
crossings, 233 of them more than a degree from any edge, in 23 eclipses. The
worst case — 2026-02-17, level 0.8 — was a 62-vertex ring that crossed itself
**25 times**, with every one of its vertices correct: `maxObscuration` was
0.800000 ± 10⁻⁶ at all of them. The defect was not the position but the
polygonization.

Two causes. The spikes out to the frame, which went with the previous fix. And
the adaptive subdivision, which searched for the contour **a whole chord** to
either side of its midpoint — the comment said half — and at that distance
could latch onto another branch of the contour passing nearby. Corrected to
half a chord. Re-measured: **zero self-crossings** across the 56 eclipses.

### The map and the panel used two different horizons

The map cut with ζ > 0, the **geocentric** horizon; the panel, with the
**geodetic** altitude above the local horizon. On an ellipsoid they are not the
same: the two criteria disagree by up to 0.091° of solar altitude and, near
sunset, those minutes are worth points of obscuration. On 2026-08-12 at 75° N
100° E the panel answered 57.9 % over a band painted between 30 and 40 %. A
sweep of the 56 eclipses found 56 points with more than 0.01 of discrepancy,
the worst 0.19.

A map that contradicts its own answer is worse than a coarse map, and
`SAFETY.md` forbids it explicitly. Fixed by using the geodetic horizon
everywhere. Re-measured: **1 point out of 13 987**, and that one for a
different reason — the next.

### The time hint changed the function

So as not to sweep six hours at every one of the thousands of vertices that
need refining, `maxObscuration` accepts as a hint the instant of the nearest
cell's maximum and looks only ±2 steps around it. The reviewer instrumented the
**real** calls and found that the fixed window erred in 59 of 93 290 calls, one
of them by **0.54 of obscuration**: the instant of the maximum jumps from one
cell to its neighbour right at the terminator, and there ±2 steps do not reach
it. Fixed by widening the window while the maximum keeps landing on its edge.
Re-measured: **0 of 6157** calls differ from the full sweep.

Along the way it found that the fallback meant to cover that case was written
`if (bk < 0 && lo > 0)`, that is, disabled exactly when the hint was 0, 1 or 2.
It did not fire today — no cell in the catalogue has its maximum there — but
changing the time window would have been enough.

### The 121-instant sweep misses grazing eclipses

Near the edge of the penumbra the eclipse lasts minutes and the sweep does not
see it. Measured against a 2001-instant sweep, the loss reaches **0.0165** of
obscuration, and 32 of 2227 points of the fringe with an eclipse read as zero.
A 0.1 % contour was chasing a function that is zero in patches there.

It was not corrected: the claim was **withdrawn**. The outermost band now
starts at 5 %, three times above that loss. What goes undrawn is some 175 km of
fringe over a 7000 km penumbra.

### The tests could not see three of the five

The contour section filtered out vertices with `|lat| > 89.5` or
`|lon| > 179.5` under the comment "the frame" — precisely the strip where the
worst defect lived. Removing that filter and touching nothing else, 112 of 358
vertices from 2026-08-12 came out wrong. The chord-sagitta measurement silently
discarded every chord without a sign change within ±30 km, which is exactly
what happened to the bad chords, 100 and 285 km from the curve. And the nesting
check looked at the value at each vertex, never at the polygon's topology, so
the 1434 crossings were invisible to it.

Rewritten: they no longer filter the world edge, they search for the curve five
chords away, they count terminator vertices separately instead of discarding
them, and there are two new sections — one comparing the band drawn by parity
against the true one, walking the antimeridian and both poles on purpose, and
another that looks for self-crossings.

### What survived

Three claims held against everything thrown at them. That `obsAt` — a hand copy
of `evaluate` + `geom` + `obscuration`, written to avoid allocating objects in
the hot loop — is identical to its originals: **zero difference** over 291 951
samples with the Sun above the horizon, across 56 eclipses, poles and
antimeridian included. That marching squares produces no open chains: 632
chains over 56 eclipses × 10 levels, **none open**, no edge with degree other
than two, and no badly resolved saddle — the mean of the four corners is the
exact value of the bilinear interpolant at the centre, so two neighbouring
cells cannot decide it differently. And that the cost is bounded: no eclipse
exceeds two seconds or 40 000 vertices.

It also discarded two suspicions of its own after measuring them: the ±3.2 h
window truncates no maximum (difference exactly zero against ±4 h over 25 307
points), and inside the map the band drawn matched the true one at every
control point.

## The follow-up to review 4 (20 August 2026)

Two of review 4's fixes turned out to be incomplete, and the second one was
visible on screen as sawtooth edges at high latitude.

**One time hint is not enough where there are two humps.** Widening the window
fixes a maximum that has drifted; it does nothing when the visible obscuration
has **two separate humps**, one for each spell the Sun spends above the
horizon, and two neighbouring cells have their maximum in different ones. The
window then stops growing because the maximum sits in the interior of its own
hump. Measured on 2036-08-21 at 78° N: 0.207 where the full sweep gives 0.715,
and the vertex came out pinned four kilometres from its curve, in a spike.

Fixed three ways at once. The refinement now passes **every** hint the
surrounding cells carry, not one; the window covers everything **between** the
hints rather than a slice around each, because the instant of the maximum moves
continuously along the edge being bisected; and a large residual at the end of
the bisection forces the cut to be redone with the full sweep, which depends on
no hint. Cost: a few dozen edges per eclipse pay for a full sweep, which does
not show.

**Where the boundary is a jump, it cannot be refined — it can be smoothed.**
Bisection converges just as well to a discontinuity as to a root, and there the
discontinuity is the right answer. But the grid is 0.56° and at high latitude
that is twenty kilometres of longitude against sixty of latitude, so the chain
of cuts comes out as a zigzag: teeth up to fifty kilometres, with the ten
levels piled on the same jump drawn as a tangle. Vertices known to sit on a
jump are now marked and smoothed, each sliding **along its own grid edge** and
never off it — the direction in which nothing is known, and only that one.

Measured over the 56 eclipses: spikes above 25 km, none; the worst falls from
50.5 to 17.9 km, and vertices with a sharp turn from 436 to 39. A test section
now watches both numbers.

### Also, one claim retired and replaced

Review 4 accepted that the outer limit could not be contoured because the
121-instant sweep reads the fringe as zero. That is true of the obscuration and
false of the geometry. The dashed line now contours the **penumbra margin**
`L1 − m`, which is smooth in time and passes through zero exactly where the
edge of the penumbra touches the ground. What used to be drawn there was the
penumbra outline at the instant of greatest eclipse — a circle, not a limit,
which crossed the bands and had no legend entry saying which of the two it was.

The test that guards it does not measure the contour against itself: it takes
points 40 km either side of the line and requires `local()`, which sweeps 4001
instants with no grid at all, to find an eclipse on the inside and none on the
outside.

## What is left said and not fixed

Above the terminator the region boundary is not a level curve but a jump: the
function goes from zero to a finite value because the Sun sets. Bisection
converges there to the sunset line itself, which is correct, but the distance
to "the curve" is set by the branch next door. Every chord worse than a
kilometre is there — checked: the Sun at 0.00° at its maximum in all of them —
and the tests set them aside by counting them, with a cap on how many there may
be. Away from the terminator the chord sagitta stays at 64 m median, 0.22 km at
the 90th percentile and under 2 km at worst.

And a warning from the reviewer itself that is not a defect in the code:
600 ms of arithmetic on this machine is several seconds of frozen interface on
a modest phone.

## The lesson

The four reviews found different things. The first attacked the physics and it
survived almost whole; what fell was the rhetoric around the margin. The second
attacked the code and found three real numerical errors, two of them in
functions that existed precisely to validate.

The third attacked an interface and found the code correct exactly where there
were tests and fragile everywhere else: the case the tests exercised was a
total eclipse in the northern hemisphere, and practically everything that fell
was outside that description. The worst finding was not made by that review but
by the thread it left behind: the annular eclipses were not annular.

The fourth attacked a new algorithm and found that almost everything was right
— the arithmetic, the topology, the cost — and that what was broken sat at the
**domain boundaries** and in the **optimizations**: the frame believed to be
outside the map and inside it, the time hint that turned the function into a
different one, the search that latched onto the branch next door. None of the
three was visible by reading the code, and a test that discarded exactly that
strip covered all three.

The common pattern: the failures hid where there was no pass criterion. Check
V2 had none. `brentq` had no check that its bracket contained a sign change.
And the reproducibility footnote claimed no figure was hand-written with
nothing verifying it.
