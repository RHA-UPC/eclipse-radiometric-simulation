# Las fotografías del observador

23 archivos en `fotografias/`: 12 JPEG y 11 CR2. Analizados sin cargar ninguna
imagen en el contexto del modelo, solo con EXIF, numpy y rawpy.

Esa carpeta guarda además dos vídeos, `MVI_2418.MP4` y `MVI_2427.MP4`, que no
entran en este análisis ni en ninguna cifra del manuscrito. Los trata
`tools/stab_solar.py` y solo sirven para verlos. Con ellos no se sostuvo la
regla anterior: para ajustar el detector hubo que mirar fotogramas sueltos.

Productos: `data/photos_exif.json`, `data/photometry.json`, `data/raw_stats.json`,
`data/raw_luminance.json`, `data/hotpixels.json`, `data/photo_analysis.json`.

## Qué hay

Canon EOS 200D con Tamron 16-300mm F/3.5-6.3 Di II VC PZD B016 en los 23
archivos. El hardware modelado y el usado son el mismo.

Las fases parciales se dispararon a **300 mm, f/40, 1/4000 s, ISO 100**. f/40 es
el diafragma mínimo del objetivo a esa focal. Dos fotogramas a 16 mm y f/22, que
también es el mínimo a esa focal. El observador cerró el diafragma tanto como el
objetivo permitía.

Eso importa para las conclusiones de seguridad: el trabajo modeló el peor caso a
f/6,3, y la irradiancia en el plano focal cae con el cuadrado del número f. A
f/40 la concentración es 40 veces menor que a f/6,3.

## El reloj de la cámara iba adelantado

Los EXIF sitúan la última fotografía de fase parcial a las 20:27:57 y la
siguiente ráfaga a las 20:32:45, ya con ISO 12800 y 1/50 s. Con las horas
predichas (C2 a las 20:29:25,6, C3 a las 20:30:35,9) esa ráfaga caería más de dos
minutos después del tercer contacto, donde nadie dispara a ISO 12800.

Los archivos RAW resuelven la contradicción. Normalizando la señal cruda por
ISO, tiempo de exposición y número f se obtiene una luminancia de escena
comparable entre tomas:

| Archivo | Reloj | Luminancia relativa |
|---|---|---|
| _MG_2419 | 20:32:45 | 7,0 × 10⁻⁴ |
| _MG_2423 | 20:33:06 | 3,4 × 10⁻⁴ |
| _MG_2426 | 20:33:26 | 6,1 × 10⁻³ |
| _MG_2428 | 20:36:04 | 1,9 × 10⁻¹ |
| _MG_2429 | 20:36:16 | 1 (referencia) |

Entre `_MG_2426` y `_MG_2428` la escena se vuelve 32 veces más brillante **con
exposición idéntica**: f/20, 1/250 s, ISO 800 en ambas. Eso es la fotosfera
reapareciendo.

La secuencia de 20:32:45 a 20:33:26 abarca 41 s y tiene que caer dentro de la
totalidad. De ahí sale el desfase por puro ordenamiento, sin modelo fotométrico:

    Δt ≥ 20:33:26 − C3 = +171 s
    Δt ≤ 20:32:45 − C2 = +200 s

**El reloj de la cámara iba unos 3 minutos adelantado.** Con ese desfase la
ráfaga de corona empieza 29 s después del segundo contacto y termina justo en el
tercero, que es lo que hace un fotógrafo que retira el filtro, ajusta y vuelve a
ponerlo cuando ve reaparecer el Sol.

## Lo que falló: la fotometría de área

El primer intento midió el área del creciente en los JPEG y la comparó con la
curva de obscuración predicha para despejar el desfase. Dio valores que iban de
+833 s a +316 s, decreciendo de forma monótona a lo largo de la secuencia.

La deriva delata el problema: el *blooming* de saturación infla el área medida, y
el efecto encoge según el Sol se apaga y el creciente adelgaza. Un ajuste de dos
parámetros con un término de blooming constante tampoco funciona, porque el
blooming escala con el brillo de superficie y no es constante.

La conclusión metodológica: en fotogramas saturados, el área es un observable
sesgado y el ordenamiento temporal no lo es.

## Lo que sí validó: la escala de placa

De la hoja de Canon salen 3,717 µm de paso de píxel; del EXIF, 300 mm de focal;
de DE440s, 946,66″ de radio solar aparente. Esos tres números predicen un radio
solar de **86,4 px** en las miniaturas usadas.

El ajuste de circunferencia sobre el fotograma mejor condicionado da **86,5 px**.

Coincidencia al 0,1 %, y ninguno de los tres ingredientes se ajustó a los datos.
Confirma la cadena óptica completa.

## Píxeles calientes

Un píxel caliente es un defecto fijo y aparece en la misma coordenada en tomas
distintas. El ruido de disparo cambia de sitio.

Comparando `_MG_2419` y `_MG_2420`, dos tomas a ISO 12800 separadas 5 s durante
la totalidad: 196 píxeles superan 50σ en cada una, y **cero** lo hacen en las dos
a la vez. Los 196 son ruido.

A ISO 100, comparando `_MG_2429` y `_MG_2431`: **1 píxel** entre 24 216 480, o
sea 4 × 10⁻⁸.

### El límite de esta prueba

No existe un fotograma de referencia anterior al eclipse, así que esto es un
recuento absoluto y no un cambio.

Más importante: el modo de daño que Schwarz et al. describen para irradiación
continua es una **pérdida permanente de sensibilidad** de al menos un 10 %, que
se ve en campo plano y aparece oscura en la imagen. No es un píxel caliente en
una toma oscura. Estas fotografías no permiten comprobarlo, porque no hay campo
plano entre ellas.

El resultado es compatible con la predicción de margen 18×, y no la verifica.
Para verificarla haría falta un campo plano uniforme antes y después.

## Resumen

Confirmado por las fotografías:

- el hardware modelado es el que se usó
- la escala de placa, al 0,1 %
- la totalidad duró al menos 41 s, compatible con los 70,3 s predichos
- el observador disparó a f/40, muy por debajo del peor caso modelado
- el sensor no tiene píxeles calientes

No confirmado:

- las horas absolutas de contacto, porque el reloj de la cámara no estaba
  sincronizado
- la ausencia de pérdida de sensibilidad, que necesita campo plano
