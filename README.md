# Solar eclipses, computed in the browser

Circumstances of every solar eclipse from 2026 to 2050, at any point on Earth,
worked out where the page is open and nowhere else. Fifty-six eclipses: 16
total, 18 annular, 3 hybrid, 19 partial.

The site is static and there is no back end. The catalogue, the tables and
Leaflet are self-hosted, and every number on the screen is produced by the
visiting browser, so a marked coordinate is never sent anywhere.

```bash
cd web && python -m http.server 8000     # then open http://localhost:8000
```

## What it answers

**By eclipse.** Pick one and the map draws the central line, both umbral
limits, the outer limit of visibility and the greatest obscuration in bands.
Mark a point and it gives the local circumstances: what fraction of the disk
gets covered, how long the central phase lasts, the four contacts in UTC, and
the Sun's altitude and azimuth at each of them.

**By place.** Mark the point and get the eclipses visible from there between
2026 and 2050, in order.

**Real horizon.** On request, the page downloads the elevation model for the
surrounding 25 km and works out the skyline azimuth by azimuth. Out of that
come two things the geometry needed and was doing without: the observer's own
elevation, and whether the Sun is actually in view at each contact or sitting
behind a ridge. OpenStreetMap building heights can be folded in where anyone
has recorded them, and there is a field for declaring the obstacle nobody has
mapped — the block across the street, the tree line.

**Irradiance and ocular exposure.** A button under each point solves SPECTRL2
over 122 wavelengths, the chromatic transmission of the eclipse with limb
darkening, and both ICNIRP 2013 limits. Around two tenths of a second per
point, on the visitor's machine.

None of it comes precomputed, and that is not a disk-space decision. Irradiance
depends on the atmospheric state of the point and the day, which this project
has measured only over the Ebro; precomputing the planet would mean inventing
an atmosphere and presenting it as data. The page does the opposite: it asks
for the hypothesis and shows it next to the result. The ASTM G173-03 reference
conditions are the default, the measured Ebro atmosphere is the second preset,
and any atmosphere can be typed in.

**Video stabiliser.** `web/stabilise.html` pins the eclipsed Sun to a fixed
point of the frame, decoding and re-encoding the video in the browser. The file
is opened from disk with the File API and never uploaded.

## Five languages, three themes

The interface ships in English, Spanish, Catalan, Italian and French. Each one
follows its own typographic norms rather than the source language's: decimal
comma in the four Romance languages, a space before the per-cent sign in
Spanish, Catalan and French and none in Italian and English. Numbers are
formatted for the active locale, not translated after the fact.
`web/js/lang.test.js` fails the build on a missing key, a mismatched
placeholder, or an unbalanced HTML tag inside a string.

Three themes: light, dark, and one built for colour blindness and low vision —
maximum contrast, larger type, thicker strokes, a ramp with no red/green pair
anywhere, and every 10 % step outlined so that nothing depends on the colour
channel. With no choice stored, the operating system decides.

## Where the numbers come from

`src/eclipsecat.py` walks the new Moons over JPL DE440s, keeps the ones that
produce an eclipse, and **fits its own Besselian elements** instead of copying
a published table. Some forty numbers per eclipse reproduce the shadow to under
a kilometre for the hours it lasts, and they are the only way a browser answers
without loading a 32 MB ephemeris and a root finder.

Two differences against NASA remain, declared, and neither is an error: this
project adopts the nominal IAU 2015 solar radius (695 700 km) where Espenak's
elements imply 696 000, and uses Skyfield's ΔT (69.10 s) where NASA adopted
71.4 s. The first moves the limits by about 700 m. The second moves nothing on
the ground, because each side is self-consistent.

The checks are the part that matters:

```bash
python src/eclipsecat.py --selftest      # elements, central line, catalogue
python src/webdata.py --selftest         # exported tables and their provenance
node web/js/besselian.test.js            # geometry: the port against all three
node web/js/radiometry.test.js           # radiometry: the port against the paper
node web/js/stabilise.test.js            # the tracker against the Python original
node web/js/lang.test.js                 # five dictionaries, key by key
```

Between them they require that local circumstances reproduce the DE440s chain
in `geometry.py` to under 1.5 s at every contact, that the central line falls
within 3 km of NASA's published one, and that annularity durations reproduce
the published values for 2027, 2028 and 2031.

The invariant that matters most ties the drawing to the calculation: **on the
edge of the path the central phase lasts zero seconds, three kilometres inside
it does not, and three kilometres outside it is zero again.** Without it the
map can draw a perfectly convincing path in the wrong place, which is the worst
failure this page can commit.

Four adversarial reviews have attacked all of this. What they found, and what
one of them missed and turned up later by pulling on its own thread, is in
[`docs/REVIEWS.md`](docs/REVIEWS.md), uncut.

