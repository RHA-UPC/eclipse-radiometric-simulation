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

Desde el 19 de agosto de 2026 hay además una **web estática** en `web/`, que
lleva el trabajo a cualquier eclipse y a cualquier punto: catálogo de 56
eclipses entre 2026 y 2050, franja de totalidad sobre el mapa y circunstancias
locales al marcar un punto. Bajo demanda resuelve también la irradiancia
espectral y los límites de ICNIRP con la atmósfera que el usuario declare. Todo
el cálculo ocurre en el navegador: no hay servidor ni petición externa, y nada
va precalculado más allá de los elementos besselianos y las tablas fijas.

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

`src/eclipsecat.py --selftest` también va aparte. Tarda poco más de un segundo
y comprueba seis cosas: los elementos ajustados contra los publicados por la NASA,
que el polinomio se sostenga **entre** sus nodos de ajuste, las circunstancias
locales contra la cadena DE440s de `geometry.py`, la línea central contra la
tabla de trayectoria de la NASA, que un punto fuera de la penumbra devuelva
nada en vez de una magnitud pequeña, y que el catálogo tipifique bien los dos
eclipses de 2026.

`src/webdata.py --selftest` comprueba que las tablas exportadas al navegador
siguen siendo las tablas: 122 longitudes de onda crecientes, B(λ) con su pico
entre 435 y 445 nm y cero por encima de 700, R(λ) igual a 1 en 500 nm y a 0,02
en 1200, y V(λ) con su pico en 555. Un error de remuestreo aquí es mudo, porque
el espectro sigue pareciendo un espectro.

`node web/js/radiometry.test.js` contrasta el port radiométrico contra
`data/spectral_timeseries.csv` y `data/eye_timeseries.csv`, es decir contra la
cadena que produjo el manuscrito, y exige además dos invariantes de física que
no se ven en una gráfica: que el déficit de flujo **cruce** al de área (por
detrás mientras la Luna come limbo, por delante cuando alcanza el centro) y que
el signo cromático se invierta con la fase.

`node web/js/besselian.test.js` contrasta el port a JavaScript contra las tres
referencias anteriores y añade lo que la tercera revisión adversarial demostró
que faltaba: duraciones de anularidad contra las publicadas, orden de contactos
barrido sobre todo el catálogo y una malla global, tipificación de un eclipse
total no central, signo de γ, marcas de hueco en las curvas, hemisferio nocturno
en la trama, y sobre todo la invariante que ata el dibujo al cálculo — sobre el
borde de la franja la duración es cero, tres kilómetros dentro no lo es, tres
kilómetros fuera vuelve a serlo. Un port que se desvíe dibuja una franja creíble
en el sitio equivocado, que es el peor fallo posible aquí.

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
| `docs/ARCHITECTURE.md` §La web | qué hay dentro de `web/` y por qué es estático |

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
- Los elementos besselianos de `eclipsecat.py` **no** coinciden con los de la
  NASA al último dígito, y no deben. Son dos convenciones declaradas: radio
  solar IAU 2015 nominal (695 700 km) frente a los 696 000 km que implican los
  `tan f` de la NASA, y ΔT de Skyfield (69,10 s) frente a los 71,4 s de Espenak.
  La primera mueve los límites unos 700 m; la segunda no mueve nada sobre el
  terreno, porque cada lado es coherente consigo mismo. Para contrastar contra
  la NASA hay que usar **su** ΔT en los dos lados, o se mide la diferencia entre
  dos predicciones de la rotación terrestre en vez de la geometría.
- La longitud va **positiva al este** en todo el proyecto. Meeus la tabula
  positiva al oeste. Mezclarlas no rompe nada: espeja todas las trayectorias
  respecto a Greenwich y el mapa sigue pareciendo un mapa.
- Al enmascarar la búsqueda del eje sobre el elipsoide, centinela finito otra
  vez no: ahí el problema es distinto, el `q <= 0` significa que el eje no toca
  la Tierra y hay que devolver `null`, no un punto del limbo. Un `clamp` a cero
  fabrica trayectorias que rodean el planeta.
- La línea central se muestrea cada **seis segundos**, no cada minuto. Al final
  de una trayectoria con incidencia rasante la umbra corre a unos 3 km/s, así
  que un minuto deja huecos de 180 km y la línea dibujada deja de estar donde
  está la sombra.
