# Architecture

## Data flow

```
DE440s (JPL ephemerides)
   │
   ├─ geometry.py ──────────────► data/circumstances.json      contacts C1-C4, obscuration
   │      │
   │      ├─ terrain.py ────────► data/horizon.json            GLO-30 horizon profile
   │      ├─ pathgeom.py ───────► data/pathgeom.json           position inside the path
   │      └─ limbdark.py                                       flux-weighted obscuration
   │             │
   │      spectral.py ──────────► data/spectral_timeseries.csv spectral irradiance
   │             │                data/spectra.npz
   │             ├─ eye.py ─────► data/eye_timeseries.csv      ICNIRP limits
   │             ├─ optics.py                                  focal plane
   │             └─ thermal.py                                 Carslaw and Jaeger
   │
   ├─ perseids.py ──────────────► data/perseids.csv            rates and Poisson
   │
   └─ eclipsecat.py ────────────► web/data/eclipses.json       56 eclipses 2026-2050,
                                        │                      Besselian elements
                                        │
                                  web/js/besselian.js ─────────► the same geometry
                                                                 in the browser

data/atmosphere.json  (CAMS + ECMWF + WOUDC)
data/literature.json  (every external source with a literal quote)
data/hardware.json    (camera, lens, eye)
        │
        ├─ figures.py ──────────► figs/*.pdf                   11 figures
        └─ paperdata.py ────────► paper/tab*.tex               12 tables
                                  paper/keyvals.tex            ~90 macros
                                        │
                                  paper/paper.tex ─────────────► out/paper.pdf
```

## The modules

**`siteconf.py`** Coordinates, elevation and physical constants. Single source
of truth. The elevation is 616.1 m from the Copernicus GLO-30 DEM; SRTM gives
605 and Open-Elevation 614, and all three are annotated. An earlier version
computed with 605 and published 616.1.

**`geometry.py`** Solves the contacts by root finding on the topocentric
apparent angular separation. It applies k1 = 0.272488 to the penumbral contacts
and k2 = 0.272281 to the umbral ones, as NASA's Besselian elements do. Using
one constant for both inflates totality by 3.8 s.

**`terrain.py`** Samples the DEM along radials every 0.25° of azimuth out to
100 km, corrects curvature and refraction with an effective Earth radius, and
returns the real ridge line. The result that matters: the horizon towards the
west is depressed by 0.42°, so the Sun cleared it by 5.17°.

**`pathgeom.py`** Places the observer inside the path. The function that
matters is `umbral_miss()`, which returns a signed quantity: negative inside
the umbra, zero at the limit. The earlier version returned a duration that is 0
outside the path, and `brentq` short-circuited by returning the end of its own
search bracket. The "55 km to the limit" the paper published was that end.

**`limbdark.py`** Reduces the overlap integral to a one-dimensional radial
quadrature. The concentric case uses remapped nodes rather than a mask, because
a mask leaves a step inside the interval and Gauss-Legendre only converges as
1/n across a jump.

**`radiometry.py`** Kasten and Young air mass, broadband models as a
comparison, and Hestroffer and Magnan's α(λ) for limb darkening.

**`spectral.py`** SPECTRL2 wavelength by wavelength. At air mass 10.7 the
empirical broadband models are outside their fitted range, and the ICNIRP B(λ)
and R(λ) weightings need a spectrum anyway.

**`optics.py`** Focal-plane irradiance. Converts direct normal irradiance into
radiance with the **projected** solid angle π sin²α, which is the exact
relation for a disk seen normally. Using 2π(1−cos α) breaks the thermodynamic
limit at the 10⁻⁵ level, which is precisely the identity the module checks
itself against.

**`thermal.py`** Three conduction regimes: one-dimensional with a good heat
sink, semi-infinite Carslaw and Jaeger, and thin plate with an adiabatic back
face. `equivalent_irradiance()` rescales a laboratory threshold to a different
spot size through the invariance of q·a.

