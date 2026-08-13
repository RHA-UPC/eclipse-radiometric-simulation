# Procedencia de las entradas

Ninguna entrada del modelo queda sin origen. Lo que no se pudo verificar está
declarado como tal, aquí y en el manuscrito.

## Efemérides y geometría

**JPL DE440s.** Kernel `de440s.bsp` descargado de NAIF. Posiciones aparentes
topocéntricas vía Skyfield, con corrección de tiempo-luz, aberración y
deflexión.

**ΔT.** 69,099 s, de los parámetros de orientación terrestre del IERS. La
predicción con la que la NASA generó sus efemérides de eclipses suponía 71,4 s.
La diferencia de 2,30 s equivale a desplazar al observador 0,8 km al este.

**Constantes de radio lunar.** k1 = 0,272488 y k2 = 0,272281, de los elementos
besselianos que la NASA publica para este eclipse concreto
(`SE2026Aug12Tbeselm.html`), transcritos en `data/literature.json`.

**Radio solar.** 695 700 km, valor nominal de la Resolución B3 de la IAU 2015.
Da un semidiámetro de 959,23″ a 1 ua; el valor clásico de 959,63″ corresponde al
radio antiguo de 696 000 km.

## Terreno

**Copernicus DEM GLO-30**, ESA y Airbus, 1 segundo de arco, alturas sobre
EGM2008. Leído por HTTP con `/vsicurl/`, sin autenticación.

**Coeficiente de refracción terrestre** k_r = 0,13, el valor clásico que Gauss
derivó en 1826 para la red geodésica de Hannover. El trabajo reporta la
sensibilidad para k_r entre 0,07 y 0,20; la conclusión no cambia.

## Atmósfera

| Variable | Valor | Origen |
|---|---|---|
| AOD 550 nm | 0,16 | CAMS vía Open-Meteo, pronóstico del día |
| Vapor de agua precipitable | 2,76 cm | ECMWF IFS vía Open-Meteo |
| Presión en superficie | 949,9 hPa | ECMWF IFS |
| Nubosidad | 0 % en tres niveles | ECMWF IFS |
| Ozono en columna | 0,3109 atm-cm | **medido**, WOUDC estación 411 |
| Turbidez de Linke, agosto | 4,202 | climatología SoDa incluida en pvlib |

El ozono es el único que no es pronóstico. Procede del espectrofotómetro Brewer
MKIV que AEMET opera en Zaragoza, a 136 km del emplazamiento y casi a la misma latitud. La serie completa (7711 registros) se descargó de la API del
WOUDC y se filtró en local: 189 días de la ventana del 8 al 16 de agosto entre
2001 y 2024 dan 310,9 ± 13,8 DU.

Lo interesante no es el valor sino que se demostró irrelevante. Pasar del
0,300 atm-cm que el trabajo suponía antes al valor observado mueve el haz
directo un 0,09 % y la irradiancia de luz azul un 0,03 %. Recorrer los 24 años
de rango histórico, de 280 a 364 DU, los mueve menos del 0,7 %.

## Modelos

**Kasten y Young (1989)** para la masa de aire relativa, vía pvlib. A 4,75° de
altura la dispersión entre cinco fórmulas publicadas es del 2,9 %, así que la
masa de aire no es el eslabón débil.

**Bird y Riordan (1984), SPECTRL2**, vía pvlib. Validado contra el espectro de
referencia ASTM G173: reproduce su integral directa con un error del +2,09 %.

**Bird y Hulstrom (1981)** e **Ineichen y Perez (2002)** como contraste de banda
ancha. A masa de aire 10,7 los tres difieren en un factor 3, y esa dispersión es
la incertidumbre real de la cadena radiométrica.

**Hestroffer y Magnan (1998)** para el oscurecimiento de limbo. Ley de potencia
I(μ) = μ^α con α(λ) de su ecuación 5. El facsímil de ADS se leyó directamente y
su tabla 2 está transcrita.

**TSI** 1360,8 ± 0,5 W/m², de Kopp y Lean (2011), corregido por la distancia
Sol-observador real del instante.

## Límites de exposición

**ICNIRP 2013**, *Health Physics* 105(1) 74-96. El PDF primario se leyó
directamente. Están transcritas las ecuaciones 6, 7, 13, 14, 16 y 17 y las
tablas 2 a 5, con quote literal, incluida la tabla completa de funciones de
ponderación B(λ) y R(λ).

**ISO 12312-2 se cita pero no se ha consultado.** Es de pago y no se adquirió.
Ninguna cifra del trabajo procede de ella: aparece como nombre de la
certificación que deben llevar los filtros, y ese uso se apoya en la guía de la
American Astronomical Society, que sí se leyó.

## Umbral de daño

**Schwarz, Ritt, Koerber y Eberle (2017)**, *Optical Engineering* 56(3) 034108,
acceso abierto. Único umbral en onda continua para un sensor de silicio
publicado junto con su tamaño de mancha. Midieron un Aptina MT9V024 de 2010 con
píxeles de 6 µm; no existe medida equivalente para un sensor de consumo moderno.

**Microlentes.** Reflujo entre 125 y 150 °C, de dos trabajos independientes
sobre matrices de microlentes de fotorresina. Ambos son fotorresina novolaca,
no microlentes de sensor de imagen, y el paper lo dice.

**Filtro de color.** Horneado a 150-250 °C durante la fabricación, de una
patente de Fujifilm. Es cota de supervivencia, no de degradación. No se encontró
temperatura cuantitativa de blanqueo.

**Sensor.** OmniVision OV5647: 70 °C de operación, 125 °C de almacenamiento como
valor máximo absoluto. Las hojas de datos completas de Sony IMX y ON Semi AR no
son públicas.

## Hardware

**Canon EOS 200D.** 22,3 × 14,9 mm CMOS, 6000 × 4000, paso de píxel 3,717 µm.
De la hoja de especificaciones de producto de Canon, servida por una CDN de
terceros porque canon.com bloquea la descarga automática. Confirmado después por
los EXIF de las fotografías del observador.

**Tamron 16-300 B016.** 16 elementos en 12 grupos, confirmado en la web oficial
de Tamron. Los puntos de ruptura del diafragma máximo frente a la focal salen de
la referencia que aportó el observador. No existe medida publicada de
transmitancia, así que el trabajo usa τ = 1, que es la cota conservadora.

**Xiaomi 13T Pro.** Estado `verified-secondary`: mi.com devuelve 403 a la
descarga automática y los valores vienen de un índice de búsqueda que cita la
página oficial. Las focales reales están derivadas de la equivalente y del
formato del sensor, con la derivación escrita en `data/hardware.json`.

## Verificación mecánica de la bibliografía

29 asientos: 16 con DOI, 8 con URL, 5 sin ninguno.

Los 16 DOI resuelven en Crossref y el título registrado coincide con el citado.
De las 8 URL, 7 devuelven HTTP 200; la octava es el punto de acceso de la API de
CAMS, que responde 400 sin parámetros de consulta.

De los cinco sin identificador: Hestroffer y Magnan y la hoja del OV5647 se
leyeron directamente. Carslaw y Jaeger se verificó reproduciendo su solución de
forma independiente, sin leer el original. Skyfield se cita por su registro en
ASCL. ISO 12312-2 no se consultó.

Artefactos: `data/bib_index.json`, `data/bib_verification.json`,
`data/bib_url_check.json`.
