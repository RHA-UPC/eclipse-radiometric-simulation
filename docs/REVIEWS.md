# Revisiones adversariales

Tres agentes independientes recibieron el encargo de refutar el trabajo, no de
elogiarlo, con instrucción de escribir cada hallazgo a disco en cuanto lo
establecieran. Esa instrucción salvó la segunda revisión: murió por límite de
sesión con los hallazgos ya escritos. La tercera murió igual y se reanudó desde
su propio contexto.

Los volcados originales quedan en `data/damage_findings.md` y
`data/review2_findings.md`.

## Revisión 1: óptica y termodinámica

17 hallazgos.

### Sobrevivieron al ataque

La radiometría de plano focal cierra el balance de energía de forma exacta y
respeta el límite termodinámico de concentración. La solución transitoria de
Carslaw y Jaeger coincide con una derivación independiente por función de Green
del semiespacio a 10⁻¹⁰ sobre ocho décadas de tiempo. La cuadratura de
oscurecimiento de limbo reproduce el área exacta de lente círculo-círculo a
10⁻⁵. El uso del valor central en vez del promediado en área es la elección
conservadora y el trabajo la aplica de forma consistente.

### Cayeron

**El supuesto acotamiento térmico no acotaba nada.** El paper presentaba el caso
unidimensional (0,37 K) y el semiinfinito (1,71 K) como cotas inferior y
superior. El revisor construyó el caso físicamente intermedio y peor: dado
delgado con cara trasera adiabática, donde el calor se expande lateralmente
dentro de una placa de 0,3 mm. Da 6,84 K, cuatro veces el valor reportado. El
paper ahora da los tres regímenes y cita el peor.

**"Cuatro órdenes de magnitud" aparecía tres veces y las tres estaba mal.** En
un caso el error era de mil: un factor cuatro escrito como cuatro órdenes de
magnitud.

**La cota de Perseidas contradecía la propia figura del paper.** El resumen decía
0,32 % como máximo; el barrido contenía 0,71 % y la figura 9 lo dibujaba.
Tras corregir la duración de la totalidad ese máximo bajó a 0,67 %, que es
el valor que el paper publica ahora.

**El denominador del margen de seguridad no estaba citado.** El paper afirmaba
"dos órdenes de magnitud por debajo de cualquier umbral de daño plausible" sin
citar ninguno, y callaba que la búsqueda había fracasado.

**El alcance del modelo estaba mal declarado.** El análisis cubría el sensor, y
la conclusión operativa decía "en ninguna combinación de focal y diafragma" sin
aclarar que con el espejo bajado el Sol cae sobre la pantalla de enfoque y no
sobre el sensor.

**Siete cifras escritas a mano, cinco erróneas**, en un documento cuyo pie
afirmaba que ninguna lo estaba.

## Revisión 2: geometría, ojo y estadística

Cuatro hallazgos críticos o mayores. Todos correctos.

### El bug

El paper declaraba una discrepancia de quince segundos entre su cálculo DE440s
(74,1 s) y su reimplementación besseliana (59,2 s), y la atribuía a la
sensibilidad extrema de una geometría rasante. Escribió dos párrafos de física
para explicarla.

Era una omisión de una línea. El ángulo horario μ que Espenak tabula está
referido a TDT, y convertirlo al ángulo horario universal del observador exige
restarle 1,002738·ΔT·15°/3600. Sin ese término la franja umbral entera se
desplazaba 0,29825° de longitud, que a esa latitud son 25 km.

Corregido, la reimplementación reproduce las cuatro duraciones centrales de la
NASA con desviación máxima de 0,04 s, y en el emplazamiento da 68,86 s frente a
70,27 s del DE440s. La horquilla real es de 1,4 s.

El revisor añadió una observación incómoda: `validate.py` tenía criterio de
aprobado en tres de sus cuatro comprobaciones, y ninguno en la que escondía el
fallo.