**`eye.py`** ICNIRP 2013 limits. The photochemical one reduces to its corneal
irradiance form because the Sun subtends less than the acceptance angle. The
thermal one does not: α is the angular diameter of the source, and radiance is
conserved under occultation, so what responds to the eclipse is α and not L.

**`perseids.py`** Radiant interpolated from IMO Table 6, solar longitude in the
J2000 frame, ZHR inversion and Poisson.

**`validate.py`** Cross-checks. V1 compares SPECTRL2 with the ASTM G173
reference spectrum. V2 compares the Besselian reimplementation with the central
durations NASA publishes. V3 and V4 check the solar semidiameter and the spread
among air-mass formulae.

**`figures.py`** The eleven figures. Palette validated with the `dataviz`
skill's script: blue, orange, violet, green in fixed order, ΔE 24.7 on the
worst adjacent pair under protanopia. The previous palette had red and green at
ΔE 5.0 as adjacent series in three figures.

**`paperdata.py`** Emits the twelve tables and the macros. The manuscript
contains no hand-written numbers.

**`webdata.py`** Exports to the browser the fixed tables radiometry needs and
that cannot be recomputed without pvlib: the 122 SPECTRL2 coefficients, the
ICNIRP B(λ) and R(λ) weighting functions, the photopic curve and the eye
constants. Nothing is fitted or estimated here; if a value is not in a sourced
table, it does not get written. The Ångström exponent is **read** from pvlib at
export time, so it cannot drift from the one running `spectral.py`, and the
ICNIRP limits are checked against the literal quote in `data/literature.json`
before being written.

**`eclipsecat.py`** A separate branch: it does not enter the manuscript chain.
It searches DE440s for the solar eclipses of a range of years and fits their
Besselian elements, which are the compression that lets shadow geometry travel
to a browser: some forty numbers per eclipse reproduce the umbra's position to
under a kilometre for the hours the event lasts. It also solves local
circumstances from those elements, which is the function `web/js/besselian.js`
reproduces in JavaScript.

## The web

`web/` is a static site: no server, no requests beyond its own files except for
the base map and the elevation model, and every calculation happens in the
browser. That sidesteps outright the three blockers
[`ROADMAP.md`](../ROADMAP.md) identified for a platform, because none of the
three expensive modules takes part.

```
web/index.html            two modes: by eclipse and by place
web/stabilise.html        the video stabiliser, a separate page
web/js/lang.js            180 keys × 5 languages, plus the number formatting
web/js/besselian.js       geometry: a port of eclipsecat.py
web/js/radiometry.js      radiometry: a port of spectral, limbdark and eye
web/js/terrain.js         skyline from an elevation model, and buildings
web/js/stabilise.js       the tracker: a port of tools/stab_solar.py
web/js/stabilise-ui.js    two passes over the video, and the recording
web/js/app.js             map, layers and the writing of the panels
web/js/*.test.js          each port against its original, and the dictionaries
web/css/style.css         the three themes, as variables
web/data/eclipses.json    the catalogue, 51 kB
web/data/spectral.json    fixed SPECTRL2, ICNIRP and CIE tables, 8.5 kB
web/data/world.json       coastlines, Natural Earth 1:10 m, delta-encoded
web/vendor/               Leaflet 1.9.4, BSD-2-Clause, with its notice
```

Radiometry does not load until somebody presses the button, and neither does
the terrain horizon: between them, 27 kB of code and 8 kB of tables that most
visits never need, and without a declared atmosphere the irradiance number
would mean nothing anyway. `src/webdata.py` is what exports those tables, each
with its citation.

The first load is eight files and 126 kB gzipped, of which Leaflet is a third.
`world.json` is not among them: it arrives only with the coastline base map or
when a tile server fails, and it is delta-encoded — rings of integer
thousandths of a degree, differenced along the ring, the closing vertex
implied. That is 287 kB against 659 for the same 33 894 vertices, because a
float64 tail next to an eight-kilometre simplification tolerance is noise that
gzip cannot compress. `loadWorld` decodes it back into GeoJSON, one feature per
country, because Leaflet emits one SVG path per feature and the cost of a zoom
goes with the path count.

