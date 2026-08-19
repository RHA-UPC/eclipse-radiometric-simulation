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
web/css/style.css         los tres temas, como variables
web/data/eclipses.json    el catálogo, 60 kB
web/data/spectral.json    tablas fijas de SPECTRL2, ICNIRP y CIE, 7,6 kB
web/vendor/LICENSE-*.txt  los avisos BSD de Leaflet y de pvlib, íntegros
web/data/world.geojson    costas de respaldo, Natural Earth 1:10 m simplificado
web/vendor/               Leaflet 1.9.4, BSD-2-Clause
```

La radiometría no se carga hasta que alguien pulsa el botón: son 8 kB de tablas
y unos 200 ms de cálculo que la mayoría de las visitas no necesitan, y sin una
atmósfera declarada el número no significaría nada. `src/webdata.py` es quien
exporta esas tablas, cada una con su cita.

El mapa es equirectangular (`L.CRS.EPSG4326`), no Mercator, y esa decisión
sostiene tres cosas a la vez. Los mapas de eclipses se dibujan así por
tradición. La trama de obscuración se vuelca como una imagen plana, mientras que
en Mercator habría que remuestrearla fila a fila o se desplazaría decenas de
grados en latitudes altas. Y sobre todo, **llega a los polos**: Web Mercator se
corta en 85,05° y la trayectoria de 2026 empieza a 87° N.

Eso condiciona el fondo de calles. Las teselas habituales de OpenStreetMap solo
existen en Mercator, así que el fondo pide los mismos datos a un WMS en
EPSG:4326. Cuesta latencia frente a una pirámide de teselas y depende de un
proveedor más pequeño, y a cambio no obliga a cambiar de proyección: una sola
CRS para todo y sin reproyectar la trama de obscuración.

Ese fondo es el predeterminado y no hay conmutador. Si el servidor no responde
—cuatro errores sin que cargue ninguna imagen, o nueve segundos en blanco— la
página lo declara en pantalla y descarga `world.geojson`, que hasta ese momento
no se ha pedido. Los cálculos no dependen del fondo, así que un respaldo feo
sigue respondiendo lo mismo.

`tools/make_worldmap.py` genera ese respaldo desde Natural Earth 1:10 m: 13 MB
de origen simplificados por Douglas-Peucker a 34 000 vértices y 0,66 MB. El
límite no es el ancho de banda sino el renderizado, porque Leaflet lo dibuja
como SVG.

Ese fondo tiene un techo que su proyección no confiesa: los datos los sirve en
EPSG:4326, pero los renderiza desde Mercator, así que por encima de 85,05° no
tiene nada que dibujar y devuelve negro. Dos rectángulos del color de fondo del
mapa, en un panel propio entre las teselas y la trama, tapan esa franja en los
dos polos. Un casquete sin cartografía se lee como lo que es; el negro se leía
como un fallo de carga. La trayectoria y la trama se siguen dibujando encima:
el mapa llega a los polos, que es para lo que se eligió esta proyección.

El zoom está sujeto por los dos lados. El mínimo es el nivel en el que el mundo
todavía tapa la ventana, recalculado al cambiar de tamaño, y el desplazamiento
está acotado al mundo, así que no hay forma de sacar franjas vacías a los lados
ni por arriba.

### La trama de obscuración

Dos resoluciones, y no son lo mismo. La **malla** es donde ocurre la aritmética:
640 × 320 celdas y 121 instantes, unos 350 ms, cacheada por eclipse. El
**lienzo** es tres veces más fino y llega ahí por interpolación bilineal. No es
un atajo cosmético: la obscuración máxima es un campo liso —no lleva costas ni
relieve dentro—, así que por debajo del paso de la malla no queda nada que
muestrear. Lo que compraba una malla fina era un contorno más suave, y la
interpolación compra lo mismo por una centésima parte del coste. Interpolar
antes de cuantizar es lo que convierte los escalones del 10 % en contornos y no
en escaleras.

Lo que hace asequible esa malla es una poda exacta. Las dos condiciones que
descartan una celda en un instante —el Sol bajo el horizonte y la penumbra
fuera de alcance en η— son monótonas en `cos H`, porque tanto ζ como η dependen
de la hora angular solo a través de su coseno. Su intersección es un intervalo,
que en H son dos arcos, que en la malla son dos tramos de columnas: el resto de
la fila se salta sin evaluar nada. Como `L1` se sustituye por su cota `l1`, el
intervalo es un superconjunto y el resultado no cambia; `besselian.test.js`
exige que sea **idéntico** al barrido sin podar, no parecido.

### Los tres temas

Claro, oscuro y accesible. Viven enteros en `web/css/style.css` como variables,
y `app.js` las lee con `cssv()`: las líneas del mapa, el marcador, la gráfica de
irradiancia y los casquetes polares salen de la misma paleta que el texto, así
que un tema es una paleta y no una segunda copia de la página. Sin elección
guardada se sigue a `prefers-color-scheme`, y el tema se aplica en un script
del `<head>` antes de pintar, para que quien pidió oscuro no reciba un destello
blanco.

Cada tema lleva su rampa de obscuración, que sí está en JavaScript porque la
trama se construye píxel a píxel y necesita los números:

| tema | rampa | por qué |
|---|---|---|
| claro | grises, de transparente a casi negro | el fondo es claro y la sombra oscurece, que es lo literal |
| oscuro | azul, violeta, rojo, naranja | la de siempre, que es la que se leía bien sobre negro |
| accesible | cinco paradas sobre el eje azul-amarillo de cividis | ningún par rojo/verde y luminancia monótona |

El modo accesible además sube el cuerpo de letra, engrosa los trazos, lleva el
contraste al máximo y **contornea cada escalón del 10 %** de la trama, de modo
que la información no depende en absoluto del canal del color. Las cinco paradas
no son la tabla publicada de cividis: son cinco puntos sobre su mismo eje y con
su misma luminancia monótona, que es de donde sale la propiedad que interesa.

El fondo de calles lo sirve un tercero en un solo estilo, claro. En modo oscuro
se **atenúa** la tesela, no se invierte: el truco habitual de invertir está
pensado para estilos de mar claro, y este trae el mar azul oscuro, así que
invertirlo dejaba el océano en cian luminoso brillando más que el continente.

## Convenciones

Los archivos de `data/` son productos. Tres son fuentes:
`literature.json`, `atmosphere.json` y `hardware.json`, que llevan las entradas
externas con su procedencia. Borrar el resto de `data/` y volver a correr la
cadena reproduce el PDF.
