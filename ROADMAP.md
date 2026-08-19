# Hoja de ruta

Hoy el proyecto calcula un eclipse en un punto. La intención es que llegue a
calcular cualquier eclipse en cualquier punto, y que acabe siendo una plataforma
donde alguien introduzca sus coordenadas y su equipo y obtenga su propio
análisis de seguridad.

Lo que sigue está ordenado por lo que bloquea a lo demás, no por dificultad.

**Actualización del 19 de agosto de 2026.** La mitad geométrica de ese salto ya
está dada, y por un camino que esquiva los bloqueos en vez de resolverlos:
`src/eclipsecat.py` ajusta elementos besselianos propios desde DE440s para los
56 eclipses de 2026 a 2050, y `web/` los consume como sitio estático que calcula
en el navegador. Ni `pathgeom.py`, ni `terrain.py`, ni la efeméride de 32 MB
participan, así que ninguno de los tres bloqueos técnicos llega a plantearse
para la geometría. Siguen bloqueando la parte radiométrica, que es la que
todavía no se puede dar en cualquier punto. Abajo queda marcado qué cayó y qué
no.

---

## 1. Generalizar el emplazamiento

Es el paso que desbloquea todo el resto y es más fácil de lo que parece.

- [x] **Hecho para la web, no para `src/`.** `web/` no tiene emplazamiento: las
      circunstancias locales salen de los elementos y de un par de coordenadas.
      La cadena del manuscrito sigue atada a `siteconf.py`.
- [ ] **Sacar el sitio de `src/siteconf.py`.** Hoy ese módulo es la única fuente
      de las coordenadas, la altura y las constantes, así que la generalización
      consiste en convertirlo en una función que reciba un emplazamiento en vez
      de tener uno escrito. El resto de módulos ya lo importan y no necesitan
      cambios estructurales.
- [x] **Parametrizar la fecha del eclipse.** Resuelto por el segundo camino:
      `eclipsecat.py` los calcula desde DE440s en vez de leerlos, y los contrasta
      contra los publicados por la NASA para 2026. El manuscrito sigue usando la
      entrada de `data/literature.json`, que ahora es una comprobación cruzada
      y no la fuente.
- [ ] **Resolver el huso horario desde las coordenadas.** Ahora todo está en
      CEST porque el sitio está en España. La web enseña UTC y la hora del
      navegador, y dice explícitamente que la segunda no es la del punto
      marcado; es honesto, pero no es la respuesta.
- [x] **Comprobar el caso del eclipse anular y el del parcial.** Hecho en la
      web: el catálogo tipifica total, anular, híbrido y parcial por el signo del
      radio umbral sobre el suelo, un punto fuera de la penumbra devuelve nada en
      vez de una magnitud pequeña, y un eclipse cuyo máximo cae bajo el horizonte
      se declara como tal. Sigue pendiente en `src/`.

## 2. Quitar los tres bloqueos técnicos de la plataforma

Ninguno bloquea ya la geometría, porque la web no los usa. Los tres siguen en
pie para lo radiométrico, que es lo que falta.

- [ ] **`src/pathgeom.py` tarda entre treinta y sesenta minutos.** Inservible
      dentro de una petición HTTP. O se precalcula la franja umbral en una malla
      y se interpola, o se reescribe el algoritmo. La interpolación de la tabla
      de límites de la NASA que se usó para validarlo ya demostró acuerdo de
      220 m, así que precalcular parece la vía barata.
- [ ] **`src/terrain.py` lee el DEM Copernicus por `/vsicurl` en cada
      consulta**, muestreando radiales cada 0,25° de acimut hasta 100 km. Con
      tráfico real eso choca contra los límites del bucket. Hace falta caché de
      teselas y, probablemente, precálculo del horizonte por zonas.
- [ ] **Cachear las efemérides.** `de440s.bsp` son 32 MB. En un servidor se
      cargan una vez, pero conviene medir cuánto cuesta un cálculo completo
      antes de prometer tiempos de respuesta.
- [ ] **Medir el coste de una simulación completa** antes de diseñar nada.
      Ninguna decisión de arquitectura tiene sentido sin ese número.

## 3. Diseñar la plataforma como calculadora, no como consejera

Vinculante. Ver [`SAFETY.md`](SAFETY.md).

- [x] Convertir la sección «Advertencia» del manuscrito en pantalla de entrada.
      Es lo primero que aparece y hay que cerrarla para llegar al mapa.
- [x] Mostrar la exigencia de filtro ISO 12312-2 en la interfaz, no en un aviso
      legal enterrado. Va bajo cada resultado, no una sola vez al entrar.
- [x] Presentar cada resultado junto a sus hipótesis. La ficha de un punto lleva
      pegado qué se supone: terreno a cero, horizonte astronómico, sin refracción,
      radio solar adoptado y de quién es la hora local.
- [ ] **Mostrar la incertidumbre.** A masa de aire 10,7 los tres modelos de
      cielo claro difieren en un factor tres. Dar una cifra sola sería mentir por
      omisión.
- [x] Verificar la geometría antes de responder. `src/eclipsecat.py --selftest`
      y `node web/js/besselian.test.js` exigen menos de 1,5 s por contacto contra
      la cadena DE440s, menos de 3 km contra la línea central de la NASA, y que
      el emplazamiento del estudio caiga a los 41,9 km del límite norte que
      publica el manuscrito.