The map is equirectangular (`L.CRS.EPSG4326`), not Mercator. Eclipse maps are
drawn that way by tradition, but the deciding reason is different: **it reaches
the poles**, and Web Mercator stops at 85.05° while the 2026 track starts at
87° N. There was a third reason while the bands were an image — in Mercator it
would have to be resampled row by row or it would shift by tens of degrees at
high latitude — which no longer applies: they are polygons and the browser
projects them on its own.

### The base maps

Three, and the choice is the visitor's. Two of them are tiled OpenStreetMap
renderings served in EPSG:4326 by the same operator: streets, and shaded relief
with bathymetry. Both stamp an advertisement panel onto part of their tiles;
nothing in the browser can remove it and removing it would breach their terms,
so the third choice exists — the Natural Earth coastlines that ship inside the
page, which make no requests to anybody.

The tiled maps carry a ceiling their projection does not confess: they serve
EPSG:4326 but render from Mercator, so above 85.05° there is nothing to draw
and what comes back is black. Two rectangles in the map's own background
colour, in a pane of their own between the tiles and the bands, cover that
strip at both poles. A cap without cartography reads as what it is; the black
read as a loading failure. The paths and the bands are still drawn on top: the
map reaches the poles, which is what this projection was chosen for. With the
coastline map the rectangles come off, because there is no black to cover and
covering would hide coastline that does reach the pole.

If the tile server does not answer — four errors with no image loaded, or nine
seconds blank — the page says so on screen and switches to the coastlines. The
calculations do not depend on the background, so an ugly fallback still answers
the same.

`tools/make_worldmap.py` generates that file from Natural Earth 1:10 m: 13 MB
of source simplified by Douglas-Peucker to 34 000 vertices and 0.66 MB. The
limit is not bandwidth but rendering, because Leaflet draws it as SVG.

Zoom is bounded on both sides. The minimum is the level at which the world
still covers the window, recomputed on resize, and panning is clamped to the
world, so there is no way to pull empty strips into view at the sides or on
top.

### The obscuration bands

**Polygons**, not a raster. They were a raster, and the trouble with a raster
is that it has one resolution while a map has as many as it has zoom levels: a
1920 × 960 canvas over the whole world is a pixel every 21 km, which at zoom 7
is 34 screen pixels. The bands came out as staircases and the accessible mode's
2-pixel outlines came out as 68-pixel steps. No canvas size fixes that, because
the map goes to zoom 15.

The chain is this:

1. **The grid decides the topology.** 640 × 320 cells and 121 instants: which
   way each level runs and in what order. Nothing else.
2. **Bisection places every vertex.** Every vertex falls on a grid edge whose
   two ends bracket the level, so its position is found by bisecting the real
   maximum-obscuration function along that edge, not by interpolating the two
   grid values. Fourteen steps on a 100 km edge leave the vertex within a few
   metres.
3. **Adaptive subdivision bounds the chord.** The one thing bisection does not
   bound by construction. For a curve sampled at constant step, a vertex's
   distance to the chord joining its neighbours is four times the sagitta of
   one segment, so estimating the error costs no evaluation at all; where it
   exceeds half a kilometre a point is inserted, and that one is computed
   against the real function, along the normal to the chord.

Measured over 2026-08-12: median 64 m, 90th percentile 0.22 km, worst case
under 2 km away from the terminator. The grid no longer fixes the accuracy —
the tolerance does — which is why the drawing survives any zoom.

It costs around 600 ms per eclipse in the browser against 350 ms for the
raster, and the last eight are cached. In exchange, panning and zooming cost
**nothing**: the raster was redrawn and the vector is scaled by the browser. A
`setView` to zoom 7 measured 28 ms, and Leaflet clips the path to the view, so
10 600 vertices become 677 in the DOM.

One polygon per band, each carrying the contour above it as a hole. That way
the fills do not stack: two translucent fills on top of each other would
multiply their alphas and the ten steps would stop being ten. Leaflet draws
every ring of a polygon into a single path with `fill-rule: evenodd`, so the
hole comes out by parity, without working out which ring is inside which.

