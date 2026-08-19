# Arquitectura

## Flujo de datos

```
DE440s (efemérides JPL)
   │
   ├─ geometry.py ──────────────► data/circumstances.json      contactos C1-C4, obscuración
   │      │
   │      ├─ terrain.py ────────► data/horizon.json            perfil de horizonte GLO-30
   │      ├─ pathgeom.py ───────► data/pathgeom.json           posición dentro de la franja
   │      └─ limbdark.py                                       obscuración ponderada por flujo
   │             │
   │      spectral.py ──────────► data/spectral_timeseries.csv irradiancia espectral
   │             │                data/spectra.npz
   │             ├─ eye.py ─────► data/eye_timeseries.csv      límites ICNIRP
   │             ├─ optics.py                                  plano focal
   │             └─ thermal.py                                 Carslaw y Jaeger
   │
   ├─ perseids.py ──────────────► data/perseids.csv            tasas y Poisson
   │
   └─ eclipsecat.py ────────────► web/data/eclipses.json       56 eclipses 2026-2050,
                                        │                      elementos besselianos
                                        │
                                  web/js/besselian.js ─────────► la misma geometría
                                                                 en el navegador

data/atmosphere.json  (CAMS + ECMWF + WOUDC)
data/literature.json  (toda fuente externa con quote literal)
data/hardware.json    (cámara, objetivo, ojo)
        │
        ├─ figures.py ──────────► figs/*.pdf                   11 figuras
        └─ paperdata.py ────────► paper/tab*.tex               12 tablas
                                  paper/keyvals.tex            ~90 macros
                                        │
                                  paper/paper.tex ─────────────► out/paper.pdf
```

## Los módulos

**`siteconf.py`** Coordenadas, altura y constantes físicas. Fuente única de
verdad. La altura son 616,1 m del DEM Copernicus GLO-30; SRTM da 605 y
Open-Elevation 614, y las tres están anotadas. Una versión anterior calculaba con
605 y publicaba 616,1.

**`geometry.py`** Resuelve los contactos por búsqueda de raíces sobre la
separación angular aparente topocéntrica. Aplica k1 = 0,272488 a los contactos
penumbrales y k2 = 0,272281 a los umbrales, como hacen los elementos besselianos
de la NASA. Usar una sola constante para ambos infla la totalidad 3,8 s.

**`terrain.py`** Muestrea el DEM a lo largo de radiales cada 0,25° de acimut
hasta 100 km, corrige curvatura y refracción con radio terrestre efectivo, y
devuelve la línea de cresta real. El resultado que importa: el horizonte hacia el
poniente está deprimido 0,42°, así que el Sol lo salvaba por 5,17°.

**`pathgeom.py`** Sitúa al observador dentro de la franja. La función que
importa es `umbral_miss()`, que devuelve una cantidad con signo: negativa dentro
de la umbra, cero en el límite. La versión anterior devolvía una duración que
vale 0 fuera de la franja, y `brentq` se cortocircuitaba devolviendo el extremo
de su propio intervalo de búsqueda. Los "55 km hasta el límite" que publicó el
paper eran ese extremo.

**`limbdark.py`** Reduce la integral de solapamiento a una cuadratura radial de
una dimensión. El caso concéntrico usa nodos remapeados en vez de una máscara,
porque una máscara deja un escalón dentro del intervalo y Gauss-Legendre solo
converge como 1/n a través de un salto.

**`radiometry.py`** Masa de aire de Kasten y Young, modelos de banda ancha como
contraste, y α(λ) de Hestroffer y Magnan para el oscurecimiento de limbo.

**`spectral.py`** SPECTRL2 por longitud de onda. A masa de aire 10,7 los modelos
empíricos de banda ancha están fuera de su rango de ajuste, y las ponderaciones
B(λ) y R(λ) de ICNIRP necesitan espectro de todas formas.

**`optics.py`** Irradiancia en el plano focal. Convierte la irradiancia normal
directa en radiancia con el ángulo sólido **proyectado** π sin²α, que es la
relación exacta para un disco visto normalmente. Usar 2π(1−cos α) rompe el límite
termodinámico al nivel de 10⁻⁵, que es justo la identidad con la que el módulo se
comprueba.

**`thermal.py`** Tres regímenes de conducción: unidimensional con buen sumidero,
semiinfinito de Carslaw y Jaeger, y placa delgada con cara trasera adiabática.
`equivalent_irradiance()` reescala un umbral de laboratorio a otro tamaño de
mancha por la invariancia de q·a.

