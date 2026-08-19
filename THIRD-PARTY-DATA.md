# Datos de terceros

Las licencias del proyecto cubren lo que se ha creado aquí: AGPL-3.0-only para
el código de `src/` y `tools/`, CC BY-SA 4.0 para el manuscrito de `paper/`, las
figuras de `figs/` y la documentación de `docs/`. Ver `LICENSES.md`.

**No cubre los datos de terceros que el trabajo consume.** Cada proveedor
conserva sus propios términos, que prevalecen sobre esta licencia. Si reutilizas
el repositorio, la atribución que aquí se lista te obliga igual.

Ninguno de estos archivos se versiona en el repositorio salvo donde se indica:
el código los descarga en la primera ejecución.

---

## Efemérides y orientación terrestre

**JPL DE440s** (`data/de440s.bsp`, en `.gitignore`)
Efemérides planetarias del Jet Propulsion Laboratory, NASA, distribuidas por el
Navigation and Ancillary Information Facility. Skyfield las descarga sola.
Términos: <https://naif.jpl.nasa.gov/naif/rules.html>

**IERS finals2000A.all** (`data/finals2000A.all`, en `.gitignore`)
Parámetros de orientación terrestre del International Earth Rotation and
Reference Systems Service. De ahí sale el ΔT = 69,099 s del trabajo.
Términos: <https://www.iers.org>

**Elementos besselianos del eclipse**
NASA Goddard Space Flight Center, catálogo de eclipses de Fred Espenak.
Transcritos con cita literal en `data/literature.json`.
<https://eclipse.gsfc.nasa.gov/SEsearch/SEsearchmap.php?Ecl=20260812>

## Modelo digital del terreno

**Copernicus DEM GLO-30**
Leído por HTTP desde el bucket público `copernicus-dem-30m.s3.amazonaws.com`.
Producido por Airbus Defence and Space bajo contrato con la ESA para el programa
Copernicus de la Unión Europea. Los titulares de derechos son DLR e.V. y Airbus
Defence and Space GmbH.

La licencia de acceso exige reproducir un aviso de copyright literal. **No lo
transcribo aquí de memoria**: tómalo del texto vigente antes de redistribuir
nada derivado del DEM.
<https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>

## Estado atmosférico

**CAMS**, espesor óptico de aerosoles a 550 nm.
Copernicus Atmosphere Monitoring Service, servido por la API de calidad del aire
de Open-Meteo. Los productos Copernicus exigen atribución al servicio y a la
Unión Europea.
<https://atmosphere.copernicus.eu/>

**ECMWF IFS**, vapor de agua precipitable, presión en superficie y nubosidad.
Servido por la API de previsión de Open-Meteo.
<https://www.ecmwf.int/en/publications/data-policies>

Ambas llegaron a través de **Open-Meteo**, que tiene sus propios términos de uso.
<https://open-meteo.com/en/terms>

**WOUDC**, ozono en columna, estación 411 (Zaragoza), contribuidor AEMET.
Es el único dato atmosférico medido y no pronosticado: 7711 registros
descargados y filtrados en local. La política de datos del WOUDC exige reconocer
tanto al centro como al organismo que originó la medida, o sea AEMET.
<https://woudc.org/about/data-policy.php>

## Modelos y espectros de referencia

**pvlib-python** (BSD-3-Clause) aporta las implementaciones de Kasten y Young,
SPECTRL2, Bird-Hulstrom e Ineichen-Perez, más la climatología de turbidez de
Linke de SoDa que trae empaquetada.
<https://github.com/pvlib/pvlib-python>

**Skyfield** (MIT). <https://rhodesmill.org/skyfield/>

**ASTM G173-03**, espectro de referencia usado para validar SPECTRL2. La norma
es de pago; los espectros tabulados los distribuye NREL.
<https://www.nrel.gov/grid/solar-resource/spectra-am1.5.html>

