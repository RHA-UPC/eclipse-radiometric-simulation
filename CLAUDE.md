# eclipse2026

Estudio radiométrico del eclipse total del 12 de agosto de 2026 observado desde
41.212878 N, 0.709488 E (observatorio republicano de la Batalla del Ebro, cerca
de La Figuera, Priorat, Tarragona; 616 m sobre EGM2008).

Responde a tres preguntas: si el Sol a 4,75° de altura dañaba el sensor de una
Canon EOS 200D con un Tamron 16-300, cuánto tiempo se podía mirar sin filtro, y
qué probabilidad había de captar una Perseida durante la totalidad.

El eclipse ya ocurrió. El observador fotografió el evento y sus 23 archivos
están en `fotografias/`, analizados en `docs/PHOTOS.md`. Ahí viven también dos
vídeos y sus estabilizados, que produce `tools/stab_solar.py`:

| Archivo | Duración | Contenido |
|---|---|---|
| `MVI_2418.MP4` | 223 s | parcial profunda hasta totalidad, cielo negro |
| `MVI_2427.MP4` | 55 s | reaparición tras la totalidad, cielo con bruma; a los 48 s hay un zoom hacia atrás al paisaje, así que son dos planos |

**Esa carpeta no se publica**: ver las reglas de publicación más abajo.

El repositorio es público en GitHub bajo AGPL-3.0-only para el código y
CC BY-SA 4.0 para el manuscrito, las figuras, los datos derivados y la
documentación. El reparto exacto está en `LICENSES.md`.

## Reglas de publicación

Son vinculantes y no se negocian en cada sesión.

### 1. El paper no menciona la IA

El autor del trabajo es Ricardo Heredia Alessandrello, y firma solo él. Su
profesorado le indicó no citar el uso de IA, así que **el manuscrito no lleva
declaración de uso de IA, ni agradecimiento a un modelo, ni coautoría, ni
mención alguna en ninguna sección, nota al pie o metadato del PDF.** Si
reescribes el paper, no vuelvas a introducirla.

Lo mismo vale para el repositorio: nada de `Co-Authored-By: Claude`, nada de
`Claude-Session`, nada de firmas en commits ni en mensajes de PR. **Todo push
aparece hecho por la cuenta del autor.**

### 2. Nada que identifique al autor ni a sus dispositivos

Comprobación obligatoria antes de cada push:

```bash
bash tools/privacy_check.sh
```

Falla si en el índice de git aparece el número de serie del cuerpo de la cámara,
una ruta absoluta del directorio personal, un archivo de imagen o de vídeo, un
kernel de terceros o una dirección de correo. El serial se retiró de
`data/hardware.json` y en su lugar queda `_serial_note`; no lo repongas.

El vídeo compromete por partida doble: metadatos de cámara como las fotos, y
además pista de audio, donde puede haber voces. `tools/stab_solar.py` recodifica
desde fotogramas en crudo, así que su salida no arrastra ni una cosa ni la otra;
aun así vive en `fotografias/` y tampoco se publica.

Las coordenadas exactas sí se publican: es una decisión consciente del autor,
porque el emplazamiento es un observatorio de la Guerra Civil documentado y la
reproducibilidad del perfil de horizonte depende de ellas.

### 3. Licencias

`LICENSE` es AGPL-3.0-only y cubre `src/` y `tools/`. `LICENSE-DOCS` es
CC BY-SA 4.0 y cubre paper, figuras, datos derivados y documentación. El reparto
está en `LICENSES.md`. Cada módulo de `src/` lleva cabecera SPDX: si creas uno
nuevo, cópiala.

`THIRD-PARTY-DATA.md` lista los datos de terceros, que conservan sus términos y
no se relicencian. Si añades una fuente externa, añádela también ahí.

El repositorio nació bajo CC BY-NC 4.0 y cambió el 14 de agosto de 2026, cuando
el titular seguía siendo la única persona con derechos. **No vuelvas a esa
licencia:** dejaba el proyecto fuera de la definición de código abierto e
impedía que GitHub mostrara la licencia.

### 4. Contribuciones externas