- **Web Mercator no tiene polos.** Se corta en 85,05° porque la proyección manda
  el 90 al infinito, y las trayectorias de eclipse llegan más al norte: la de
  2026 empieza a 87° N. Por eso el mapa va en `L.CRS.EPSG4326` y el fondo de
  calles es un WMS en esa misma proyección, no la pirámide de teselas de
  OpenStreetMap. Cambiar la CRS del mapa para poner teselas obliga además a
  reconstruir el mapa entero, porque Leaflet la fija al construir. Se probó y se
  descartó. (Antes había un segundo motivo, que las bandas eran una imagen y en
  Mercator habría que remuestrearla fila a fila; ya no lo son, y ese motivo se
  ha caído. El de los polos, no.)
- El fondo de calles es el **predeterminado** y no hay conmutador: esto se
  despliega en la web, donde hay conexión, y ofrecer la elección obligaba al
  visitante a decidir algo que no puede juzgar. Lo que sí hay que mantener
  escrito es que ese fondo sale a la red y que las peticiones llevan el recuadro
  mirado en la URL. `THIRD-PARTY-DATA.md` lo dice sin rodeos porque durante un
  tiempo la web no contactaba con nadie y la documentación lo presumía.
- El mapa de respaldo se descarga **solo si el servidor de calles falla**, y por
  eso puede permitirse pesar 0,66 MB. Caer requiere pruebas, no una petición
  fallida: cuatro errores sin que haya cargado ninguna imagen, o nueve segundos
  sin ninguna. Ese segundo criterio es el que cubre el caso que se cuelga en vez
  de fallar, que un manejador de `tileerror` no ve nunca.
- **No uses el renderizador de lienzo de Leaflet para el mapa de respaldo.** Es
  la herramienta correcta sobre el papel y mata el proceso de renderizado en
  Chromium headless al hacer `setView`, incluso con el fichero antiguo de 10 600
  vértices. Se probó en los dos paneles y con dos tamaños de datos. Queda SVG,
  y con SVG el coste crece con los vértices: medido, un zoom cuesta lo mismo a
  22 000 que a 34 000 y claramente más a 54 000. Por eso
  `tools/make_worldmap.py` simplifica a 34 000 y no a los 190 000 que salen de
  Natural Earth 1:10 m con una tolerancia fina.
- En Leaflet, un `imageOverlay` y un renderizador SVG son hermanos dentro del
  mismo panel: `bringToBack()` sobre uno no lo mueve respecto al otro. El orden
  se fija creando paneles con su `zIndex`, no reordenando capas.
- **El WMS devuelve negro por encima del límite de Mercator.** Sirve los datos
  en EPSG:4326, pero su fuente sigue siendo Mercator, así que de 85,05° a 90°
  no tiene nada que dibujar y rellena de negro. Se tapa con dos rectángulos del
  color de fondo del mapa, en un panel propio entre las teselas y la trama. El
  corte va a **84°**, no a 85,0511: medido en pantalla, el negro baja hasta unos
  84,3° en el nivel de zoom más alejado, porque la rejilla de teselas del
  servidor no cae donde la nuestra. Lo que se pierde es océano Ártico e interior
  del casquete antártico.
- `map.getBoundsZoom(bounds, true)` **recorta su resultado por el `minZoom`
  vigente**. Si lo usas para calcular ese mismo `minZoom`, solo podrá subir: al
  encoger la ventana se queda atascado en el mínimo de la ventana grande. Hay
  que bajarlo a cero antes de preguntar.
- **No inviertas el fondo de calles para el modo oscuro.** El truco habitual
  (`invert(1) hue-rotate(180deg)`) está pensado para estilos de mar claro y
  tierra blanca; este estilo ya trae el mar azul oscuro, así que invertirlo deja
  el océano en cian luminoso, brillando más que el continente. Se probó y se ve
  en las capturas. Lo que funciona es atenuar la tesela, y el filtro va sobre la
  **imagen**, no sobre el panel: en ese panel viven también las costas de
  respaldo, que ya se dibujan con los colores del tema.
- Las bandas de obscuración son **polígonos, no una trama**, y volver a una
  trama es volver al problema: una imagen tiene una resolución y un mapa tiene
  tantas como niveles de zoom. Un lienzo de 1920 × 960 sobre el mundo es un
  píxel cada 21 km, o sea 34 píxeles de pantalla al zoom 7, y los contornos de
  2 píxeles del modo accesible salían como escalones de 68. Ningún tamaño de
  lienzo lo arregla, porque el mapa llega al zoom 15.
- **La malla y el afinado tienen que ser la misma función.** El barrido de 121
  instantes se queda corto respecto al máximo verdadero, y se queda corto en
  cantidades distintas en cada punto: medido, 4·10⁻⁴ en la mediana y 1,4·10⁻² en
  la cola. Con la malla sobre el barrido y el afinado sobre el valor exacto, son
  conjuntos de nivel de dos funciones distintas y el 13 % de los vértices sale
  sin cambio de signo que bisecar. Por eso `obscurationGrid` hace una segunda
  pasada de sección áurea sobre las celdas con `0 < o < 1`, y por eso
  `maxObscuration` corre exactamente ese mismo afinado. Si tocas uno, toca el
  otro.
