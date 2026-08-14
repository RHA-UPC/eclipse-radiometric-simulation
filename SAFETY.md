# Seguridad

Lee esto antes de usar cualquier número de este repositorio para decidir qué
hacer con tus ojos o con tu cámara.

## Lo esencial

**Mirar al Sol sin un filtro certificado ISO 12312-2 puede provocar daño
retiniano permanente e indoloro.** No duele porque la retina no tiene receptores
de dolor, así que no notarás nada mientras ocurre.

**El único momento en que el filtro se retira es entre el segundo y el tercer
contacto**, o sea durante la totalidad, y solo si estás dentro de la franja
umbral. Fuera de ella no hay ningún momento seguro.

**Una cámara sin filtro solar frontal concentra el Sol sobre piezas que no lo
resisten.** Y un visor óptico entrega ese haz concentrado directamente a tu ojo.

## Por qué este proyecto insiste tanto

Sus propios resultados dicen que el Sol de aquella tarde, a menos de cinco
grados de altura y con once masas de aire de atmósfera por delante, **seguía
superando el límite térmico retiniano de ICNIRP en un 30 %** en el primer
contacto. Con la pupila dilatada, la fijación admisible bajaba a doce segundos.

Ese Sol bajo, rojo y aparentemente inofensivo no produce deslumbramiento, así
que el reflejo de aversión que normalmente te obliga a apartar la vista
desaparece. **El peligro sobrevive a la incomodidad.** Esa es la conclusión más
importante de todo el trabajo y la más fácil de pasar por alto.

## Qué es y qué no es un resultado de este repositorio

Los tiempos de exposición que calcula el proyecto son **el resultado de aplicar
las ecuaciones de ICNIRP 2013 bajo hipótesis declaradas**, no una recomendación
de cuánto puedes mirar.

En concreto, un tiempo de fijación calculado:

- corresponde a **un emplazamiento, una altura solar y un estado atmosférico
  concretos**, y no se traslada a otras condiciones
- supone un ojo sano, sin cirugía refractiva, sin afaquia y sin medicación
  fotosensibilizante
- supone un diámetro pupilar que el propio trabajo discute y que no puedes medir
  en el campo
- es **un límite de exposición, no un objetivo**. Los límites de ICNIRP marcan
  dónde empieza el riesgo conocido, no hasta dónde es prudente llegar.

Ningún número de aquí autoriza a nadie a mirar al Sol.

## Si el proyecto llega a ser una plataforma web

Estas condiciones son vinculantes para cualquier interfaz que se construya sobre
este código, y así lo recoge [`CONTRIBUTING.md`](CONTRIBUTING.md):

1. Ningún resultado de exposición ocular se presenta como consejo. Se presenta
   como cálculo, con sus hipótesis visibles junto al número.
2. La exigencia de filtro certificado ISO 12312-2 aparece en la interfaz, no
   enterrada en unos términos legales.
3. Ninguna respuesta afirma que mirar sea seguro, en ninguna circunstancia y con
   ningún redondeo.
4. Las incertidumbres se muestran. A masa de aire 10,7 los tres modelos de cielo
   claro que el trabajo compara difieren en un factor tres, y ocultarlo daría una
   falsa sensación de precisión.
5. La geometría se verifica antes de responder. Decirle a alguien que está en la
   franja de totalidad cuando no lo está es el peor error posible, porque le
   llevaría a quitarse el filtro con fotosfera a la vista.

## Sobre el equipo fotográfico

El trabajo concluye que **el sensor** de una réflex con un zoom lento no corría
riesgo térmico apreciable con el Sol a esa altura. Esa conclusión **no se
extiende al resto de la cámara**: la cortinilla del obturador y la pantalla de
enfoque son piezas delgadas y sin disipación sobre las que la misma imagen solar
cae mientras encuadras.

Además, el margen calculado depende del diafragma. Un teleobjetivo de 300 mm a
f/2,8 apuntado al Sol de mediodía se queda en un factor 1,9 contra el único
umbral publicado. La advertencia general está justificada; lo que el trabajo
acota es un caso concreto.

**Usa filtro solar frontal durante toda la fase parcial, encuadra en visión en
directo y no por el visor óptico.**

## Sin garantía

Este software y este documento se distribuyen sin garantía de ningún tipo, como
recogen la AGPL-3.0 en sus secciones 15 y 16 y la CC BY-SA 4.0 en su sección 5.
Quien los use asume la responsabilidad de sus decisiones.

Para orientación de referencia, consulta la
[guía de seguridad ocular de la American Astronomical Society](https://eclipse.aas.org/eye-safety).