Toda aportación exige el CLA de `CLA.md` firmado por línea de commit. Es lo que
mantiene viva la opción de licencia comercial. El borrador está **pendiente de
revisión por un abogado**; no lo des por bueno.

Los textos legales existen en español y en inglés (`*.en.md`). Si tocas uno,
toca los dos. La versión española es la auténtica.

## Regla que gobierna todo el proyecto

**Ninguna cifra sin procedencia.** Cada número del manuscrito sale de un cálculo
reproducible en `src/` o de una fuente citada con quote literal en
`data/literature.json`. Si algo no se pudo verificar, el paper lo declara en vez
de rellenarlo. Esta regla ya salvó al trabajo tres veces: dos revisiones
adversariales encontraron siete cifras escritas a mano, cinco de ellas erróneas.

Corolarios operativos:

- Antes de escribir un número en el paper, comprueba que existe como macro en
  `paper/keyvals.tex`, generado por `src/paperdata.py`.
- Si necesitas un valor externo, primero búscalo y transcríbelo a
  `data/literature.json` con su cita y su quote. Después úsalo.
- `src/paperdata.py::assert_no_provisional()` aborta la compilación si algún
  bloque de `data/hardware.json` no está en estado `verified` o
  `verified-secondary`.

## Entorno

```bash
~/.venvs/eclipse2026/bin/python     # numpy scipy matplotlib skyfield pandas
                                            # pvlib rasterio colour-science rawpy exifread pypdf
                                            # opencv-python-headless imageio-ffmpeg (solo stab_solar)
~/.local/bin/tectonic               # LaTeX
```

El venv se creó con `uv`, no con `python -m venv` (el sistema no trae
`ensurepip`).

## Cómo reconstruir el PDF

```bash
cd src
python geometry.py      # contactos C1-C4 -> data/circumstances.json
python spectral.py      # SPECTRL2 + transmisión cromática -> data/spectral_timeseries.csv
python eye.py           # límites ICNIRP -> data/eye_timeseries.csv
python perseids.py      # tasas y Poisson -> data/perseids.csv
python figures.py       # 11 figuras -> figs/
python paperdata.py     # 12 tablas + ~90 keyvals -> paper/
cd ../paper && tectonic -X compile paper.tex --outdir ../out
```

`pathgeom.py` tarda entre treinta y sesenta minutos. Lánzalo en segundo plano y
solo cuando cambie la geometría.

`validate.py` corre las comprobaciones cruzadas. V1 y V2 tienen criterio de
aprobado; si alguna falla, el paper no puede citar los números que dependen de
ella.

## Autotests

Los siete módulos con física dentro traen `_selftest()` que falla de forma
ruidosa:

```bash
cd src && for m in limbdark radiometry optics thermal eye spectral perseids; do
  python $m.py >/dev/null 2>&1 && echo "$m OK" || echo "$m FALLA"; done
```

Los siete deben pasar antes de compilar. Comprueban identidades, no valores:
conservación de energía en la óptica, el límite termodinámico de concentración,
los límites asintóticos de Carslaw y Jaeger, la continuidad de las dos ramas del
límite ICNIRP y el área exacta de lente círculo-círculo.

`tools/stab_solar.py --selftest` va aparte, porque no entra en la cadena del
paper. Cubre las cuatro cosas que pueden romperse en silencio:

1. Ocluye un disco sintético y exige que el ajuste al limbo conserve el centro
   con menos de 1 px de error mientras el centroide de brillo se va 40 px, que
   es justamente la razón de que el módulo exista.
2. Un anillo de corona alrededor de una Luna oscura tiene que leerse como
   totalidad, y un creciente jamás.
3. Con cielo iluminado, la Luna tiene que ganarle a un borde de halo de
   polaridad contraria y fuerza parecida. Es el caso que un Hough sin signo
   resuelve al revés.
4. Las dos invariantes del recorte `--fit`: que el Sol quede en el centro
   geométrico, y que ningún píxel de salida caiga fuera del original en ningún
   fotograma.

## Documentación

