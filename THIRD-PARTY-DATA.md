# Third-party data

The project's licences cover what was created here: AGPL-3.0-only for the code
in `src/`, `tools/` and `web/js/`, CC BY-SA 4.0 for the manuscript in `paper/`,
the figures in `figs/` and the documentation in `docs/`. See `LICENSES.md`.

**They do not cover the third-party data the work consumes.** Every provider
keeps its own terms, and those prevail over this licence. Reusing the
repository carries the attribution listed here along with it.

None of these files is versioned in the repository except where stated: the
code downloads them on first run.

---

## Ephemerides and Earth orientation

**JPL DE440s** (`data/de440s.bsp`, in `.gitignore`)
Planetary ephemerides from the Jet Propulsion Laboratory, NASA, distributed by
the Navigation and Ancillary Information Facility. Skyfield downloads them on
its own.
Terms: <https://naif.jpl.nasa.gov/naif/rules.html>

**IERS finals2000A.all** (`data/finals2000A.all`, in `.gitignore`)
Earth orientation parameters from the International Earth Rotation and
Reference Systems Service. The work's ΔT = 69.099 s comes from there.
Terms: <https://www.iers.org>

**Besselian elements of the eclipse**
NASA Goddard Space Flight Center, Fred Espenak's eclipse catalogue. Transcribed
with literal citation in `data/literature.json`.
<https://eclipse.gsfc.nasa.gov/SEsearch/SEsearchmap.php?Ecl=20260812>

## Digital elevation models

**Copernicus DEM GLO-30**, used by `src/terrain.py` for the manuscript.
Read over HTTP from the public bucket `copernicus-dem-30m.s3.amazonaws.com`.
Produced by Airbus Defence and Space under contract with ESA for the European
Union's Copernicus programme. The rights holders are DLR e.V. and Airbus
Defence and Space GmbH.

The access licence requires the copyright notice to accompany the DEM **and
anything derived from it**, and this repository is already a redistributor:
`data/horizon.json` is a horizon profile computed from the DEM, and the 616.1 m
site elevation propagates from there into the figures and the manuscript. So
the notice travels inside that file, in its `_notice` field, and
`src/terrain.py` writes it there whenever the file is regenerated:

> Produced using Copernicus DEM GLO-30. (c) DLR e.V. 2010-2014 and (c) Airbus
> Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European
> Union and ESA; all rights reserved.

Until 20 August 2026 this section identified the obligation and then deferred
it onto whoever reused the repository, while the repository itself was the one
redistributing. Take the notice from the current upstream text before relying
on the wording above.
<https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>

**Mapzen / Amazon Terrain Tiles**, used by the web page for the terrain
horizon. Elevation in metres packed into the RGB channels of a PNG, served
without a key from `s3.amazonaws.com/elevation-tiles-prod`. Nine tiles per
query, cached in the tab, and only when the visitor asks.

**For this dataset the attribution document is the licence.** The AWS Open Data
registry entry names
<https://github.com/tilezen/joerd/blob/master/docs/attribution.md> as the
licence, and that document opens with a block headed *Required attribution*
listing eleven statements. Four of the datasets behind it are CC BY, where
attribution is a condition of the licence and breach terminates it
automatically; others are OGL-UK and OGL-Canada, which also fix the wording.
The eleven are therefore reproduced verbatim in `web/js/terrain.js` and printed
under the horizon result, not summarised.

Until 20 August 2026 the page printed one line naming six labels, which is not
what the licence asks for. That line also named ASTER, which is not among the
sources, and omitted ArcticDEM, which is — and ArcticDEM is what serves the
latitudes where this project's own eclipse begins.

This is the one request the calculator makes that reveals anything about the
visitor: a tile of tens of kilometres a side, enough to say roughly where the
marked point is. Which is why it happens on an explicit button and never on
its own, and why the page says so at the button.

## Atmospheric state

**CAMS**, aerosol optical depth at 550 nm.
Copernicus Atmosphere Monitoring Service, served through the Open-Meteo air
quality API. The licence fixes the form of words, and `data/cams_aod.json`
carries it in its `_notice` field because that file is tracked here:

> Generated using Copernicus Atmosphere Monitoring Service information 2026.
> Neither the European Commission nor ECMWF is responsible for any use of this
> data.

<https://atmosphere.copernicus.eu/>

**ECMWF IFS**, precipitable water vapour, surface pressure and cloud cover.
Served through the Open-Meteo forecast API.
<https://www.ecmwf.int/en/publications/data-policies>

