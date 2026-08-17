# Cómo contribuir

Este proyecto calcula riesgos de seguridad. Un error aquí no rompe una
compilación: puede acabar diciéndole a alguien que mire al Sol más tiempo del
que debe. Por eso las reglas de abajo son más estrictas de lo habitual.

## La regla que gobierna todo

**Ninguna cifra sin procedencia.**

Cada número que llega al manuscrito o a un resultado sale de un cálculo
reproducible en `src/` o de una fuente citada literalmente en
`data/literature.json`. Si algo no se puede verificar, se declara como no
verificado en lugar de rellenarse con una estimación.

Un pull request que introduzca una constante sin cita se rechaza, por buena que
sea la constante.

## Antes de abrir un pull request

1. **Corre las autocomprobaciones.** Siete módulos traen `_selftest()` y
   comprueban identidades físicas, no valores tabulados: conservación de energía
   en la óptica, el límite termodinámico de concentración, los límites
   asintóticos de Carslaw y Jaeger, la continuidad de las dos ramas del límite
   ICNIRP y el área exacta de lente círculo-círculo.

   ```bash
   cd src && for m in limbdark radiometry optics thermal eye spectral perseids; do
     python $m.py >/dev/null 2>&1 && echo "$m OK" || echo "$m FALLA"; done
   ```

   `limbdark.py` tarda varios minutos. Los demás son rápidos salvo los que
   cargan efemérides.

   `tools/stab_solar.py --selftest` va aparte y es instantáneo. No entra en la
   cadena del manuscrito, así que solo hace falta si tocas esa herramienta.

2. **Corre `validate.py`.** Contrasta SPECTRL2 contra el espectro de referencia
   ASTM G173 y la reimplementación besseliana contra las duraciones centrales
   publicadas por la NASA. V1 y V2 tienen criterio de aprobado.

3. **Corre la comprobación de privacidad.**

   ```bash
   bash tools/privacy_check.sh
   ```

   Falla si en el índice de git aparecen rutas absolutas, imágenes, vídeo,
   kernels de terceros o direcciones de correo.

4. **Si tocas física, deja una comprobación que falle si la rompes.** Una
   identidad, un límite asintótico o un caso con solución analítica. No hace
   falta framework: un `assert` dentro de `_selftest()` basta.

## Qué se acepta con gusto

- Correcciones de errores numéricos, sobre todo si vienen con el caso que las
  destapa.
- Fuentes primarias mejores que las actuales, en particular un umbral de daño
  medido en un sensor CMOS de consumo moderno, que hoy no existe en la
  literatura y es el hueco más grande del trabajo.
- Generalización del emplazamiento. Hoy `src/siteconf.py` es la única fuente de
  las coordenadas, y la intención a medio plazo es parametrizarlo. Ver
  [`ROADMAP.md`](ROADMAP.md).
- Traducciones del manuscrito.

## Qué no se acepta

- Números sin fuente.
- Consejo médico o de seguridad redactado como recomendación. Los resultados de
  exposición ocular se publican como cálculo bajo hipótesis declaradas, nunca
  como permiso para mirar al Sol. Ver [`SAFETY.md`](SAFETY.md).
- Dependencias nuevas para lo que resuelven veinte líneas.
- Cambios que rompan la reproducibilidad: borrar `data/` salvo los tres archivos
  fuente y volver a correr la cadena tiene que seguir reproduciendo el PDF.

## Licencias y cesión de derechos

El código está bajo **AGPL-3.0-only** y el material escrito bajo
**CC BY-SA 4.0**. Ver [`LICENSES.md`](LICENSES.md).

**Toda contribución exige firmar el acuerdo de [`CLA.md`](CLA.md) antes de que
se fusione.** El acuerdo cede al titular del proyecto los derechos necesarios
para poder ofrecer el conjunto bajo otras licencias, incluida una comercial. Sin
esa cesión el proyecto perdería esa posibilidad en cuanto entrara la primera
aportación externa.

Léelo entero antes de contribuir. Si no estás conforme con cederlos, abre una
incidencia describiendo el problema y el arreglo en vez de un pull request: una
descripción no es código y no requiere cesión.