### La constante equivocada

`geometry.py` usaba k = 0,2725076 para todos los contactos y atribuía esa
elección a Espenak y Meeus. Los elementos besselianos de la NASA, transcritos en
el propio `data/literature.json` del proyecto, declaran k1 = 0,272488 para los
contactos penumbrales y k2 = 0,272281 para los umbrales. C2 y C3 son umbrales.
La constante equivocada inflaba la totalidad 3,8 s.

### El artefacto numérico

Los "55 km hasta el límite norte", repetidos tres veces incluido en las
conclusiones operativas, eran el extremo del intervalo de búsqueda de `brentq`.
`totality_duration()` devuelve exactamente 0.0 fuera de la franja, así que
`brentq` evaluaba el extremo, encontraba f(b) == 0 y lo devolvía sin iterar.
Cambiar el `+ 5.0` del código por `+ 8.0` habría hecho que el paper dijera 58 km.

El valor real: 47,8 km hacia el norte franco, 41,9 km perpendiculares. El
revisor lo verificó por dos vías independientes, incluida una interpolación de
la tabla de la NASA sin usar código del proyecto, con acuerdo de 220 m.

### El ángulo equivocado y la radiancia que no se conserva

Dos errores en el límite térmico retiniano, ambos en dirección insegura.

El primero: α en L_R = 2,8·10⁴·α⁻¹ es el diámetro angular de la fuente. El
código lo evaluaba en γ_ph = 11 mrad, que pertenece al límite fotoquímico.
Corregido a 9,18 mrad, la irradiancia corneal equivalente pasa de 241,9 a
201,9 W/m², y el cociente de peligro en C1 de 1,09 a 1,30.

El segundo: el código escalaba la radiancia ponderada por la transmisión del
eclipse, con lo que el peligro térmico tabulado se desvanecía según la
obscuración se acercaba a la unidad. La Luna quita área, no radiancia. Un Sol
cubierto al 99 % proyecta un creciente cuya irradiancia retiniana es la de la
fotosfera completa, y por eso ICNIRP escribe ese límite en radiancia. El tratamiento correcto mantiene la radiancia fija y deja que
responda α, tomado como la media de las dimensiones mayor y menor del creciente.

### Sobrevivieron

La conversión Ω = πγ²/4, que el revisor demostró que es la que ICNIRP usó para
derivar su propia forma en irradiancia. El uso de la subtensa completa en vez
del semiángulo. La corrección por pupila, que no duplica nada. Y la irradiancia
de luz azul, que el revisor recalculó a mano desde el espectro extraterrestre y
los espesores ópticos de Rayleigh y aerosol: 23 W/m² frente a los 24 del paper
en C1.

## El umbral de daño

Cinco intentos de búsqueda murieron por límite de sesión antes de que el sexto,
con instrucción de escribir a disco de forma incremental, lo cerrara.

Schwarz, Ritt, Koerber y Eberle (2017), *Optical Engineering* 56(3) 034108,
acceso abierto: 49 kW/cm² para un CMOS monocromo bajo láser continuo de 532 nm
con 10 s de exposición y mancha efectiva de 9,08 µm de radio. La clase de daño
es pérdida permanente de sensibilidad de al menos un 10 %, no píxeles muertos: el
daño en línea en el mismo dispositivo exige 196 kW/cm².

Es el único umbral en onda continua para un sensor de silicio publicado junto
con su tamaño de mancha. Sin ese dato el número no sirve, porque el reescalado lo
necesita. No existe segunda medida absoluta con la que contrastar: la que hay
publica sus intensidades en valor relativo por motivos de seguridad.

El agente también corrigió la dirección de una afirmación del paper. Las
temperaturas de 150-250 °C que el manuscrito citaba como rango de degradación
del filtro de color son temperaturas de horneado durante su fabricación, o sea
una cota de supervivencia. Lo frágil del apilado es la microlente, que refluye
entre 125 y 150 °C porque se fabrica fundiéndola.