**`eye.py`** Límites ICNIRP 2013. El fotoquímico se reduce a su forma en
irradiancia corneal porque el Sol subtiende menos que el ángulo de aceptación.
El térmico no: α es el diámetro angular de la fuente, y la radiancia se conserva
bajo ocultación, de modo que quien responde al eclipse es α y no L.

**`perseids.py`** Radiante interpolado de la tabla 6 del IMO, longitud solar en
marco J2000, inversión del ZHR y Poisson.

**`validate.py`** Comprobaciones cruzadas. V1 contrasta SPECTRL2 con el espectro
de referencia ASTM G173. V2 contrasta la reimplementación besseliana con las
duraciones centrales que publica la NASA. V3 y V4 comprueban el semidiámetro
solar y la dispersión entre fórmulas de masa de aire.

**`figures.py`** Las once figuras. Paleta validada con el script de la skill
`dataviz`: azul, naranja, violeta, verde en orden fijo, ΔE 24,7 en el peor par
adyacente bajo protanopía. La paleta anterior tenía rojo y verde a ΔE 5,0 siendo
series adyacentes en tres figuras.

**`paperdata.py`** Emite las doce tablas y las macros. El manuscrito no contiene
números escritos a mano.

**`webdata.py`** Exporta al navegador las tablas fijas que la radiometría
necesita y que no se pueden recalcular sin pvlib: los 122 coeficientes de
SPECTRL2, las funciones de ponderación B(λ) y R(λ) de ICNIRP, la curva fotópica
y las constantes del ojo. Nada se ajusta ni se estima aquí; si un valor no está
en una tabla con fuente, no se escribe. El exponente de Ångström se **lee** de
pvlib en tiempo de exportación, para que no pueda separarse del que ejecuta
`spectral.py`, y los límites de ICNIRP se contrastan contra la cita literal de
`data/literature.json` antes de escribirse.

**`eclipsecat.py`** Rama aparte: no entra en la cadena del manuscrito. Busca los
eclipses solares de un rango de años sobre DE440s y ajusta sus elementos
besselianos, que son la compresión que permite llevar la geometría de la sombra
a un navegador: unos cuarenta números por eclipse reproducen la posición de la
umbra a menos de un kilómetro durante las horas que dura el evento. También
resuelve las circunstancias locales desde esos elementos, que es la función que
`web/js/besselian.js` reproduce en JavaScript.

## La web

`web/` es un sitio estático: no hay servidor, no hay peticiones salvo las de sus
propios archivos, y todo el cálculo ocurre en el navegador. Eso esquiva de raíz
los tres bloqueos que [`ROADMAP.md`](../ROADMAP.md) señalaba para una
plataforma, porque ninguno de los tres módulos caros participa.

```
web/index.html            dos modos: por eclipse y por lugar
web/js/besselian.js       geometría: port de eclipsecat.py
web/js/radiometry.js      radiometría: port de spectral, limbdark y eye
web/js/besselian.test.js  el port geométrico contra Python, DE440s y la NASA
web/js/radiometry.test.js el port radiométrico contra las series del manuscrito
web/js/app.js             mapa, capas y redacción de los paneles
web/data/eclipses.json    el catálogo, 60 kB
web/data/spectral.json    tablas fijas de SPECTRL2, ICNIRP y CIE, 7,6 kB
web/vendor/LICENSE-*.txt  los avisos BSD de Leaflet y de pvlib, íntegros
web/data/world.geojson    Natural Earth 110 m, dominio público
web/vendor/               Leaflet 1.9.4, BSD-2-Clause
```

La radiometría no se carga hasta que alguien pulsa el botón: son 8 kB de tablas
y unos 200 ms de cálculo que la mayoría de las visitas no necesitan, y sin una
atmósfera declarada el número no significaría nada. `src/webdata.py` es quien
exporta esas tablas, cada una con su cita.

El mapa es equirectangular (`L.CRS.EPSG4326`), no Mercator. Los mapas de
eclipses se dibujan así por tradición, y además permite volcar la trama de
obscuración como una imagen plana: en Mercator habría que reproyectarla fila a
fila.

## Convenciones

Los archivos de `data/` son productos. Tres son fuentes:
`literature.json`, `atmosphere.json` y `hardware.json`, que llevan las entradas
externas con su procedencia. Borrar el resto de `data/` y volver a correr la
cadena reproduce el PDF.
