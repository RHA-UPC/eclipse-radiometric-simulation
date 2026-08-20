# Provenance of every input

No model input is left without an origin. What could not be verified is
declared as such, here and in the manuscript.

## Ephemerides and geometry

**JPL DE440s.** Kernel `de440s.bsp` downloaded from NAIF. Topocentric apparent
positions through Skyfield, with light-time correction, aberration and
deflection.

**ΔT.** 69.099 s, from the IERS Earth orientation parameters. The prediction
NASA generated its eclipse ephemerides with assumed 71.4 s. The 2.30 s
difference amounts to displacing the observer 0.8 km east.

**Lunar radius constants.** k1 = 0.272488 and k2 = 0.272281, from the Besselian
elements NASA publishes for this particular eclipse
(`SE2026Aug12Tbeselm.html`), transcribed in `data/literature.json`.

**Solar radius.** 695 700 km, the nominal value from IAU 2015 Resolution B3. It
gives a semidiameter of 959.23″ at 1 au; the classical 959.63″ corresponds to
the older 696 000 km radius.

## Terrain

**Copernicus DEM GLO-30**, ESA and Airbus, 1 arcsecond, heights over EGM2008.
Read over HTTP with `/vsicurl/`, unauthenticated.

**Terrestrial refraction coefficient** k_r = 0.13, the classical value Gauss
derived in 1826 for the Hanover geodetic network. The work reports the
sensitivity for k_r between 0.07 and 0.20; the conclusion does not change.

## Atmosphere

| Variable | Value | Origin |
|---|---|---|
| AOD 550 nm | 0.16 | CAMS through Open-Meteo, forecast for the day |
| Precipitable water vapour | 2.76 cm | ECMWF IFS through Open-Meteo |
| Surface pressure | 949.9 hPa | ECMWF IFS |
| Cloud cover | 0 % at three levels | ECMWF IFS |
| Column ozone | 0.3109 atm-cm | **measured**, WOUDC station 411 |
| Linke turbidity, August | 4.202 | SoDa climatology bundled with pvlib |

Ozone is the only one that is not a forecast. It comes from the Brewer MKIV
spectrophotometer AEMET operates in Zaragoza, 136 km from the site and at
almost the same latitude. The full series (7711 records) was downloaded from
the WOUDC API and filtered locally: 189 days from the 8–16 August window
between 2001 and 2024 give 310.9 ± 13.8 DU.

The interesting part is not the value but that it was shown to be irrelevant.
Moving from the 0.300 atm-cm the work assumed before to the observed value
shifts the direct beam by 0.09 % and the blue-light irradiance by 0.03 %.
Running across the 24 years of historical range, 280 to 364 DU, shifts them by
less than 0.7 %.

## Models

**Kasten and Young (1989)** for relative air mass, through pvlib. At 4.75°
altitude the spread among five published formulae is 2.9 %, so air mass is not
the weak link.

**Bird and Riordan (1984), SPECTRL2**, through pvlib. Validated against the
ASTM G173 reference spectrum: it reproduces its direct integral to +2.09 %.

**Bird and Hulstrom (1981)** and **Ineichen and Perez (2002)** as broadband
comparisons. At air mass 10.7 the three differ by a factor of 3, and that
spread is the real uncertainty of the radiometric chain.

**Hestroffer and Magnan (1998)** for limb darkening. Power law I(μ) = μ^α with
α(λ) from their equation 5. The ADS facsimile was read directly and its Table 2
is transcribed.

**TSI** 1360.8 ± 0.5 W/m², from Kopp and Lean (2011), corrected for the real
Sun-observer distance at the instant.

## Exposure limits

**ICNIRP 2013**, *Health Physics* 105(1) 74-96. The primary PDF was read
directly. Equations 6, 7, 13, 14, 16 and 17 and Tables 2 to 5 are transcribed
with literal quotes, including the complete table of weighting functions B(λ)
and R(λ).

**ISO 12312-2 is cited but has not been consulted.** It is paid and was not
acquired. No figure in the work comes from it: it appears as the name of the
certification filters must carry, and that use rests on the American
Astronomical Society's guidance, which was read.

## Damage threshold

**Schwarz, Ritt, Koerber and Eberle (2017)**, *Optical Engineering* 56(3)
034108, open access. The only continuous-wave threshold for a silicon sensor
published together with its spot size. They measured a 2010 Aptina MT9V024 with
6 µm pixels; no equivalent measurement exists for a modern consumer sensor.

**Microlenses.** Reflow between 125 and 150 °C, from two independent works on
photoresist microlens arrays. Both are novolac photoresist, not image-sensor
microlenses, and the paper says so.

**Colour filter.** Baked at 150-250 °C during manufacture, from a Fujifilm
patent. A survival bound, not a degradation one. No quantitative bleaching
temperature was found.

**Sensor.** OmniVision OV5647: 70 °C operating, 125 °C storage as absolute
maximum. Full datasheets for Sony IMX and ON Semi AR are not public.

## Hardware

**Canon EOS 200D.** 22.3 × 14.9 mm CMOS, 6000 × 4000, pixel pitch 3.717 µm.
From Canon's product specification sheet, served by a third-party CDN because
canon.com blocks automated download. Confirmed afterwards by the EXIF of the
observer's photographs.

**Tamron 16-300 B016.** 16 elements in 12 groups, confirmed on Tamron's
official page. The breakpoints of maximum aperture against focal length come
from the reference the observer supplied. No published transmittance
measurement exists, so the work uses τ = 1, which is the conservative bound.

**Xiaomi 13T Pro.** State `verified-secondary`: mi.com returns 403 to automated
download and the values come from a search index that quotes the official page.
The real focal lengths are derived from the equivalent one and the sensor
format, with the derivation written out in `data/hardware.json`.

## Mechanical verification of the bibliography

29 entries: 16 with a DOI, 8 with a URL, 5 with neither.

All 16 DOIs resolve in Crossref and the registered title matches the cited one.
Of the 8 URLs, 7 return HTTP 200; the eighth is the CAMS API endpoint, which
answers 400 without query parameters.

Of the five without an identifier: Hestroffer and Magnan and the OV5647
datasheet were read directly. Carslaw and Jaeger was verified by reproducing
their solution independently, without reading the original. Skyfield is cited
through its ASCL registration. ISO 12312-2 was not consulted.

Artefacts: `data/bib_index.json`, `data/bib_verification.json`,
`data/bib_url_check.json`.