Y buscó evidencia sobre la cortinilla del obturador. No encontró ninguna fuente
revisada por pares. Las guías que sí existen apuntan al sensor y al ojo: Nikon,
firmando Espenak, dice que el filtro hace falta para no dañar el sensor de
imagen, y la guía de la NASA no menciona daño interno a la cámara.

## Revisión 3: la web (19 de agosto de 2026)

Un tercer agente independiente recibió el encargo de refutar `web/`,
`src/eclipsecat.py` y `src/webdata.py`, con la instrucción de verificar
ejecutando y de no dar por bueno nada leído. Devolvió 17 hallazgos, todos fuera
de lo que las autocomprobaciones cubrían, y una lista de lo que sí resistió.

### El peor: contactos bautizados por orden de raíz

`local()` tomaba la primera raíz como C1 y la última como C4. Eso supone que
las dos caen dentro de la ventana de búsqueda, y con una ventana de ±3,2 h no
siempre pasa: en el eclipse del 2 de julio de 2038, a 13° S 75° O, el primer
contacto está a −3,26 h. Solo sobrevivía una raíz, la del **último** contacto,
y se etiquetaba como primero. Todo lo que luego barría desde C1 hacia adelante
encontraba un intervalo vacío, así que un punto tres grados al oeste, que ve el
40 % del disco cubierto con el Sol alto, salía en pantalla como **«Sin eclipse
visible»**. El censo del agente encontró 17 celdas así y 232 con el orden de
contactos invertido.

Arreglado por partida doble: los elementos se ajustan y se evalúan sobre ±4 h,
y los contactos se nombran por **cómo cruza la curva el cero**, no por el orden
en que salieron las raíces.

### El que la revisión no encontró: ningún eclipse anular era anular

Al tirar del hilo del hallazgo anterior apareció uno mayor. La condición de
contacto interior estaba escrita `m + L2' = 0`, que es como la tabula Meeus
para un eclipse total. `L2'` es negativo dentro de la umbra y **positivo**
dentro de la antumbra, así que esa forma no tiene raíz en un eclipse anular:
los 18 anulares del catálogo declaraban **cero segundos de anularidad**
mientras seguían dando la magnitud correcta, que es exactamente el disfraz que
hace falta para que nadie lo note. La forma correcta es `|m| = |L2'|`.

Con el arreglo, las duraciones centrales reproducen las publicadas: 2027-02-06
da 468 s frente a 471, 2028-01-26 da 624 frente a 627, 2031-05-21 da 322 frente
a 326.

La causa de fondo no es la fórmula: es que toda la batería de pruebas
ejercitaba un único eclipse total.

### Un mapa que se contradecía a sí mismo

Entre γ = 0,9972 y γ ≈ 1,03 el eje de la sombra pasa fuera de la Tierra
mientras el cono todavía roza el limbo. `classify()` miraba solo el eje, así
que llamaba parciales a esos eclipses: el mapa no dibujaba franja alguna y, al
marcar un punto dentro de ella, la ficha respondía «total». Es el caso que la
regla 5 de [`SAFETY.md`](../SAFETY.md) nombra por su nombre. En el catálogo hay
uno, el 9 de abril de 2043. Ahora se tipifica bien y la web declara que no
puede dibujar su franja en vez de insinuar que no existe.

### La franja dibujada era 5 km estrecha

Los límites de la umbra se trazaban desplazando el eje perpendicularmente a la
velocidad de la sombra en el plano fundamental, ignorando que el observador
también se mueve: unos cientos de m/s de rotación terrestre contra una umbra
que va a pocos km/s. La banda salía hasta 5,4 km estrecha por cada lado, un 4 %
sobre una semianchura de 130 km, y el borde dibujado caía dentro de la región
que el mismo código llamaba total. Ahora el desplazamiento va perpendicular a
la velocidad **relativa**, y la prueba ya no compara distancias sino la
invariante que importa: sobre el borde la duración es cero, tres kilómetros
dentro no lo es, tres kilómetros fuera vuelve a serlo.