| Archivo | Contenido |
|---|---|
| `README.md` | portada del repositorio: resultados en una tabla y cómo reproducir |
| `THIRD-PARTY-DATA.md` | datos de terceros, sus términos y la atribución obligatoria |
| `docs/ARCHITECTURE.md` | qué hace cada módulo y cómo fluyen los datos |
| `docs/FINDINGS.md` | los resultados científicos, con sus números |
| `docs/REVIEWS.md` | qué encontraron las revisiones adversariales y qué cambió |
| `docs/SOURCES.md` | procedencia de cada entrada del modelo |
| `docs/PHOTOS.md` | análisis de las 23 fotografías del observador |
| `PROGRESS.md` | bitácora cronológica de la sesión original |
| `LICENSES.md` | qué licencia cubre cada parte, y por qué esas y no otras |
| `CONTRIBUTING.md` | cómo se aporta, y qué se rechaza sin discusión |
| `CLA.md` | cesión de derechos del contribuyente. Borrador sin revisar |
| `SAFETY.md` | qué es y qué no es una cifra de exposición ocular de aquí |
| `ROADMAP.md` | lo que falta para que esto sea una plataforma, y lo que no se hará |

`LICENSES`, `CONTRIBUTING`, `CLA` y `SAFETY` existen también en inglés
(`*.en.md`). La versión española manda; si tocas una, toca las dos. `ROADMAP.md`
no está traducido, y no hace falta que lo esté: no es un texto legal.

## Si retomas el trabajo

Lee `docs/FINDINGS.md` primero. Está escrito para que sepas qué se afirma y con
qué respaldo, sin tener que leer el paper entero.

Lo que sigue abierto:

1. Ninguna medida de umbral de daño existe para un CMOS de consumo moderno. La
   única cita del paper, Schwarz et al. 2017, midió un Aptina MT9V024 de 2010.
2. El modo de daño que describe Schwarz es pérdida de sensibilidad visible en
   campo plano, no píxeles calientes. Las fotografías del observador no permiten
   comprobarlo porque no hay campo plano.
3. La afirmación de que la cortinilla y la pantalla de enfoque son lo que se
   quema descansa solo en el cálculo de placa delgada de este trabajo. No existe
   literatura revisada por pares.

## Trampas conocidas

- Las macros de LaTeX no admiten dígitos. `paperdata.py` convierte `dniC1` en
  `dniCOne` al escribir `keyvals.tex`. Usa la forma alfabética en el manuscrito.
- No metas `\input` dentro de un `tabular`: el escáner de `array` no sobrevive.
  `write_table()` emite el entorno `table` completo desde Python.
- `kv()` localiza el separador decimal a coma. Si añades una macro sin pasar por
  `kv()`, saldrá con punto en un documento configurado con coma.
- `figures.py` define `F` como el directorio de figuras. No lo sombrees con una
  variable local.
- La escala logarítmica de matplotlib dibuja etiquetas en los ticks menores
  aunque fijes los mayores. Usa `logticks()`.
- Las rutas ya no son absolutas. `siteconf.ROOT` se resuelve desde el propio
  archivo y los demás módulos hacen `from siteconf import ROOT`. No vuelvas a
  escribir una ruta absoluta del directorio personal: `tools/privacy_check.sh` la caza.
- En `stab_solar.py`, el centroide de brillo **nunca** sirve para centrar un
  eclipse: el de un creciente se mete en la parte iluminada y avanza hacia el
  limbo descubierto conforme la Luna tapa, así que arrastra el Sol casi un radio
  a lo largo de la fase parcial. Lo invariante es el limbo.
- Con cielo iluminado hay que seguir la Luna, y el Hough circular tiene que
  llevar signo. Sin signo puntúa igual el limbo lunar y el borde del halo solar,
  que tienen polaridad opuesta, y se queda con el más brillante, que es el
  equivocado. `cv2.HoughCircles` tampoco engancha nada en este material.
- Al enmascarar una búsqueda local, centinela finito y no `-inf`: el refinado
  parabólico da `NaN` si un vecino es infinito, y `NaN` pasa cualquier guarda
  escrita como `if den else ...`, porque `NaN` es verdadero.
- El recorte de `--fit` centra el astro y no negocia. Lo tentador es agrandar la
  ventana dejándolo descentrado, y sale mucho más encuadre, pero incumple lo que
  se pide y se nota a simple vista. La ventana va simétrica respecto al Sol.