- [ ] **Falta la incertidumbre de la propia geometría en la interfaz.** Las dos
      convenciones declaradas (radio solar y ΔT) mueven los límites unos cientos
      de metros, y quien esté a esa distancia del borde merece saberlo. Hoy solo
      está escrito en la documentación.
- [x] **Llevar la parte radiométrica a la web.** Hecho por la segunda vía y sin
      precalcular nada: la ficha trae un botón que resuelve SPECTRL2, la
      transmisión cromática con oscurecimiento del limbo y los dos límites de
      ICNIRP en el equipo del visitante, con la atmósfera que él declare. Por
      defecto las condiciones de la ASTM G173-03, marcadas como caso de
      referencia y no como medida.
- [x] **Mostrar la incertidumbre.** La ficha enseña la masa de aire, avisa por
      encima de seis de que el modelo está extrapolando y cita el factor tres
      que este trabajo encontró a masa de aire 10,7, y acompaña cada resultado
      de una horquilla de sensibilidad al aerosol entre la mitad y el doble del
      AOD declarado.
- [ ] **Datos atmosféricos reales por punto y fecha.** Sería lo que cerraría el
      hueco de verdad, y es lo único de esta lista que obliga a tener servidor:
      un sitio estático no puede consultar CAMS.
- [ ] Consultar con un abogado sobre responsabilidad civil antes de abrir al
      público, y valorar un seguro. La renuncia de garantía de la AGPL cubre
      reclamaciones de software, no daños personales.

## 4. Cerrar los huecos científicos declarados

Los tres están reconocidos en el manuscrito y en [`docs/FINDINGS.md`](docs/FINDINGS.md).

- [ ] **No existe umbral de daño publicado para un sensor CMOS de consumo
      moderno.** El único contraste disponible es Schwarz et al. 2017, que midió
      un Aptina MT9V024 de 2010 con píxeles de 6 µm. Encontrar o producir una
      medida sobre un sensor actual es la aportación más valiosa que podría
      recibir este proyecto.
- [ ] **La ausencia de pérdida de sensibilidad no está verificada.** El modo de
      daño que describe Schwarz es una caída permanente de al menos un 10 % que
      solo se ve en campo plano, y no se dispone de ninguno. Quien repita la
      observación debería tomar un campo plano uniforme antes y después.
- [ ] **La afirmación sobre la cortinilla del obturador no tiene respaldo
      revisado por pares.** Descansa solo en el cálculo de placa delgada de este
      trabajo. La búsqueda bibliográfica se hizo y falló.
- [ ] Modelar la pantalla de enfoque y la cortinilla de forma explícita, en vez
      de citarlas como fuera de alcance.
- [ ] Incorporar el limbo lunar real. El cálculo del anillo de diamante usa el
      limbo medio, y las montañas rompen el creciente en perlas de Baily, de modo
      que los instantes de contacto pueden desplazarse uno o dos segundos.

## 5. Ingeniería

- [ ] **Pasar las autocomprobaciones a CI.** Hoy son siete `_selftest()` en
      `src/`, más `src/eclipsecat.py --selftest` y `src/webdata.py --selftest`,
      más `web/js/besselian.test.js` y `web/js/radiometry.test.js`, más el de
      `tools/stab_solar.py`, todos a mano.
      `limbdark.py` tarda varios minutos, así que necesita su propio trabajo
      programado; los demás caben en un solo paso.
- [ ] Añadir `tools/privacy_check.sh` como hook de pre-push, para que no dependa
      de que alguien se acuerde.
- [ ] Fijar las versiones de las dependencias. El manuscrito declara las que se
      usaron, pero no hay `requirements.txt` ni `pyproject.toml`.
- [ ] Reducir el tiempo de `limbdark.py`, o separar su estudio de convergencia
      del resto de la autocomprobación.
- [ ] Traducir el manuscrito al inglés. Ampliaría mucho quién puede revisarlo.

## 6. Licencia y contribuciones

- [ ] **Revisión de [`CLA.md`](CLA.md) por un abogado antes de fusionar la
      primera aportación externa.** El borrador actual lo redactó alguien que no
      lo es. Importa especialmente la cesión de la cláusula 2 frente a los
      límites del artículo 43 del texto refundido de la Ley de Propiedad
      Intelectual, y la renuncia parcial a derechos morales de la cláusula 5.
- [ ] Traducir el CLA al inglés, manteniendo la versión española como auténtica.
- [ ] Decidir si se acepta el CLA firmado por línea de commit o mediante un bot,
      y automatizar la comprobación.
- [ ] Definir el precio y el alcance de la licencia comercial antes de que
      alguien la pida.

---

## Lo que no se va a hacer

**Convertir esto en una app que diga «seguro» o «no seguro».** El proyecto
publica cálculos con sus hipótesis a la vista. Un semáforo obligaría a esconder
la incertidumbre, que a masa de aire 10,7 llega a un factor tres.

**Dar un número de exposición ocular sin enseñar de qué atmósfera sale.** La web
calcula geometría en todo el planeta porque la geometría no depende del aire. La
irradiancia sí, y el repositorio solo tiene medido un día y un sitio, así que la
web la calcula bajo una hipótesis que el usuario ve y puede cambiar. Rellenarla
con una atmósfera estándar y presentarla como dato sería inventarle procedencia
a una cifra de seguridad.

**Prometer cobertura mundial antes de validar fuera de Europa.** El DEM
Copernicus cubre el planeta, pero el horizonte topográfico solo se ha
contrastado en un emplazamiento. Ampliar la cobertura exige validar, no solo
descargar más teselas.
