# Riesgo radiométrico de un eclipse total con el Sol a 4,75° de altura

Estudio del eclipse total de Sol del 12 de agosto de 2026 observado desde un
observatorio republicano de la Batalla del Ebro, cerca de La Figuera (Priorat,
Tarragona), en 41,212878 N · 0,709488 E, 616,1 m.

La totalidad ocurrió con el Sol a menos de cinco grados sobre el horizonte y
media hora antes del ocaso. Esa geometría es rara en la península y cambia el
balance de riesgos en dos direcciones opuestas: hunde el riesgo térmico para el
sensor de una cámara y deja intacto el riesgo fotoquímico para la retina, que
además pierde el reflejo de aversión porque el Sol bajo ya no deslumbra.

El manuscrito está en **[`out/paper.pdf`](out/paper.pdf)** (22 páginas, español).

## Qué contiene

| Pregunta | Respuesta corta |
|---|---|
| ¿Estaba el punto dentro de la franja? | Sí, a 41,9 km del límite norte medidos perpendicularmente. 70,27 s de totalidad. |
| ¿Lo tapaba el terreno? | No. El horizonte hacia poniente está deprimido 0,42° y el Sol lo salvaba por 5,17°. |
| ¿Cuánto oscurece el atardecer frente al eclipse? | La irradiancia directa cae de 490 a 186 W/m² por el mero descenso del Sol. La atmósfera se lleva el 62 % antes de que la Luna aporte nada. |
| ¿Se daña el sensor de la réflex? | No. Peor caso honesto 6,84 K de calentamiento local, y 18× de margen contra el único umbral en onda continua publicado con su tamaño de mancha. |
| ¿Y el ojo? | Ahí se invierte. El límite térmico retiniano de ICNIRP se supera un 30 % en el primer contacto. |
| ¿Probabilidad de cazar una Perseida durante la totalidad? | 0,67 % en la configuración más favorable del barrido: 16 mm, magnitud límite 4. |

## Cómo está hecho

Efemérides JPL DE440s vía Skyfield, modelo digital del terreno Copernicus
GLO-30 para el horizonte real, estado atmosférico operativo del día del evento,
SPECTRL2 por longitud de onda y límites de exposición ICNIRP 2013.

La regla que gobierna el repositorio: **ninguna cifra sin procedencia**. Cada
entrada externa vive en `data/literature.json`, `data/atmosphere.json` o
`data/hardware.json` con su cita. El manuscrito no contiene ni un número escrito
a mano: `src/paperdata.py` los emite todos, y aborta la compilación si algún
bloque de hardware sigue marcado como provisional.

Tres agentes independientes recibieron el encargo de refutar el trabajo. Lo que
encontraron, incluidos varios errores numéricos reales, está en
[`docs/REVIEWS.md`](docs/REVIEWS.md) sin recortar.

## Reproducir

```bash
uv venv --python 3.12 .venv && . .venv/bin/activate
uv pip install numpy scipy matplotlib pandas skyfield pvlib rasterio

cd src
python geometry.py      # contactos C1-C4      -> data/circumstances.json
python terrain.py       # horizonte GLO-30     -> data/horizon.json
python pathgeom.py      # posición en la franja-> data/pathgeom.json
python spectral.py      # SPECTRL2             -> data/spectral_timeseries.csv
python eye.py           # límites ICNIRP       -> data/eye_timeseries.csv
python perseids.py      # tasas y Poisson      -> data/perseids.csv
python validate.py      # comprobaciones cruzadas
python figures.py       # 11 figuras           -> figs/
python paperdata.py     # 12 tablas + keyvals  -> paper/

cd ../paper && tectonic paper.tex && mv paper.pdf ../out/
```

Skyfield descarga `de440s.bsp` y `finals2000A.all` en la primera ejecución.
Borrar `data/` salvo los tres archivos fuente y volver a correr la cadena
reproduce el PDF.

## Estabilizar un vídeo del eclipse

`tools/stab_solar.py` deja el Sol quieto y centrado en el plano, para ver a la
Luna moverse sobre un disco que no se mueve.

```bash
uv pip install opencv-python-headless imageio-ffmpeg
python tools/stab_solar.py entrada.MP4 salida.mp4 [--fit] [--end 1209] [--crop 1080]
python tools/stab_solar.py --selftest
```