## The obscuration bands

Vector polygons, not an image, so they stay clean at zoom 2 and at zoom 15. The
computing grid only decides which way each contour runs; every vertex is then
placed by bisecting the real function, and the chords are subdivided until they
sit within half a kilometre of the curve. Around half a second per eclipse,
once, after which panning and zooming cost nothing.

The outermost band starts at 5 %, not at the edge of the penumbra. Near that
edge the eclipse lasts minutes and a 121-instant sweep of the obscuration
misses it. The true limit is the dashed line, which contours a different
quantity — the penumbra margin `L1 − m`, smooth in time — and therefore passes
exactly where the edge of the penumbra touches the ground.

## The base map

Three choices, because none of them wins outright.

Streets and relief come from a third party, free of charge, and in exchange it
stamps its mark on the tiles: a small panel with a QR code every few hundred
pixels. Nothing in the browser can remove it, and removing it would breach the
terms of the service that gives the tiles away. Over a city it goes unnoticed;
over desert or open sea, which is where an eclipse path spends most of its run,
it is left alone on the screen.

The third choice, Natural Earth coastlines, ships inside the page: no mark, no
requests to anybody, and therefore no record of the visit anywhere. It is what
eclipse maps have always drawn.

The tiles arrive from a WMS in EPSG:4326 rather than from the usual
OpenStreetMap pyramid, for geometry and not for taste: the standard pyramid is
Web Mercator, which stops at 85.05° because the projection sends the pole to
infinity, and eclipse paths go further north — the 2026 track starts at 87° N.
That server carries the same ceiling internally, so above 85° there is nothing
to draw and the polar caps get no street background. The map itself reaches
90°, and the path and the bands are drawn there all the same.

If the tile server does not answer, the page notices within a second and falls
back to the built-in coastlines. The calculations do not depend on the
background: they are the same with a map and without one.

## What the web still does not compute

The corona. During totality the direct beam is exactly zero, which is what the
page says; the light that remains then is coronal, of order a million times
fainter, and calls for different physics.

Vegetation and anything beyond 25 km, in the terrain horizon. Refraction is a
mean value, and near the ground at sunset the real value swings enough to move
a distant skyline by a few arcminutes.

## Where this came from

The tool grew out of a study of one eclipse: the total solar eclipse of 12
August 2026 observed from a Republican observation post of the Battle of the
Ebro, near La Figuera (Priorat, Tarragona), at 41.212878 N · 0.709488 E,
616.1 m. The manuscript is **[`out/paper.pdf`](out/paper.pdf)** (22 pages,
Spanish).

Totality happened with the Sun under five degrees above the horizon and half an
hour before sunset. That geometry is rare in the Iberian Peninsula and it moves
the risk balance in two opposite directions: it sinks the thermal risk to a
camera sensor and leaves the photochemical risk to the retina intact, which
additionally loses the aversion reflex because a low Sun no longer dazzles.

| Question | Short answer |
|---|---|
| Was the site inside the path? | Yes, 41.9 km from the northern limit measured perpendicularly. 70.27 s of totality. |
| Did terrain block it? | No. The horizon towards the west is depressed by 0.42° and the Sun cleared it by 5.17°. |
| How much does dusk darken things compared with the eclipse? | Direct irradiance falls from 490 to 186 W/m² from the Sun's descent alone. The atmosphere takes 62 % before the Moon contributes anything. |
| Does the SLR sensor get damaged? | No. Honest worst case 6.84 K of local heating, and 18× margin against the only published continuous-wave threshold quoted with its spot size. |
| And the eye? | There it inverts. The ICNIRP retinal thermal limit is exceeded by 30 % at first contact. |
| Odds of catching a Perseid during totality? | 0.67 % in the most favourable configuration of the sweep: 16 mm, limiting magnitude 4. |

`node web/js/radiometry.test.js` requires the browser port to reproduce
`data/spectral_timeseries.csv` and `data/eye_timeseries.csv`, which is the
chain that produced the manuscript. With the measured Ebro atmosphere it
returns 187 W/m² at maximum, air mass 10.7 and the thermal limit exceeded 1.34
times: the paper's numbers.

### Reproducing the paper

```bash
cd src
python geometry.py      # DE440s + Besselian  -> data/geometry.json
python terrain.py       # GLO-30 horizon      -> data/horizon.json
python pathgeom.py      # position in the path-> data/pathgeom.json
python spectral.py      # SPECTRL2            -> data/spectral_timeseries.csv
python eye.py           # ICNIRP limits       -> data/eye_timeseries.csv
python perseids.py      # rates and Poisson   -> data/perseids.csv
python validate.py      # cross-checks
python figures.py       # 11 figures          -> figs/
python paperdata.py     # 12 tables + keyvals -> paper/

cd ../paper && tectonic paper.tex && mv paper.pdf ../out/
```

