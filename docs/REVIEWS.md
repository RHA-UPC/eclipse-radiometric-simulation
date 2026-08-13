# Revisiones adversariales

Dos agentes independientes recibieron el encargo de refutar el trabajo, no de
elogiarlo, con instrucción de escribir cada hallazgo a disco en cuanto lo
establecieran. Esa instrucción salvó la segunda revisión: murió por límite de
sesión con los hallazgos ya escritos.

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

## Lección

Las dos revisiones encontraron cosas distintas. La primera atacó la física y
sobrevivió casi entera; lo que cayó fue la retórica del margen. La segunda atacó
el código y encontró tres errores numéricos reales, dos de ellos en funciones que
existían precisamente para validar.

El patrón común: los fallos se escondían donde no había criterio de aprobado. La
comprobación V2 no tenía uno. `brentq` no tenía comprobación de que su intervalo
contuviera un cambio de signo. Y el pie de reproducibilidad afirmaba que ninguna
cifra estaba escrita a mano sin que nada lo verificara.