Both arrived through **Open-Meteo**, which has its own terms of use.
<https://open-meteo.com/en/terms>

**WOUDC**, column ozone, station 411 (Zaragoza), contributor AEMET.
The only measured rather than forecast atmospheric datum: 7711 records
downloaded and filtered locally. The WOUDC data policy requires acknowledging
both the centre and the agency that originated the measurement, which is AEMET.
<https://woudc.org/about/data-policy.php>

## Models and reference spectra

**pvlib-python** (BSD-3-Clause) provides the implementations of Kasten and
Young, SPECTRL2, Bird-Hulstrom and Ineichen-Perez, plus the SoDa Linke
turbidity climatology it ships with.
<https://github.com/pvlib/pvlib-python>

**Skyfield** (MIT). <https://rhodesmill.org/skyfield/>

**ASTM G173-03**, the reference spectrum used to validate SPECTRL2. The
standard is paid; NREL distributes the tabulated spectra.
<https://www.nrel.gov/grid/solar-resource/spectra-am1.5.html>

Its atmospheric conditions (AOD 0.084 at 500 nm, 1.42 cm precipitable water,
0.34 atm-cm ozone, 1013.25 hPa) are the web page's **default**. They were
chosen for being a published, recognizable reference case, not because they
describe anywhere: the interface says so and allows changing them.

**The SPECTRL2 coefficient table** — 122 wavelengths with the extraterrestrial
irradiance and the absorption coefficients for water vapour, ozone and mixed
gases — is **redistributed** in `web/data/spectral.json` so the browser can
evaluate the model without pvlib. It comes from Bird and Riordan (1984) through
pvlib, **BSD-3-Clause**, whose licence requires keeping the copyright notice,
the list of conditions and the disclaimer. The full text, copied from the
package itself, is in **`web/vendor/LICENSE-pvlib.txt`**, and the page footer
links there. `src/webdata.py` exports it, and also carries the ICNIRP 2013
B(λ) and R(λ) weighting functions and the CIE 1924 standard observer photopic
curve V(λ).

Until the adversarial review of 19 August 2026 this section claimed the notices
were preserved when all that was present was a bibliographic citation. See
[`docs/REVIEWS.md`](docs/REVIEWS.md).

## Video processing

Only `tools/stab_solar.py` needs these. The chain that produces the manuscript
runs without them, and so does the browser stabiliser, which uses no library at
all.

**OpenCV** (Apache-2.0), installed as `opencv-python-headless`. Decodes the
video and provides template correlation, morphology and the sub-pixel affine
transform. <https://opencv.org/>

**imageio-ffmpeg** (BSD-2-Clause) only wraps an FFmpeg binary and downloads it.
<https://github.com/imageio/imageio-ffmpeg>

**FFmpeg**, the binary that package brings, is compiled with `--enable-gpl`,
`--enable-version3` and `--enable-libx264`, so it is distributed under
**GPL-3.0** and not under the LGPL of the default configuration. This
repository does not redistribute it: it is installed in the environment of
whoever runs the tool, which invokes it as a separate process.
<https://ffmpeg.org/legal.html>

## Cartography and the map library

**The page in `web/` contacts an outside map server**, unless the coastline-only
base map is selected. Worth saying plainly, because for a while it did not and
the documentation assumed otherwise: the two tiled base maps are OpenStreetMap
imagery, and every request carries the bounding box being looked at in the URL
itself. That server sees which area interests the visitor.

Everything else stays self-hosted — Leaflet, the eclipse catalogue, the
spectral tables and the fallback coastlines — and **no calculation leaves the
browser**: a marked coordinate never travels anywhere except as the map
bounding box already on screen.

**Leaflet 1.9.4** — `web/vendor/leaflet-1.9.4.{js,css}` and
`web/vendor/images/`. Vladimir Agafonkin and contributors, **BSD-2-Clause**.
Clause 1 requires keeping, besides the copyright notice, the list of conditions
and the warranty disclaimer. The bundle's `@preserve` block carries only the
copyright, so the full text lives in **`web/vendor/LICENSE-leaflet.txt`** and
covers the CSS and the images too, which carry no notice of their own. The page
footer links there. <https://leafletjs.com>

**OpenStreetMap served in EPSG:4326 by terrestris** — the "streets" base map,
`https://ows.terrestris.de/osm/service`. OpenStreetMap data under **ODbL**,
rendering by terrestris GmbH & Co. KG. Attribution is required and present in
the map control.