Sus condiciones atmosféricas (AOD 0,084 a 500 nm, 1,42 cm de agua precipitable,
0,34 atm-cm de ozono, 1013,25 hPa) son el **valor por defecto** de la web. Se
eligieron por ser un caso de referencia publicado y reconocible, no porque
describan ningún lugar: la interfaz lo dice y deja cambiarlas.

**La tabla de coeficientes de SPECTRL2** — 122 longitudes de onda con la
irradiancia extraterrestre y los coeficientes de absorción de vapor de agua,
ozono y gases mezclados — se **redistribuye** en `web/data/spectral.json` para
que el navegador pueda evaluar el modelo sin pvlib. Procede de Bird y Riordan
(1984) a través de pvlib, **BSD-3-Clause**, cuya licencia exige conservar el
aviso de copyright, la lista de condiciones y el descargo. El texto íntegro,
copiado del propio paquete, está en **`web/vendor/LICENSE-pvlib.txt`**, y el pie
de la web enlaza ahí. La exporta `src/webdata.py`, que también lleva las
funciones de ponderación B(λ) y R(λ) de ICNIRP 2013 y la curva fotópica V(λ)
del observador patrón CIE 1924.

Hasta la revisión adversarial del 19 de agosto de 2026 este apartado afirmaba
que los avisos se conservaban cuando lo único presente era una cita
bibliográfica. Ver [`docs/REVIEWS.md`](docs/REVIEWS.md).

## Tratamiento de vídeo

Solo las necesita `tools/stab_solar.py`. La cadena que produce el manuscrito
funciona sin ellas.

**OpenCV** (Apache-2.0), instalado como `opencv-python-headless`. Decodifica el
vídeo y aporta la correlación con plantilla, la morfología y la transformación
afín subpíxel. <https://opencv.org/>

**imageio-ffmpeg** (BSD-2-Clause) solo envuelve un binario de FFmpeg y lo
descarga. <https://github.com/imageio/imageio-ffmpeg>

**FFmpeg**, el binario que trae ese paquete, viene compilado con `--enable-gpl`,
`--enable-version3` y `--enable-libx264`, así que se distribuye bajo **GPL-3.0**,
no bajo la LGPL de la configuración por defecto. Este repositorio no lo
redistribuye: se instala en el entorno de quien ejecuta la herramienta, que lo
invoca como proceso aparte. <https://ffmpeg.org/legal.html>

## Cartografía y biblioteca del mapa

**La web de `web/` contacta con un servidor de mapas ajeno.** Conviene decirlo
sin rodeos, porque durante un tiempo no lo hacía y la documentación lo
presumía: el fondo del mapa son ahora imágenes de OpenStreetMap, y cada
petición lleva en la propia URL el recuadro que se está mirando. Ese servidor ve
qué zona le interesa a quien visita la página.

Todo lo demás sigue autoalojado —Leaflet, el catálogo de eclipses, las tablas
espectrales y las costas de respaldo—, y **ningún cálculo sale del navegador**:
las coordenadas que alguien marque no viajan a ninguna parte más que como el
recuadro del mapa que está viendo.

Si ese servidor no responde, la web lo detecta y dibuja las costas de Natural
Earth, que van en la propia página. A partir de ahí no hay ninguna petición
externa. Esa es la única razón por la que el fichero de costas existe: es un
respaldo, y por eso se descarga solo cuando hace falta.

**Leaflet 1.9.4** — `web/vendor/leaflet-1.9.4.{js,css}` y `web/vendor/images/`.
Vladimir Agafonkin y colaboradores, licencia **BSD-2-Clause**. La cláusula 1
exige conservar, además del aviso de copyright, la lista de condiciones y el
descargo de garantía. El `@preserve` del bundle solo lleva el copyright, así que
el texto completo vive en **`web/vendor/LICENSE-leaflet.txt`** y cubre también
el CSS y las imágenes, que no llevan aviso propio. El pie de la web enlaza ahí.
<https://leafletjs.com>

