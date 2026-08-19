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

Dos agentes independientes recibieron el encargo de refutar el trabajo. Lo que
encontraron, incluidos tres errores numéricos reales, está en
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

## Estructura

```
src/        14 módulos, cada uno con autocomprobaciones que fallan ruidosamente
data/       tres archivos fuente con procedencia, el resto son productos
docs/       arquitectura, resultados, revisiones adversariales, fuentes, fotos
paper/      manuscrito LaTeX, tablas y macros generadas
figs/       11 figuras, paleta validada para daltonismo
tools/      comprobación de privacidad previa al push, estabilizador de vídeo
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

Lo que bloquea ese salto está desglosado en [`ROADMAP.md`](ROADMAP.md):
`pathgeom.py` tarda entre treinta y sesenta minutos, `terrain.py` lee el DEM por
HTTP en cada consulta, y el emplazamiento vive escrito en `siteconf.py`.

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