The outermost band starts at **5 %**, not at the edge of the penumbra. Near
that edge the eclipse lasts minutes and the 121-instant sweep misses it:
measured against a 2001-instant one, the loss reaches 0.0165 of obscuration and
32 of 2227 points of the fringe with an eclipse read as zero. A 0.1 % contour
chases a function that is zero in patches there.

### The visibility limit

The dashed line contours a different quantity: the **penumbra margin**
`L1 − m`, the amount by which the observer is inside or outside the penumbra,
maximized over time with the Sun above the horizon. It is smooth in time, so it
does not depend on the sampling landing inside the eclipse, and it passes
through zero exactly where the edge of the penumbra touches the ground.

It is computed in the same grid pass as the obscuration, because that loop
already has `m` and `L1` in hand and keeping their difference costs nothing.
The fringe needs more care than the obscuration does: a cell right on the shore
can fail to be inside the penumbra at any of the 121 instants and be inside
between two of them, so any cell whose sign disagrees with a neighbour's is
recomputed with a full sweep and no time hint.

What used to be drawn there was the penumbra outline **at the instant of
greatest eclipse** — a circle, not a limit. It crossed the bands and the legend
did not say which of the two things it was.

### Two things hold the accuracy up, and they belong together

**The grid and the refinement have to be the same function.** The 121-instant
sweep falls short of the true maximum: measured, 4·10⁻⁴ in the median and
1.4·10⁻² in the tail, which at a typical gradient is tens of kilometres of
displaced contour. And it falls short by different amounts at different points,
so a grid built on the sweep and a refinement built on the exact value are
level sets of two different functions: 13 % of vertices came out with no sign
change to bisect. That is why the grid makes a second pass refining the maximum
in time by golden section, and why `maxObscuration` runs exactly that same
refinement.

**Above the terminator there is no level curve, there is a jump.** The quantity
drawn is the greatest obscuration *with the Sun above the horizon*, so on the
sunset line it jumps from zero to a finite value. There the region boundary is
a discontinuity, bisection converges to the sunset line itself — which is
correct — and the check `|g − level| ≈ 0` means nothing. The tests identify
those vertices by the Sun's altitude at the instant of their maximum and count
them separately, rather than discarding them in silence.

That jump also decides how the boundary gets drawn. At high latitude the Sun
can set and rise again inside the eclipse, so the visible obscuration has two
humps and two neighbouring cells can have their maximum in different ones. A
vertex known to sit on a jump is marked, and the marked ones are smoothed —
each one sliding **along its own grid edge** and never off it. That the jump
crosses that edge is certain; where along it is not known better than the grid
knows, so smoothing runs in the direction that carries no information and is
forbidden in the direction that does.

**The horizon is the geodetic one, the same on the map and in the panel.** It
looks like a detail and it is not: ζ > 0 is the geocentric horizon, and on an
ellipsoid the two criteria disagree by up to 0.091° of solar altitude. Near
sunset those minutes were worth points of obscuration, and the map once painted
a 30-40 % band at a point whose panel answered 57.9 %. A map that contradicts
its own answer is worse than a coarse map, and `SAFETY.md` forbids it.

The contour lattice is frame, world edge, cell centres, edge, frame. The
**−1 frame** sits one cell outside the world and makes every contour close with
no special case for the poles or the antimeridian; the **world edge** carries
computed values, not interpolated ones, and that is what guarantees the closure
falls outside the map. Without it — and that is how it was written — the edge
joining the last cell centre to the frame was cut by interpolating against −1,
and the cut fell **inside** the map: up to 66 km in along the antimeridian and
39 at the poles, with the wrong band painted there, across all 56 eclipses. A
band that genuinely crosses the antimeridian comes out cut at both edges, which
is what a map that does not repeat has to show.

