# Resultados

Todas las cifras salen de `src/` o de una fuente citada en
`data/literature.json`. Las horas son CEST.

## Geometría

| Evento | Hora | Altura solar | Obscuración |
|---|---|---|---|
| C1 | 19:35:27,5 | 14,70° | 0 |
| C2 | 20:29:25,6 | 4,85° | 1 |
| Máximo | 20:29:59,8 | 4,75° | 1 (magnitud 1,0333) |
| C3 | 20:30:35,9 | 4,63° | 1 |
| C4 | 21:21:19,1 | −4,49° | 0 |

Totalidad **70,27 s**. El Sol se puso todavía parcialmente eclipsado: C4 ocurre
bajo el horizonte, y el ocaso llegó a las 21:00:20.

El emplazamiento estaba a **41,9 km** del límite norte medidos
perpendicularmente, 47,8 km medidos hacia el norte franco. La duración crece
0,58 s por kilómetro que se avance hacia el sur.

Dos soluciones de sombra independientes acotan la duración en 1,4 s: DE440s con
la constante umbral da 70,27 s, y los elementos besselianos de la NASA dan
68,86 s. La reimplementación besseliana reproduce las cuatro duraciones
centrales publicadas por la NASA con desviación máxima de **0,04 s**.

## Visibilidad

El horizonte topográfico hacia el poniente está **deprimido 0,42°**. El Sol lo
salvaba por 5,17°. El emplazamiento domina el valle en la dirección que hacía
falta.

## Irradiancia

En el primer contacto la irradiancia normal directa valía 490 W/m². En el
instante de la totalidad habría valido 186 W/m² **sin eclipse alguno**, solo por
el descenso del Sol: el atardecer se llevó el 62 % de la señal antes de que la
Luna aportara nada.

A masa de aire 10,7 los tres modelos de cielo claro difieren en un factor 3
(SPECTRL2 186, Bird-Hulstrom 154, Ineichen-Perez 61). El trabajo adopta SPECTRL2
por ser el más alto, que es la elección conservadora para el riesgo ocular.

## Sensores

La irradiancia en el plano focal depende del número f y no de la focal. El móvil
a f/1,9 concentra 3288 soles; la réflex a f/6,3 concentra 299.

Incremento local de temperatura a 300 mm y f/6,3 en el primer contacto, según
la idealización:

| Régimen | ΔT |
|---|---|
| Unidimensional, buen sumidero (dado de 0,3 mm) | 0,37 K |
| Semiinfinito (Carslaw y Jaeger) | 1,71 K |
| Placa delgada, cara trasera adiabática | **6,84 K** |

El tiempo característico es a²/κ = 21 ms. El 95 % de la asíntota se alcanza a
los 0,7 s, así que la exposición no lo limita nada térmico.

Contra el único umbral de daño en onda continua publicado con su tamaño de
mancha (Schwarz et al. 2017: 49 kW/cm², 532 nm, 10 s, mancha efectiva de 9,08 µm
de radio), reescalado por la invariancia de q·a:

| Configuración | E pico | Margen A | Margen B |
|---|---|---|---|
| 300 mm f/6,3, C1 del eclipse | 18,4 W/cm² | **18×** | 2669× |
| móvil f/1,9, C1 del eclipse | 202 W/cm² | 69× | 243× |
| 300 mm f/6,3, mediodía | 33,7 W/cm² | 10× | 1452× |
| 300 mm f/2,8, mediodía | 171 W/cm² | **1,9×** | 287× |

La hipótesis A supone que el daño lo gobierna la conducción en el silicio, de
modo que el umbral cae como 1/a. La B supone que lo gobierna la absorción en una
capa fina de baja conductividad, en cuyo caso el umbral no depende del tamaño de
la mancha. A es la conservadora.

Lo que enseña la tabla: los objetivos rápidos y largos que se usan para
fotografiar el Sol son los que se acercan al umbral. El zoom lento a 4,75° de
altura estaba dos órdenes de magnitud más lejos.

Temperaturas del apilado, corregidas tras la revisión: la microlente es lo más
frágil y reflúye entre 125 y 150 °C. El filtro de color se hornea a 150-250 °C
durante su fabricación, así que ese intervalo es una cota de supervivencia y no
de degradación.

## Ojo

Aquí la conclusión se invierte.

| Instante | E_B | Fijación 3 mm | Fijación 7 mm |
|---|---|---|---|
| C1 | 24,0 W/m² | 4,2 s | 0,9 s |
| 30 min antes del máximo | 8,2 W/m² | 12,1 s | 2,2 s |
| Instante de la totalidad, Sol sin eclipsar | 1,58 W/m² | 63 s | 12 s |

El límite térmico retiniano se supera un **30 %** en el primer contacto. La
irradiancia corneal equivalente vale 201,9 W/m², evaluada en el diámetro angular
de la fuente y no en el ángulo de aceptación fotoquímico.

El Sol bajo no deslumbra, y ahí está la trampa: la respuesta de aversión
desaparece antes que el peligro.

La corrección por pupila merece matiz. ICNIRP derivó el límite fotoquímico
suponiendo 3 mm, y la dosis retiniana escala con el área pupilar. Pero quien mira
al Sol fija el creciente de fotosfera, cuyo brillo de superficie el eclipse no
altera, así que mientras quede fotosfera visible cabe esperar una pupila
próxima a la nominal. Donde manda la pupila dilatada es en el tercer contacto,
con el ojo recién salido de la totalidad y una constante de constricción de
segundos. Eso sostiene la regla de reponer el filtro antes de que el Sol
reaparezca.

## Anillo de diamante

A 10 s del segundo contacto quedaba una milésima del área del disco y tres
diezmilésimas del flujo. En el último segundo el flujo residual cae con tiempo
de e-folding de **0,244 s**: se divide por diez cada seis décimas.

El cálculo usa el limbo lunar medio. Las montañas reales rompen el creciente en
las perlas de Baily, de modo que la curva verdadera es escalonada y los
instantes de contacto pueden desplazarse uno o dos segundos.

## Perseidas

El radiante estaba a 9,2° de altura y a 80° del Sol eclipsado. La longitud solar
en el instante de la totalidad era 139,694° J2000, unas ocho horas antes del
nodo del máximo.

Probabilidad de al menos una Perseida en el encuadre durante la totalidad:
**0,67 %** en la configuración más favorable de todo el barrido, que es 16 mm
con magnitud límite 4 y ZHR 100. Bajando la magnitud límite a 3, un 0,31 %.

## Exposición

Durante la totalidad el límite no es térmico sino el arrastre por rotación
terrestre. El Sol se desplazaba a 14,3 segundos de arco por segundo, lo que sobre
el sensor de la EOS 200D da 0,18 s a 300 mm y 3,35 s a 16 mm antes de recorrer un
píxel.

## Lo que las fotografías del observador confirmaron

Ver `docs/PHOTOS.md`. En resumen: la escala de placa predicha coincide con la
medida al 0,1 %, el observador disparó las fases parciales a f/40 (el diafragma
mínimo del objetivo, muy por debajo del peor caso modelado), y no hay un solo
píxel caliente persistente a ISO 12800 en 24,2 millones.
