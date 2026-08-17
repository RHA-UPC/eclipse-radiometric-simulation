# Hoja de ruta

Hoy el proyecto calcula un eclipse en un punto. La intención es que llegue a
calcular cualquier eclipse en cualquier punto, y que acabe siendo una plataforma
donde alguien introduzca sus coordenadas y su equipo y obtenga su propio
análisis de seguridad.

Lo que sigue está ordenado por lo que bloquea a lo demás, no por dificultad.

---

## 1. Generalizar el emplazamiento

Es el paso que desbloquea todo el resto y es más fácil de lo que parece.

- [ ] **Sacar el sitio de `src/siteconf.py`.** Hoy ese módulo es la única fuente
      de las coordenadas, la altura y las constantes, así que la generalización
      consiste en convertirlo en una función que reciba un emplazamiento en vez
      de tener uno escrito. El resto de módulos ya lo importan y no necesitan
      cambios estructurales.
- [ ] **Parametrizar la fecha del eclipse.** Los elementos besselianos de
      `data/literature.json` son los del 12 de agosto de 2026. Hace falta
      obtenerlos por evento, o calcularlos desde DE440s en lugar de leerlos.
- [ ] **Resolver el huso horario desde las coordenadas.** Ahora todo está en
      CEST porque el sitio está en España.
- [ ] **Comprobar el caso del eclipse anular y el del parcial.** El código
      supone totalidad en varios sitios. Un usuario en el borde de la franja o
      fuera de ella tiene que obtener una respuesta correcta, y es precisamente
      el usuario al que más daño puede hacerle una respuesta equivocada.

## 2. Quitar los tres bloqueos técnicos de la plataforma

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

- [ ] Convertir la sección «Advertencia» del manuscrito en pantalla de entrada.
- [ ] Mostrar la exigencia de filtro ISO 12312-2 en la interfaz, no en un aviso
      legal enterrado.
- [ ] Presentar cada resultado de exposición ocular junto a sus hipótesis:
      diámetro pupilar, estado atmosférico, altura solar.
- [ ] **Mostrar la incertidumbre.** A masa de aire 10,7 los tres modelos de
      cielo claro difieren en un factor tres. Dar una cifra sola sería mentir por
      omisión.
- [ ] Verificar la geometría antes de responder. Decirle a alguien que está
      dentro de la franja cuando no lo está es el fallo más peligroso posible.
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
      `src/`, más el de `tools/stab_solar.py`, que hay que lanzar a mano.
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

**Prometer cobertura mundial antes de validar fuera de Europa.** El DEM
Copernicus cubre el planeta, pero el horizonte topográfico solo se ha
contrastado en un emplazamiento. Ampliar la cobertura exige validar, no solo
descargar más teselas.