### Norte y sur no eran norte y sur

Las dos etiquetas eran en realidad el lado izquierdo y el derecho del
movimiento, que coinciden con la latitud solo mientras la sombra viaja hacia el
este; discrepaban en 174 de unas 6200 épocas muestreadas. Reetiquetarlas época
a época arregla los nombres y destroza las curvas, porque cada polilínea pasa a
zigzaguear entre los dos bordes. Se ha quitado el nombre: la función devuelve
`edges`, dos curvas continuas sin bautizar.

### Redacción que la seguridad no admite

La ficha imprimía **«sin límite»** como tiempo de fijación admisible cuando la
irradiancia azul quedaba por debajo de 1 W/m². Eso desborda la propia norma,
que solo se pronuncia hasta 30 000 s, y desborda la regla 3 de `SAFETY.md`, que
prohíbe cualquier respuesta que se lea como permiso. Con la atmósfera por
defecto ocurría en 45 celdas de un barrido global. En los mismos casos la
transmitancia exigida salía **mayor que 1**, que no significa nada físicamente
y se lee como «no hace falta filtro».

### Formulario sin validar

La atmósfera aceptaba cualquier número finito. Con agua precipitable negativa
la ficha imprimía `NaN W/m²` bajo una nota que decía «dentro del rango donde el
modelo está ajustado»; con AOD −1, 4 638 520 W/m². Ahora hay rangos físicos,
se acotan los valores y se avisa de que se han acotado.

### Lo demás

La subtensa del creciente devolvía cero para **cualquier** par de discos
anidados, incluida la anularidad, o sea que declaraba peligro térmico nulo en
el instante en que hay un anillo entero de fotosfera a la vista. Estaba también
en `src/eye.py`; se ha corregido allí, y como este eclipse es total la rama no
se dispara y **ninguna cifra publicada cambia**. La transmitancia térmica
dividía por el haz eclipsado donde `eye.py` divide por el que no lo está. La
frase de sensibilidad al aerosol citaba una irradiancia que dentro de la umbra
vale exactamente cero, así que siempre leía «de 0,00 a 0,00 W/m²». γ se
guardaba sin signo, de modo que no coincidía con ningún catálogo publicado y
perdía el hemisferio. Las curvas se cerraban sobre los huecos donde la sombra
deja el globo y los dibujaban como cuerdas rectas de hasta 252 km. Y las
coordenadas inválidas se rechazaban en silencio, dejando en pantalla el
resultado del punto anterior bajo las coordenadas nuevas.

### Las pruebas no probaban

El agente mató 20 de 37 mutaciones y documentó las 17 supervivientes. Entre
ellas: invertir `total` por `anular`, quitar la comprobación del hemisferio
nocturno, cambiar el radio ecuatorial por el polar, tirar el término cúbico del
polinomio y sustituir la radiancia sin eclipsar por la eclipsada, que es
justamente el error histórico que el módulo dice existir para evitar. Había
además una aserción que comparaba una columna de un CSV contra un literal, sin
ejecutar nada, y una «invariante de horquilla» que comparaba tres épocas
distintas creyendo comparar una.

Las dos baterías se reescribieron alrededor de eso. De las mutaciones que
seguían vivas y son reales, ahora mueren todas; quedan dos equivalentes, en las
que nombrar los contactos por orden da el mismo resultado que nombrarlos por
dirección de cruce **porque la ventana es ancha**, y eso lo cubre la prueba de
la ventana estrecha.

### Procedencia y licencias