- **Sobre el terminador no hay curva de nivel, hay un salto.** Lo que se dibuja
  es la obscuración máxima *con el Sol sobre el horizonte*, así que en la línea
  del ocaso la función salta de cero a un valor finito. Ahí el borde de la
  región es una discontinuidad: la bisección converge a la propia línea del
  ocaso, que es lo correcto, y comprobar `|g − nivel| ≈ 0` no significa nada.
  Cerca de la mitad de los vértices de un contorno están ahí. Los tests los
  identifican por la altura del Sol en el instante de su máximo y los cuentan
  aparte; no los descartes en silencio.
- El dominio de los contornos se enmarca con una fila y una columna de **−1 una
  celda por fuera del mundo**. Eso es lo que hace que todo contorno cierre sin
  ningún caso especial en los polos ni en el antimeridiano. Quitar el marco
  obliga a escribir el recorrido del borde del dominio, que es donde vive la
  mitad de los errores de marching squares.
- **El marco no basta: hacen falta nodos reales en ±180 y ±90.** Sin ellos, la
  arista que une el último centro de celda con el marco se corta interpolando
  contra −1 sobre 1,35°, y ese corte cae **dentro** del mapa siempre que el
  valor sea menor que (1+3·nivel)/2 — para el nivel 0,9, siempre. Medido, la
  banda dibujada era la equivocada hasta 66 km adentro por el antimeridiano y 39
  por los polos, en los 56 eclipses. Los nodos del borde del mundo se calculan,
  no se interpolan.
- **El horizonte es el geodésico en todas partes.** `local()` decide con la
  altura sobre el horizonte local y el mapa hacía lo propio con ζ > 0, que es el
  geocéntrico. Sobre un elipsoide no es lo mismo: discrepan hasta 0,091° de
  altura solar, y cerca del ocaso el mapa pintaba una banda del 30-40 % en un
  punto cuya ficha respondía 57,9 %. `SAFETY.md` prohíbe que el mapa contradiga
  a su propia respuesta.
- La pista temporal de `maxObscuration` **tiene que poder ensancharse**. El
  instante del máximo salta de una celda a la vecina al cruzar el terminador,
  y con la ventana fija en k±2 la función devolvía otra cosa que el barrido
  entero en 59 de 93 290 llamadas, una por 0,54 de obscuración. La ventana se
  ensancha mientras el máximo siga cayendo en su borde.
- La subdivisión adaptativa busca la curva a **media cuerda** de distancia, no a
  una cuerda. Con una cuerda entera la bisección se engancha a otra rama del
  contorno que pase cerca, y el anillo se cruza consigo mismo: había 1447
  autocruces, y con `fill-rule: evenodd` cada lazo invierte el relleno.
- La banda más exterior empieza en el **5 %** y eso no es estético. Cerca del
  borde de la penumbra el eclipse dura minutos y el barrido de 121 instantes se
  lo pierde: hasta 0,0165 de obscuración, y 32 de 2227 puntos de la orla se leen
  como cero. El límite de verdad lo dibuja el contorno de la penumbra, que es
  geométrico y no muestrea el tiempo.
- La normal a una cuerda se traza en distancia de arco y se devuelve a longitud
  **dividiendo por el coseno de la latitud**. Cerca del polo ese coseno es
  diminuto y medio grado de arco se convierte en cien de longitud: salían
  vértices a 185°, fuera del dominio. De ahí las dos guardas de `onCurve`, radio
  de búsqueda acotado y resultado descartado si se sale del marco.
- Cada banda lleva como **agujero** el contorno del nivel superior, y no se
  apilan rellenos. Dos rellenos translúcidos superpuestos multiplican sus alfas
  y los diez escalones dejan de ser diez. Leaflet dibuja todos los anillos de un
  polígono en un solo trazado con `fill-rule: evenodd`, así que el agujero sale
  por paridad sin averiguar qué anillo está dentro de cuál. Y recorta el trazado
  a la vista, que es por lo que 13 000 vértices salen a 774 en el DOM y mover el
  mapa cuesta cero.
- `obsAt` es una **copia a mano** de `evaluate` + `geom` + `obscuration`, escrita
  así porque esas dos asignan un objeto cada una y el afinado de los contornos
  las llama millones de veces. Puede separarse de sus originales en cualquier
  edición; `besselian.test.js` las contrasta y esa comprobación no es opcional.