Ajusta una circunferencia al limbo solar, no al centroide de brillo. El
centroide de un creciente no es el centro del Sol: se mete dentro de la parte
iluminada y avanza hacia el limbo descubierto conforme la Luna tapa, así que
seguirlo desplazaría el Sol casi un radio a lo largo de la fase parcial, al
compás del eclipse que se pretende inmovilizar. El limbo, en cambio, es un arco
de radio constante alrededor del centro solar sea cual sea la ocultación.

En totalidad no hay fotosfera que ajustar: si la cámara ya ha abierto lo bastante
para exponer la corona, la Luna aparece como un disco oscuro cerrado dentro de
ella y sirve su centroide. Mientras la totalidad siga expuesta para la fotosfera
el fotograma no tiene señal alguna, y esos fotogramas van interpolados.

Con cielo iluminado, en cambio, no vale ningún umbral: la fotosfera florece muy
por fuera de su propio limbo y lo que se mide es el halo. Ahí la referencia es
la Luna, que no florece, y se localiza por Hough circular **con signo**. La
polaridad es lo que la distingue: hacia fuera, el limbo lunar pasa de oscuro a
claro y el borde del halo al revés, así que puntuar el gradiente radial con su
signo se queda con uno y descarta el otro. Un Hough sin signo puntúa ambos igual
y se va con el más brillante.

`--fit` recorta a la mayor ventana 16:9 que ningún fotograma se sale, porque
sobre cielo claro las franjas vacías del desplazamiento sí se ven.

Lo que limita ese recorte no es cuánto se movió el trípode, sino el centrado. La
ventana tiene que quedar simétrica respecto al Sol en todos los fotogramas, así
que su semianchura no puede pasar de lo que el Sol se acerque al borde más
próximo. Un astro encuadrado bajo cuesta altura por mucho cielo desaprovechado
que quede encima: en la toma de la reaparición, con el Sol a 200 px del borde
inferior, 1920×1080 se queda en 708×398.

`--end` corta donde el plano deja de ser el mismo, por ejemplo si se reencuadra
a mitad de toma.

## La web: cualquier eclipse, cualquier punto

`web/` es un sitio estático que lleva la geometría fuera de este emplazamiento y
de esta fecha. Ábrelo con cualquier servidor de archivos:

```bash
cd web && python -m http.server 8000     # y abre http://localhost:8000
```

Funciona de dos maneras. **Por eclipse:** eliges uno de los 56 que hay entre
2026 y 2050 —16 totales, 18 anulares, 3 híbridos y 19 parciales—, el mapa dibuja
la línea central, los dos bordes de la umbra, el contorno de la penumbra y la
obscuración máxima en bandas, y al marcar un punto salen sus circunstancias: qué
fracción del disco se cubre, cuánto dura la fase central, los cuatro contactos en
UTC y la altura y el acimut del Sol en cada uno.
**Por lugar:** marcas el punto y sale la lista de los eclipses que se verán desde
ahí, ordenados en el tiempo.

No hay servidor propio: el catálogo, las tablas y Leaflet van autoalojados y
**todo el cálculo ocurre en tu navegador**, así que las coordenadas que marques
no se envían a ninguna parte.

El fondo sí viene de fuera. Es OpenStreetMap con detalle hasta nivel de calle,
y conviene saber lo que eso implica: las peticiones de imágenes llevan en la URL
el recuadro que estás mirando, de modo que ese servidor ve qué zona te interesa.

Viene de un WMS en EPSG:4326 y no de las teselas habituales de OpenStreetMap,
por geometría y no por gusto: la pirámide estándar es Web Mercator, que se corta
en 85,05° porque manda el polo al infinito, y las trayectorias de eclipse llegan
más al norte — la de 2026 empieza a 87° N. Ese servidor arrastra el mismo techo
por dentro: por encima de 85° no tiene nada que dibujar, así que los casquetes
polares quedan sin fondo de calles. El mapa sí llega hasta 90°, y la trayectoria
y las bandas se dibujan ahí igual.

Las bandas de obscuración son **polígonos vectoriales**, no una imagen, así que
se ven igual de limpias al zoom 2 que al 15. La malla de cálculo solo decide por
dónde pasa cada contorno; la posición de cada vértice se busca bisecando la
función real, y las cuerdas se subdividen hasta quedarse a menos de medio
kilómetro de la curva. Cuesta medio segundo por eclipse, una vez, y a partir de
ahí mover el mapa no cuesta nada.