**OpenStreetMap servido en EPSG:4326 por terrestris** — capa «Calles»,
`https://ows.terrestris.de/osm/service`. Datos de OpenStreetMap bajo **ODbL**,
representación de terrestris GmbH & Co. KG. Atribución obligatoria y presente en
el control del mapa: «© terrestris, datos de OpenStreetMap (ODbL)».

Se usa un WMS en lugar de las teselas habituales de OpenStreetMap por una razón
geométrica, no de gusto: la pirámide de teselas estándar es **Web Mercator**, y
Web Mercator no tiene polos. Se corta en 85,05°, porque la proyección manda el
90 al infinito. Las trayectorias de eclipse llegan allí — la de agosto de 2026
empieza a 87° N — así que un fondo en Mercator le cortaría el principio al
propio eclipse de este trabajo. El WMS entrega los mismos datos en la
proyección que el mapa ya usa, que llega a ±90.

Con un límite que conviene declarar: **el WMS sirve en EPSG:4326 pero renderiza
desde Mercator**, así que por encima de 85,05° tampoco tiene nada, y lo que
devuelve ahí es negro. La página lo tapa con el color de fondo del mapa en vez
de mostrarlo, porque un casquete sin cartografía se lee como lo que es y el
negro se leía como un fallo de carga. O sea: el mapa llega a los polos y la
trama y las trayectorias se dibujan ahí, pero el fondo de calles no.

**Natural Earth, admin-0 países a 1:10 m** — `web/data/world.geojson`, el mapa
de respaldo. **Dominio público**, sin atribución exigida; se cita igualmente por
cortesía y porque la procedencia importa. <https://www.naturalearthdata.com>

No se redistribuye tal cual: el original son 13 MB y `tools/make_worldmap.py` lo
simplifica por Douglas-Peucker a 34 000 vértices y 0,66 MB, tira los anillos por
debajo de un área mínima y se queda solo con el nombre de cada país. El fichero
versionado es ese producto, y el script lo regenera con la tolerancia que se le
pase. Antes se usaba la escala 1:110 m, que a nivel de país dibujaba las costas
como rectas y no tenía casi ninguna isla.

Ninguno de los tres se relicencia: conservan sus propios términos aunque el
resto del repositorio esté bajo AGPL-3.0 y CC BY-SA 4.0. La ODbL en particular
es vírica sobre bases de datos derivadas; aquí no se deriva nada, solo se
muestra.

**Cividis**, la rampa del modo accesible, se cita como referencia y no se
redistribuye: Nuñez, Anderton y Renslow (2018), *Optimizing colormaps with
consideration for color vision deficiency to enable accurate interpretation of
scientific data*, PLoS ONE 13(7) e0199239, CC BY 4.0. Lo que hay en el código
son **cinco paradas propias** sobre el mismo eje azul-amarillo y con la misma
luminancia monótona, no su tabla de valores.

## Literatura citada

`data/literature.json` contiene transcripciones literales cortas de artículos
con derechos de autor, entre ellos las directrices **ICNIRP 2013** (*Health
Physics* 105(1) 74-96) y Hestroffer y Magnan (1998). Son ecuaciones, constantes
y tablas numéricas citadas para verificación, con la fuente al lado en cada
entrada. Los valores numéricos son hechos y no llevan derechos; el texto que los
rodea sí, y por eso las citas son del tamaño mínimo que permite comprobar el
cálculo.

**ISO 12312-2:2015 no se ha consultado.** Es de pago y no se adquirió. Ninguna
cifra del trabajo procede de ella. Aparece únicamente como nombre de la
certificación que deben llevar los filtros solares.

---

## Si reutilizas esto

1. Cita el trabajo bajo los términos de `LICENSE`.
2. Atribuye por separado cada fuente de esta lista, con sus propios términos.
3. Vuelve a descargar los datos de terceros de su origen. No los redistribuyas
   desde aquí.