`THIRD-PARTY-DATA.md` afirmaba conservar los avisos BSD de pvlib y de Leaflet.
No los conservaba: había una cita bibliográfica y un `@preserve` con el
copyright, pero el texto de la licencia y el descargo no estaban en ningún
sitio del repositorio. Ahora viven en `web/vendor/LICENSE-pvlib.txt` y
`web/vendor/LICENSE-leaflet.txt`, y el pie de la web enlaza a los dos.

El exponente de Ångström y las condiciones de la ASTM G173 eran literales sin
entrada en `data/literature.json`, contra la regla que gobierna el repositorio.
El primero se lee ahora del propio `pvlib` en tiempo de exportación, así que no
puede separarse de lo que `spectral.py` ejecuta; las segundas tienen entrada
propia, con la advertencia de que la norma es de pago y no se consultó. Los
límites de ICNIRP se comprueban contra la cita literal antes de escribirse.

### Sobrevivieron

`spectrl2` reproduce `pvlib.spectrum.spectrl2` **exactamente** en 160 casos
(cuatro atmósferas × diez ángulos cenitales × cuatro días del año): diferencia
relativa peor, 0,000000 %. Los puntos de eclipse máximo del catálogo coinciden
con los publicados por la NASA. Las constantes de ICNIRP coinciden con las citas
literales. El manejo de longitudes en ±180 y de los polos es correcto. Y las
cinco condiciones de `SAFETY.md` se cumplen en lo que la página renderiza: la
pantalla de entrada, el bloque rojo bajo cada resultado, las hipótesis pegadas a
las cifras, el aviso de masa de aire y la verificación previa de la geometría.

## Revisión 4: las bandas vectoriales (20 de agosto de 2026)

Las bandas de obscuración pasaron de trama a polígonos, porque una trama tiene
una resolución y un mapa tiene tantas como niveles de zoom. Un agente
independiente recibió el encargo de romper el código nuevo, con la lista de
afirmaciones que sostenía y la instrucción de refutarlas con código, no con
lectura. Encontró once cosas. Estas son las que importaban.

### El marco no estaba fuera del mapa

El dominio de los contornos se enmarcaba con una fila y una columna de −1 una
celda por fuera del mundo, y el comentario decía que el tramo de anillo que
corre por ese marco cae fuera de lo que la vista alcanza. **Era falso.** Las
aristas que tocan el marco no se afinaban, así que su corte salía de interpolar
linealmente contra −1 sobre 1,35°; como el último nodo real estaba a 0,45° del
borde del mundo, el corte caía **dentro** del mapa siempre que el valor fuera
menor que (1+3·nivel)/2 — para el nivel 0,9, siempre.

Medido: la banda dibujada era la equivocada hasta **66 km dentro del mapa** por
el antimeridiano (2039-06-21, 46° N 179,15° E: valor real 0,724, pintada la
banda del 0,6) y **39 km** por los polos (2039-12-15, 89,65° S: valor real
0,941, pintadas dos bandas de menos). 3126 puntos mal en la franja del
antimeridiano y 3114 en las polares, repartidos por los 56 eclipses. En el
interior del mapa, cero errores de miles de puntos de control.

Corregido metiendo **nodos reales en ±180 y ±90**, calculados y no
interpolados: con ellos, todo cruce contra el marco cae en el borde del mundo o
más allá, que es donde se pretendía que cayera. Vuelto a medir con el mismo
procedimiento del revisor: **cero** puntos con la banda equivocada, en los 56.

### 1434 anillos que se cruzaban consigo mismos

Con `fill-rule: evenodd` cada lazo invierte el relleno, así que un anillo que se
cruza pinta la banda de al lado en la lengüeta que forma. Había 1447 cruces, 233
de ellos a más de un grado de cualquier borde, en 23 eclipses. El peor caso
—2026-02-17, nivel 0,8— era un anillo de 62 vértices que se cruzaba **25 veces**
consigo mismo, y con todos sus vértices correctos: `maxObscuration` valía
0,800000 ± 10⁻⁶ en todos ellos. El defecto no era la posición sino la
poligonalización.