Hay **tres temas**: claro, que es el de la casa; oscuro; y uno pensado para
daltonismo y baja visión, con el contraste al máximo, más cuerpo de letra,
trazos más gruesos, una rampa sin ningún par rojo/verde y el contorno de cada
escalón del 10 % trazado, para que la información no dependa del canal del
color. Sin elegir nada se sigue la preferencia del sistema operativo.

Si ese servidor no responde, la página lo detecta en un segundo y dibuja las
costas de Natural Earth 1:10 m, que van con ella. El fichero solo se descarga
en ese caso. Los cálculos no dependen del fondo: son los mismos con mapa y sin
él.

### De dónde salen esos números

`src/eclipsecat.py` recorre las lunas nuevas sobre DE440s, se queda con las que
producen eclipse y **ajusta sus propios elementos besselianos** en vez de copiar
una tabla publicada. Son unos cuarenta números por eclipse que reproducen la
sombra a menos de un kilómetro durante las horas que dura, y son la única forma
de que un navegador conteste sin cargar una efeméride de 32 MB ni un buscador de
raíces.

Quedan dos diferencias declaradas frente a la NASA, y ninguna es un error: este
proyecto adopta el radio solar nominal IAU 2015 (695 700 km) donde los elementos
de Espenak implican 696 000, y usa el ΔT de Skyfield (69,10 s) donde la NASA
adoptó 71,4 s. La primera mueve los límites unos 700 m. La segunda no mueve nada
sobre el terreno, porque cada lado es coherente consigo mismo.

Las comprobaciones son la parte que importa:

```bash
python src/eclipsecat.py --selftest      # elementos, línea central, catálogo
python src/webdata.py --selftest         # tablas exportadas y su procedencia
node web/js/besselian.test.js            # geometría: el port contra los tres
node web/js/radiometry.test.js           # radiometría: el port contra el paper
```

Entre las dos exigen que las circunstancias locales reproduzcan la cadena DE440s
de `geometry.py` con menos de 1,5 s en cada contacto, que la línea central caiga
a menos de 3 km de la que publica la NASA, y que las duraciones de anularidad
reproduzcan las publicadas para 2027, 2028 y 2031.

La invariante que más importa ata el dibujo al cálculo: **sobre el borde de la
franja la duración de la fase central es cero, tres kilómetros dentro no lo es,
y tres kilómetros fuera vuelve a serlo.** Sin ella el mapa puede dibujar una
franja perfectamente creíble en el sitio equivocado, que es el peor fallo que
esta página puede cometer.

Una tercera revisión adversarial atacó todo esto el 19 de agosto de 2026 y
devolvió 17 hallazgos; lo que encontró, y el que se le escapó y salió tirando de
uno de sus hilos, está sin recortar en [`docs/REVIEWS.md`](docs/REVIEWS.md).

### Irradiancia y exposición ocular, a petición

Debajo de la ficha de cada punto hay un botón que resuelve la parte
radiométrica **en el ordenador de quien visita la página**: SPECTRL2 sobre 122
longitudes de onda, la transmisión cromática del eclipse con oscurecimiento del
limbo, y los dos límites de ICNIRP 2013. Unas dos décimas de segundo por punto.

No viene precalculado a propósito, y no por ahorrar disco. La irradiancia
depende del estado atmosférico del punto y del día, que este proyecto solo tiene
medido sobre el Ebro; precalcular el planeta obligaría a inventar una atmósfera
y a presentarla como si fuera un dato. Lo que hace la página es al revés:
**pide la hipótesis y la enseña junto al resultado.** Por defecto usa las
condiciones de referencia de la ASTM G173-03, ofrece la atmósfera medida del
Ebro como segundo preajuste, y deja escribir la propia.

Sale de ahí la irradiancia del haz directo antes y durante el eclipse, la
iluminancia, la razón entre la radiancia de la fotosfera y el límite térmico
retiniano, el tiempo de fijación que admite el límite fotoquímico con pupila de
3 y de 7 mm, y la transmitancia que tendría que tener un filtro. Con sus
hipótesis pegadas, la masa de aire a la vista, y un aviso explícito cuando esa
masa de aire deja el modelo extrapolando.

`node web/js/radiometry.test.js` exige que ese port reproduzca
`data/spectral_timeseries.csv` y `data/eye_timeseries.csv`, o sea la cadena que
produjo el manuscrito. Con la atmósfera medida del Ebro devuelve 187 W/m² al
máximo, masa de aire 10,7 y el límite térmico superado 1,34 veces: los números
del paper.