- La poda de la malla es exacta, no una heurística: las dos condiciones que
  descartan una celda —Sol bajo el horizonte y penumbra fuera de alcance en η—
  son monótonas en `cos H`, así que su intersección es un intervalo y basta con
  recorrer dos arcos de columnas. `besselian.test.js` exige que el resultado sea
  **idéntico**, no parecido, al barrido sin podar sobre cuatro geometrías.
- Los tres temas viven enteros en `web/css/style.css` como variables, y `app.js`
  las lee con `cssv()`. No escribas un color a mano en JavaScript: las líneas
  del mapa, el marcador, la gráfica y los casquetes salen todos de ahí, y un
  color literal se queda congelado al cambiar de tema.
- El oscurecimiento del limbo no va siempre en el mismo sentido. Mientras la
  Luna cubre el limbo, que es tenue, el déficit de flujo va **por detrás** del
  de área; en cuanto alcanza el centro lo **adelanta**. Un port con el peso
  invertido sigue dando una curva monótona creíble, y solo el cruce lo caza.
- En `fluxObscuration`, `Math.pow(cos(theta), alpha)` da `NaN` si el coseno sale
  negativo por redondeo en el último nodo de Simpson. Hay que acotarlo a cero.
- El contacto interior es `|m| = |L2'|`, **nunca** `m + L2' = 0`. Esa segunda
  forma es la que tabula Meeus para un eclipse total y no tiene raíz en uno
  anular, porque `L2'` es negativo dentro de la umbra y positivo dentro de la
  antumbra. Escrita así, los dieciocho anulares del catálogo daban cero segundos
  de anularidad mientras seguían dando bien la magnitud.
- Los contactos se nombran por **la dirección en que la curva cruza el cero**,
  no por el orden de las raíces. Tomar la primera como C1 supone que las dos
  caen dentro de la ventana; cuando no, un último contacto se etiqueta como
  primero y todo lo que barre desde C1 hacia adelante concluye que no hay
  eclipse. Por eso también la ventana es de ±4 h y los elementos se ajustan
  sobre ese mismo rango.
- Un eclipse puede ser total sin ser central. Entre γ = 0,9972 y γ ≈ 1,03 el eje
  pasa fuera de la Tierra y el cono todavía roza el limbo. Clasificar mirando
  solo el eje llama parciales a esos, y entonces el mapa no dibuja franja
  mientras la ficha del punto responde «total».
- El desplazamiento de los límites va perpendicular a la velocidad **relativa**
  al suelo, no a la de la sombra en el plano fundamental. El observador aporta
  unos cientos de m/s y omitirlo estrecha la banda hasta 5 km por lado.
- `limits()` no devuelve norte y sur, devuelve `edges`. Esos nombres son el lado
  izquierdo y derecho del movimiento y coinciden con la latitud solo mientras la
  sombra va hacia el este. Reetiquetar época a época arregla el nombre y rompe
  la curva, porque la polilínea empieza a zigzaguear entre los dos bordes.
- γ lleva signo. Sin él no coincide con ningún catálogo publicado y se pierde el
  hemisferio.
- La radiancia retiniana sale del haz **sin eclipsar** dividido por la subtensa
  solar entera, no del eclipsado. La radiancia es invariante bajo ocultación: la
  Luna quita área, no brillo. Lo que el eclipse mueve es el **límite**, a través
  de la subtensa del creciente. Dividir la irradiancia eclipsada por un ángulo
  sólido lleva el peligro a cero justo cuando no está bajando; ese error vivió
  en `eye.py` y por eso el módulo lleva la advertencia escrita.
- Dos discos anidados son **dos** casos. Luna mayor es totalidad y la subtensa
  es cero. Sol mayor es anularidad y queda un anillo entero de fotosfera: ahí
  devolver cero declara peligro térmico nulo con todo el limbo a la vista.
- La ficha nunca escribe «sin límite». ICNIRP solo se pronuncia hasta 30 000 s,
  y la regla 3 de `SAFETY.md` prohíbe cualquier respuesta que se lea como
  permiso. Una transmitancia exigida mayor que 1 tampoco se imprime como cifra.
- Las dos ramas de la transmitancia se devuelven por separado, no solo su
  mínimo. La que no manda es invisible dentro del mínimo, y un fallo ahí no se
  puede ver: así estuvo la rama térmica dividiendo por el haz equivocado.
- El paso fijo no muestrea bien una trayectoria de sombra: al final del recorrido
  la umbra se dispara y seis segundos pasan de 2 km a 110 km de separación. Se
  densifica por bisección solo donde hace falta.
- El recorte de `--fit` centra el astro y no negocia. Lo tentador es agrandar la
  ventana dejándolo descentrado, y sale mucho más encuadre, pero incumple lo que
  se pide y se nota a simple vista. La ventana va simétrica respecto al Sol.