**Shaded relief and OpenStreetMap served in EPSG:4326 by mundialis** — the
"relief" base map, `https://ows.mundialis.de/services/service`, layer
`TOPO-OSM-WMS`, operated by the same company. Besides OpenStreetMap under ODbL
it composites Natural Earth, GEBCO 2021 bathymetry (doi:10.5285/c6612cbe-50b3-
0cff-e053-6c86abc09f8f), SRTM 450 m by ViewfinderPanoramas, Great Lakes
bathymetry by NGDC, and SRTM 30 m by NASA EOSDIS LP DAAC. Using the service
also means accepting the operator's privacy policy,
<https://www.terrestris.de/en/datenschutzerklaerung/>.

Both services stamp an advertisement — a panel with a QR code — onto part of
the tiles they serve. It is theirs, it is the price of a free service, and this
page neither removes it nor hides it. What it does instead is offer a base map
that does not carry one.

A WMS is used instead of the usual OpenStreetMap tiles for a geometric reason,
not a matter of taste: the standard tile pyramid is **Web Mercator**, and Web
Mercator has no poles. It stops at 85.05°, because the projection sends 90 to
infinity. Eclipse paths reach there — the August 2026 one starts at 87° N — so
a Mercator background would cut the beginning off this work's own eclipse. The
WMS delivers the same data in the projection the map already uses, which
reaches ±90.

With a limit worth declaring: **the WMS serves EPSG:4326 but renders from
Mercator**, so above 85.05° it has nothing either, and what it returns there is
black. The page covers it with the map background colour rather than showing
it, because a cap without cartography reads as what it is while the black read
as a loading failure. That is: the map reaches the poles and the bands and
paths are drawn there, but the street background is not.

**Natural Earth, admin-0 countries at 1:10 m** — `web/data/world.json`, the
coastline base map and the offline fallback. **Public domain**, no attribution
required; cited anyway out of courtesy and because provenance matters.
<https://www.naturalearthdata.com>

It is not redistributed as is: the original is 13 MB and
`tools/make_worldmap.py` simplifies it by Douglas-Peucker to 34 000 vertices
and 0.66 MB, drops rings below a minimum area and keeps only each country's
name. The versioned file is that product, and the script regenerates it with
whatever tolerance it is given. An earlier version used the 1:110 m scale,
which at country level drew coastlines as straight segments and had almost no
islands.

None of these is relicensed: they keep their own terms even though the rest of
the repository is under AGPL-3.0 and CC BY-SA 4.0. The ODbL in particular is
viral over derived databases; nothing is derived here, only displayed.

**Overpass API**, optional, for building heights in the terrain horizon.
A query to `overpass-api.de` returns the footprints and tags of buildings
within 400 m of the marked point. It is OpenStreetMap data under **ODbL**, and
it is a shared free endpoint used under its own terms; the query is sent only
when the visitor presses the button that says so, and it does send the marked
coordinate. The result is a Produced Work in the sense of ODbL 4.3, so the
panel that shows it names OpenStreetMap and links the licence.

`overpass-api.de` is **not** an OSM Foundation service — it is an independently
run public instance, and the Foundation's operations policies list Tile,
Vector Tile, Nominatim, API and Security, with no Overpass entry. The terms
that apply are the instance's own.
<https://overpass-api.de/> · <https://dev.overpass-api.de/>

**Cividis**, the accessible mode's ramp, is cited as a reference and not
redistributed: Nuñez, Anderton and Renslow (2018), *Optimizing colormaps with
consideration for color vision deficiency to enable accurate interpretation of
scientific data*, PLoS ONE 13(7) e0199239, CC BY 4.0. What the code carries is
**five stops of its own** on the same blue-yellow axis and with the same
monotone luminance, not their table of values.

## Cited literature

`data/literature.json` contains short literal transcriptions from copyrighted
articles, among them the **ICNIRP 2013** guidelines (*Health Physics* 105(1)
74-96) and Hestroffer and Magnan (1998). They are equations, constants and
numeric tables cited for verification, with the source beside each entry.
Numeric values are facts and carry no copyright; the text around them does,
which is why the quotations are the smallest that still allow the calculation
to be checked.

**ISO 12312-2:2015 has not been consulted.** It is paid and was not acquired.
No figure in the work comes from it. It appears only as the name of the
certification that solar filters must carry.

---

## Reusing this

1. Cite the work under the terms of `LICENSE`.
2. Attribute every source in this list separately, under its own terms.
3. Download the third-party data again from its origin. Do not redistribute it
   from here.
