# Datos de terceros

Las licencias del proyecto cubren lo que se ha creado aquí: AGPL-3.0-only para
el código de `src/` y `tools/`, CC BY-SA 4.0 para el manuscrito de `paper/`, las
figuras de `figs/` y la documentación de `docs/`. Ver `LICENSES.md`.

**No cubre los datos de terceros que el trabajo consume.** Cada proveedor
conserva sus propios términos, que prevalecen sobre esta licencia. Si reutilizas
el repositorio, la atribución que aquí se lista te obliga igual.

Ninguno de estos archivos se versiona en el repositorio salvo donde se indica:
el código los descarga en la primera ejecución.

---

## Efemérides y orientación terrestre

**JPL DE440s** (`data/de440s.bsp`, en `.gitignore`)
Efemérides planetarias del Jet Propulsion Laboratory, NASA, distribuidas por el
Navigation and Ancillary Information Facility. Skyfield las descarga sola.
Términos: <https://naif.jpl.nasa.gov/naif/rules.html>

**IERS finals2000A.all** (`data/finals2000A.all`, en `.gitignore`)
Parámetros de orientación terrestre del International Earth Rotation and
Reference Systems Service. De ahí sale el ΔT = 69,099 s del trabajo.
Términos: <https://www.iers.org>

**Elementos besselianos del eclipse**
NASA Goddard Space Flight Center, catálogo de eclipses de Fred Espenak.
Transcritos con cita literal en `data/literature.json`.
<https://eclipse.gsfc.nasa.gov/SEsearch/SEsearchmap.php?Ecl=20260812>

## Modelo digital del terreno

**Copernicus DEM GLO-30**
Leído por HTTP desde el bucket público `copernicus-dem-30m.s3.amazonaws.com`.
Producido por Airbus Defence and Space bajo contrato con la ESA para el programa
Copernicus de la Unión Europea. Los titulares de derechos son DLR e.V. y Airbus
Defence and Space GmbH.

La licencia de acceso exige reproducir un aviso de copyright literal. **No lo
transcribo aquí de memoria**: tómalo del texto vigente antes de redistribuir
nada derivado del DEM.
<https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model>

## Estado atmosférico

**CAMS**, espesor óptico de aerosoles a 550 nm.
Copernicus Atmosphere Monitoring Service, servido por la API de calidad del aire
de Open-Meteo. Los productos Copernicus exigen atribución al servicio y a la
Unión Europea.
<https://atmosphere.copernicus.eu/>

**ECMWF IFS**, vapor de agua precipitable, presión en superficie y nubosidad.
Servido por la API de previsión de Open-Meteo.
<https://www.ecmwf.int/en/publications/data-policies>

Ambas llegaron a través de **Open-Meteo**, que tiene sus propios términos de uso.
<https://open-meteo.com/en/terms>

**WOUDC**, ozono en columna, estación 411 (Zaragoza), contribuidor AEMET.
Es el único dato atmosférico medido y no pronosticado: 7711 registros
descargados y filtrados en local. La política de datos del WOUDC exige reconocer
tanto al centro como al organismo que originó la medida, o sea AEMET.
<https://woudc.org/about/data-policy.php>

## Modelos y espectros de referencia

**pvlib-python** (BSD-3-Clause) aporta las implementaciones de Kasten y Young,
SPECTRL2, Bird-Hulstrom e Ineichen-Perez, más la climatología de turbidez de
Linke de SoDa que trae empaquetada.
<https://github.com/pvlib/pvlib-python>

**Skyfield** (MIT). <https://rhodesmill.org/skyfield/>

**ASTM G173-03**, espectro de referencia usado para validar SPECTRL2. La norma
es de pago; los espectros tabulados los distribuye NREL.
<https://www.nrel.gov/grid/solar-resource/spectra-am1.5.html>

## Literatura citada

`data/literature.json` contiene transcripciones literales cortas de artículos
con derechos de autor, entre ellos las directrices **ICNIRP 2013** (*Health
Physics* 105(1) 74-96) y Hestroffer y Magnan (1998). Son ecuaciones, constantes
y tablas numéricas citadas para verificación, con la fuente al lado en cada
entrada. Los valores numéricos son hechos y no llevan derechos; el texto que los
rodea sí, y por eso las citas son del tamaño mínimo que permite comprobar el
cálculo.

**ISO 12312-2:2015 no se ha consultado.** Es de pago y no se adquirió. Ninguna
cifra del trabajo procede de ella. Aparece únicamente como nombre de la
certificación que deben llevar los filtros solares.

---

## Si reutilizas esto

1. Cita el trabajo bajo los términos de `LICENSE`.
2. Atribuye por separado cada fuente de esta lista, con sus propios términos.
3. Vuelve a descargar los datos de terceros de su origen. No los redistribuyas
   desde aquí.