Dos causas. Los picos hasta el marco, que se fueron con la corrección anterior.
Y la subdivisión adaptativa, que buscaba el contorno **una cuerda entera** a
cada lado de su punto medio —el comentario decía media— y a esa distancia podía
engancharse a otra rama del contorno que pasara cerca. Corregido a media cuerda.
Vuelto a medir: **cero autocruces** en los 56 eclipses.

### El mapa y la ficha usaban dos horizontes distintos

El mapa cortaba con ζ > 0, el horizonte **geocéntrico**; la ficha del panel, con
la altura **geodésica** sobre el horizonte local. Sobre un elipsoide no es lo
mismo: los dos criterios discrepan hasta 0,091° de altura solar y, cerca del
ocaso, esos minutos valen puntos de obscuración. En 2026-08-12 a 75° N 100° E la
ficha respondía 57,9 % sobre una banda pintada entre el 30 y el 40 %. Un barrido
de los 56 eclipses encontró 56 puntos con más de 0,01 de discrepancia, el peor
de 0,19.

Un mapa que contradice a su propia respuesta es peor que un mapa tosco, y
`SAFETY.md` lo prohíbe explícitamente. Corregido usando el horizonte geodésico
en todas partes. Vuelto a medir: **1 punto de 13 987**, y ese por otra causa —la
siguiente.

### La pista temporal cambiaba la función

Para no barrer las seis horas en cada uno de los miles de vértices que hay que
afinar, `maxObscuration` acepta como pista el instante del máximo de la celda
más cercana y solo mira ±2 pasos alrededor. El revisor instrumentó las llamadas
**reales** y encontró que la ventana fija erraba en 59 de 93 290 llamadas, una
de ellas por **0,54 de obscuración**: el instante del máximo salta de una celda
a la vecina justo al cruzar el terminador, y ahí ±2 pasos no lo alcanzan.
Corregido ensanchando la ventana mientras el máximo siga cayendo en su borde.
Vuelto a medir: **0 de 6157** llamadas difieren del barrido entero.

De paso encontró que el respaldo que debía cubrir ese caso estaba escrito
`if (bk < 0 && lo > 0)`, o sea desactivado exactamente cuando la pista valía 0,
1 o 2. No se disparaba hoy —ninguna celda del catálogo tiene su máximo ahí— pero
habría bastado con cambiar la ventana temporal.

### El barrido de 121 instantes se pierde los eclipses rasantes

Cerca del borde de la penumbra el eclipse dura minutos y el barrido no lo ve.
Medido contra un barrido de 2001 instantes, la pérdida llega a **0,0165** de
obscuración, y 32 de 2227 puntos de la orla con eclipse se leen como cero. El
contorno del 0,1 % perseguía ahí una función que vale cero a trozos.

No se ha corregido: se ha **retirado la afirmación**. La banda más exterior
empieza ahora en el 5 %, tres veces por encima de esa pérdida. Lo que queda sin
dibujar son unos 175 km de orla sobre una penumbra de 7000, y el límite de
verdad ya estaba dibujado desde el principio: es el contorno de la penumbra, la
línea de trazos. La leyenda dice «5 → 100 %».

### Las pruebas no podían ver tres de los cinco

El apartado de los contornos filtraba los vértices con `|lat| > 89,5` o
`|lon| > 179,5` con el comentario «el marco» — justo la franja donde vivía el
peor defecto. Quitando ese filtro y sin tocar nada más, 112 de 358 vértices de
2026-08-12 salían mal. La medida de la flecha de cuerda descartaba en silencio
toda cuerda sin cambio de signo en ±30 km, que es exactamente lo que les pasaba
a las cuerdas malas, a 100 y 285 km de la curva. Y la comprobación de
anidamiento miraba el valor en cada vértice, nunca la topología del polígono, así
que los 1434 cruces eran invisibles para ella.