Skyfield downloads `de440s.bsp` and `finals2000A.all` on the first run. Delete
`data/` except for the three source files, run the chain again, and the PDF
comes back.

### The stabiliser on the command line

`tools/stab_solar.py` is the original of the browser tool, and still the one to
use for a long clip or a batch:

```bash
uv pip install opencv-python-headless imageio-ffmpeg
python tools/stab_solar.py input.MP4 output.mp4 [--fit] [--end 1209] [--crop 1080]
python tools/stab_solar.py --selftest
```

It fits a circle to the solar limb rather than to the brightness centroid. The
centroid of a crescent is not the centre of the Sun: it sits inside the lit
part and marches towards the uncovered limb as the Moon advances, so following
it would shift the Sun by most of a radius over the partial phase, in step with
the eclipse it is meant to hold still. The limb is an arc of constant radius
about the solar centre whatever the coverage.

During totality there is no photosphere to fit. If the camera has opened up
enough to expose the corona, the Moon appears as a dark disk closed inside it
and its centroid serves. While totality is still exposed for the photosphere
the frame carries no signal at all, and those frames are interpolated.

Against a lit sky no threshold works: the photosphere blooms far past its own
limb and what gets measured is the flare. There the reference is the Moon,
which does not bloom, located by a **signed** circular Hough. Polarity is what
separates them: going outward, the lunar limb steps dark to bright and the
flare boundary the other way, so scoring the radial gradient with its sign
keeps one and discards the other. An unsigned Hough scores both alike and goes
with whichever is brighter.

`--fit` crops to the largest 16:9 window no frame runs off, because against a
lit sky the blank strips left by the shift are visible. What limits that crop
is not how far the tripod moved but the centring: the window has to sit
symmetric about the Sun in every frame, so its half-width cannot exceed the
Sun's closest approach to any edge. A body framed low costs height however much
unused sky sits above it — in the reappearance take, with the Sun 200 px from
the bottom edge, 1920×1080 comes out as 708×398.

`--end` cuts where the shot stops being the same one, for instance if it gets
reframed halfway.

## Layout

```
src/        14 modules, each with self-checks that fail loudly
data/       three source files with provenance, the rest are products
docs/       architecture, results, adversarial reviews, sources, photographs
paper/      LaTeX manuscript, generated tables and macros
figs/       11 figures, palette validated for colour blindness
tools/      pre-push privacy check, command-line video stabiliser
web/        static site: eclipse map 2026-2050, calculation in the browser
```

Start at [`CLAUDE.md`](CLAUDE.md) to touch the code, and at
[`docs/FINDINGS.md`](docs/FINDINGS.md) for the results alone.

## What is not here

The 23 photographs of the observation. They carry the camera body's serial
number in the Canon MakerNote, which identifies a physical device. The analysis
done with them survives whole in [`docs/PHOTOS.md`](docs/PHOTOS.md) and in the
derived JSON, which keep only model, optics, exposure time, aperture and ISO.

## Declared limits

Three things stay open, and the manuscript says so:

- No published damage threshold exists for a modern consumer CMOS sensor. The
  comparison uses a 2010 Aptina MT9V024 with 6 µm pixels.
- The relevant damage mode is a permanent loss of sensitivity, visible only in
  a flat field. The photographs cannot establish it.
- The claim that the shutter curtain runs more risk than the sensor has no
  peer-reviewed backing. The search was made and it failed.

## Where this is going

The geometric half of the jump is done: `web/` computes any of the 56 eclipses
between 2026 and 2050 at any point, with no server. What remains blocked is the
radiometric half, broken down in [`ROADMAP.md`](ROADMAP.md): `pathgeom.py`
takes thirty to sixty minutes, `terrain.py` reads the DEM over HTTP on every
query, and the site lives written into `siteconf.py`.

## Contributing

Corrections are welcome, especially the ones that arrive with the case that
exposed them. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first: one rule applies
without exception, and it is that no figure enters without provenance.

Every contribution requires signing [`CLA.md`](CLA.md), which assigns the
holder the rights needed to offer the project under other licences.

## Safety

[`SAFETY.md`](SAFETY.md) is required reading before using any number from here
to decide what to do with an eye or a camera. The exposure times this project
computes are the result of applying the ICNIRP equations under declared
hypotheses, not a recommendation.

## Licence

Code under **AGPL-3.0-only**, text and figures under **CC BY-SA 4.0**. Which
covers what is set out in [`LICENSES.md`](LICENSES.md).

AGPL was chosen because the project aims to be a web platform: its section 13
requires anyone offering a modified version over a network to publish the
source, which the GPL does not.

Third-party data keeps its own terms and is not relicensed: **read
[`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) before reusing anything.**