### Lo que la web sigue sin calcular

El relieve. El horizonte es el astronómico y la altura del terreno es cero, así
que un Sol bajo puede quedar tras una montaña que el cálculo no ve.

La corona. Durante la totalidad el haz directo es exactamente cero, y eso es lo
que la página dice; la luz que queda entonces es coronal, del orden de un millón
de veces más débil, y pide otra física.

## Estructura

```
src/        14 módulos, cada uno con autocomprobaciones que fallan ruidosamente
data/       tres archivos fuente con procedencia, el resto son productos
docs/       arquitectura, resultados, revisiones adversariales, fuentes, fotos
paper/      manuscrito LaTeX, tablas y macros generadas
figs/       11 figuras, paleta validada para daltonismo
tools/      comprobación de privacidad previa al push, estabilizador de vídeo
web/        sitio estático: mapa de eclipses 2026-2050, cálculo en el navegador
```

Empieza por [`CLAUDE.md`](CLAUDE.md) si vas a tocar el código, y por
[`docs/FINDINGS.md`](docs/FINDINGS.md) si solo quieres los resultados.

## Lo que no está aquí

Las 23 fotografías de la observación. Llevan el número de serie del cuerpo en el
MakerNote de Canon, que identifica un dispositivo físico. El análisis que se hizo
con ellas sobrevive entero en [`docs/PHOTOS.md`](docs/PHOTOS.md) y en los JSON
derivados, que solo guardan modelo, óptica, tiempo de exposición, diafragma e
ISO.

## Límites declarados

Tres cosas quedan abiertas y el manuscrito lo dice:

- No existe umbral de daño publicado para un sensor CMOS de consumo moderno. El
  contraste usa un Aptina MT9V024 de 2010 con píxeles de 6 µm.
- El modo de daño relevante es una pérdida permanente de sensibilidad, que solo
  se ve en campo plano. Las fotografías no lo permiten comprobar.
- La afirmación de que la cortinilla del obturador corre más peligro que el
  sensor no tiene respaldo revisado por pares. La búsqueda se hizo y falló.

## Hacia dónde va

Hoy calcula un eclipse en un punto. La intención es que calcule cualquier
eclipse en cualquier punto, y que acabe siendo una plataforma donde alguien
introduzca sus coordenadas y su equipo y obtenga su propio análisis.

La parte geométrica de ese salto ya está dada: `web/` calcula cualquiera de los
56 eclipses de 2026 a 2050 en cualquier punto, y lo hace sin servidor. Lo que
sigue bloqueado es la parte radiométrica, y está desglosado en
[`ROADMAP.md`](ROADMAP.md): `pathgeom.py` tarda entre treinta y sesenta minutos,
`terrain.py` lee el DEM por HTTP en cada consulta, y el emplazamiento vive
escrito en `siteconf.py`.

## Contribuir

Bienvenidas las correcciones, sobre todo si traen el caso que las destapa. Lee
[`CONTRIBUTING.md`](CONTRIBUTING.md) primero: hay una regla que se aplica sin
excepción, y es que ninguna cifra entra sin procedencia.

Toda contribución exige firmar [`CLA.md`](CLA.md), que cede al titular los
derechos necesarios para poder ofrecer el proyecto bajo otras licencias.

## Seguridad

[`SAFETY.md`](SAFETY.md) es de lectura obligada antes de usar cualquier número
de aquí para decidir qué hacer con tus ojos o con tu cámara. Los tiempos de
exposición que calcula este proyecto son el resultado de aplicar las ecuaciones
de ICNIRP bajo hipótesis declaradas, no una recomendación.

## Licencia

Código bajo **AGPL-3.0-only**, texto y figuras bajo **CC BY-SA 4.0**. El detalle
de qué cubre qué está en [`LICENSES.md`](LICENSES.md).

La AGPL se eligió porque el proyecto apunta a ser una plataforma web: su sección
13 obliga a publicar el código a quien ofrezca una versión modificada por red,
cosa que la GPL no hace.

Los datos de terceros conservan sus propios términos y no se relicencian: **lee
[`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) antes de reutilizar nada.**

## Legal texts in English

`CLA.en.md`, `CONTRIBUTING.en.md`, `LICENSES.en.md` and `SAFETY.en.md` are
English translations, provided so contributors anywhere can read what they are
agreeing to. The Spanish versions remain authoritative.
