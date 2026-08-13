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

## Estructura

```
src/        14 módulos, cada uno con autocomprobaciones que fallan ruidosamente
data/       tres archivos fuente con procedencia, el resto son productos
docs/       arquitectura, resultados, revisiones adversariales, fuentes, fotos
paper/      manuscrito LaTeX, tablas y macros generadas
figs/       11 figuras, paleta validada para daltonismo
tools/      comprobación de privacidad previa al push
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

## Licencia

CC BY-NC 4.0 para todo lo creado aquí. Los datos de terceros conservan sus
propios términos: **lee [`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) antes de
reutilizar nada.**

Aviso: las licencias Creative Commons no están diseñadas para software, y la
propia Creative Commons desaconseja usarlas con código. La cláusula no comercial
tampoco cumple la definición de código abierto de la OSI.