Reescritas: ya no filtran el borde del mundo, buscan la curva a cinco cuerdas de
distancia, cuentan aparte los vértices del terminador en vez de descartarlos, y
hay dos apartados nuevos —uno que compara la banda dibujada por paridad contra
la verdadera recorriendo a propósito el antimeridiano y los dos polos, y otro
que busca autocruces.

### Sobrevivieron

Tres afirmaciones aguantaron todo lo que se les echó. Que `obsAt` —una copia a
mano de `evaluate` + `geom` + `obscuration`, escrita para no asignar objetos en
el bucle caliente— es idéntica a sus originales: **cero de diferencia** en
291 951 muestras con el Sol sobre el horizonte, sobre 56 eclipses, incluidos los
polos y el antimeridiano. Que marching squares no produce cadenas abiertas: 632
cadenas sobre 56 eclipses × 10 niveles, **ninguna abierta**, ninguna arista con
grado distinto de dos, y ninguna silla de montar mal resuelta —la media de las
cuatro esquinas es el valor exacto del interpolante bilineal en el centro, así
que dos celdas vecinas no pueden decidirla distinto. Y que el coste está
acotado: ningún eclipse pasa de dos segundos ni de 40 000 vértices.

También descartó dos sospechas propias tras medirlas: la ventana de ±3,2 h no
trunca ningún máximo (diferencia exactamente cero contra ±4 h en 25 307 puntos),
y en el interior del mapa la banda dibujada coincidía con la verdadera en todos
los puntos de control.

### Lo que queda dicho y no arreglado

Sobre el terminador el borde de la región no es una curva de nivel sino un
salto: la función pasa de cero a un valor finito porque el Sol se pone. La
bisección converge ahí a la propia línea del ocaso, que es lo correcto, pero la
distancia a «la curva» la fija la rama de al lado. Todas las cuerdas que quedan
peores de un kilómetro están ahí —comprobado: el Sol a 0,00° en su máximo en
todas—, y las pruebas las apartan contándolas, con un tope sobre cuántas puede
haber. Fuera del terminador la flecha de cuerda queda en 64 m de mediana, 0,22
km en el percentil 90 y menos de 2 km en el peor caso.

Y una advertencia del propio revisor que no es un defecto del código: 600 ms de
cálculo en esta máquina son varios segundos de interfaz congelada en un teléfono
modesto.

## Lección

Las cuatro revisiones encontraron cosas distintas. La primera atacó la física y
sobrevivió casi entera; lo que cayó fue la retórica del margen. La segunda atacó
el código y encontró tres errores numéricos reales, dos de ellos en funciones que
existían precisamente para validar.

La tercera atacó una interfaz y encontró que el código era correcto justo donde
había pruebas y frágil en todo lo demás: el caso que las pruebas ejercitaban era
un eclipse total del hemisferio norte, y prácticamente todo lo que cayó estaba
fuera de esa descripción. El hallazgo más grave no lo encontró ella, sino el
hilo que dejó: los eclipses anulares no eran anulares.

La cuarta atacó un algoritmo nuevo y encontró que lo correcto era casi todo
—la aritmética, la topología, el coste— y que lo roto estaba en las **fronteras
del dominio** y en las **optimizaciones**: el marco que se creía fuera del mapa
y estaba dentro, la pista temporal que convertía la función en otra, la búsqueda
que se enganchaba a la rama de al lado. Ninguna de las tres se veía leyendo el
código, y las tres las tapaba una prueba que descartaba justo esa franja.

El patrón común: los fallos se escondían donde no había criterio de aprobado. La
comprobación V2 no tenía uno. `brentq` no tenía comprobación de que su intervalo
contuviera un cambio de signo. Y el pie de reproducibilidad afirmaba que ninguna
cifra estaba escrita a mano sin que nada lo verificara.