What makes the grid affordable is exact pruning. The two conditions that rule a
cell out at one instant — the Sun below the horizon, and the penumbra out of
reach along η — are monotone in `cos H`, because both ζ and η depend on the
hour angle only through its cosine. Their intersection is one interval, which
in H is two arcs, which on the grid is two runs of columns: the rest of the row
is skipped without evaluating anything. Since `L1` is replaced by its bound
`l1`, the interval is a superset and the result does not change;
`besselian.test.js` compares the whole grid against `maxObscuration`, which
computes it point by point with no pruning at all.

### The terrain horizon

`web/js/terrain.js` builds the skyline around the marked point from a public
elevation model, on request. Nine tiles, with the zoom level chosen so that
three of them cover the radius at any latitude — Mercator tiles shrink with the
cosine of the latitude, so a fixed zoom would fetch nine at the equator and
thirty-six in Lapland. Elevation comes packed in the RGB channels and is
unpacked on a canvas.

Each azimuth is walked outwards in steps of the model's ground resolution, and
the highest apparent elevation angle is kept, with curvature and mean
refraction folded in through an inflated Earth radius. The search starts below
anything rather than at zero, because from a summit the skyline is *below* the
horizontal — the dip of the horizon — and clamping at zero would call a Sun at
−1° hidden when it is in plain view.

Two things come out of it. The observer's own elevation, which the geometry
takes as a parameter and was receiving zero. And whether the Sun is in view at
each contact, which is the question the page could not answer before.

Building heights are optional and come from OpenStreetMap through Overpass.
Coverage is the whole story, and the panel prints it: of the buildings within
400 m, Manhattan declares a height for 86 % of them, Zaragoza for 0.2 %,
Nairobi for 3 %. So the panel says how many declared one and how many did not,
and leaves a field for declaring by hand the obstacle nobody has mapped.

### Five languages

`web/js/lang.js` holds every user-facing string, grouped by key rather than by
language so that a missing translation is visible on the line where it is
missing. English is the source and Spanish a co-source; the other three are
translated from the meaning with both open.

Numbers never appear as literals in the dictionary. They arrive already
formatted for the active locale through `Intl`, because a decimal point in a
Spanish sentence is a mistake and a decimal comma in an English one is a
different mistake. `lang.test.js` enforces the typography as well as the
parity: decimal comma in the four Romance languages, a space before the per-cent
sign in Spanish, Catalan and French and none in Italian and English,
typographic apostrophes in Catalan, Italian and French, balanced HTML tags, the
same interpolation placeholders in all five, and no second-person address
anywhere.

### The three themes

Light, dark and accessible. They live whole in `web/css/style.css` as
variables, and `app.js` reads them with `cssv()`: the map lines, the marker, the
irradiance chart and the polar caps come from the same palette as the text, so
a theme is a palette and not a second copy of the page. With no stored choice
`prefers-color-scheme` decides, and the theme is applied by a script in the
`<head>` before the first paint, so whoever asked for dark does not get a white
flash.

Each theme carries its own obscuration ramp, which does live in JavaScript
because the band colours are interpolated between stops:

| theme | ramp | why |
|---|---|---|
| light | greys, transparent to nearly black | the background is light and shadow darkens, which is the literal thing |
| dark | blue, violet, red, orange | the usual one, and the one that read well on black |
| accessible | five stops on cividis's blue-yellow axis | no red/green pair, monotone luminance |

The accessible mode also raises the type size, thickens the strokes, takes
contrast to the maximum and **outlines every 10 % step**, so that the
information does not depend on the colour channel at all. The five stops are
not cividis's published table: they are five points on its same axis and with
its same monotone luminance, which is where the property that matters comes
from.

The tiled base maps come in one style each, light. In dark mode the tile is
**dimmed**, not inverted: the usual inversion trick is meant for styles with a
light sea, and these bring a dark blue one, so inverting left the ocean a
luminous cyan brighter than the continent. The relief map is desaturated in
every theme, because its greens and ochres compete with a translucent grey
scale.

## Conventions

The files in `data/` are products. Three are sources: `literature.json`,
`atmosphere.json` and `hardware.json`, which carry the external inputs with
their provenance. Delete the rest of `data/`, run the chain again, and the PDF
comes back.
