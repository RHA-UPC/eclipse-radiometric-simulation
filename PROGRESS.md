# Bitácora — Paper eclipse total 2026-08-12, La Figuera (Priorat)

**ESTADO: CERRADO. PDF en `out/paper.pdf` (21 páginas).**
Las dos revisiones adversariales completadas y aplicadas. Bibliografía verificada
mecánicamente. Ninguna entrada del modelo queda sin procedencia.

Entorno: `~/.venvs/eclipse2026/bin/python`. LaTeX: `tectonic`.
Compilar: `cd paper && tectonic -X compile paper.tex --outdir ../out`
Regenerar tablas/valores: `cd src && python paperdata.py` (ANTES de compilar).
Regenerar figuras: `cd src && python figures.py`.

## Cadena de cómputo (toda en src/, toda con autotests)

| Módulo | Qué hace | Autotest |
|---|---|---|
| `siteconf.py` | constantes del sitio y físicas (IAU 2015, Kopp&Lean) | — |
| `geometry.py` | contactos C1–C4 desde DE440s, obscuración, magnitud | — |
| `terrain.py` | horizonte real desde Copernicus GLO-30 | — |
| `pathgeom.py` | posición dentro de la franja, gradiente, sensibilidades | — |
| `limbdark.py` | obscuración ponderada por flujo con limbo oscurecido | 5 checks |
| `radiometry.py` | masa de aire, cielo claro, α(λ) Hestroffer | sí |
| `spectral.py` | SPECTRL2 + transmisión cromática + pesos ICNIRP | sí |
| `optics.py` | irradiancia en plano focal, concentración, potencia | 4 checks |
| `thermal.py` | Carslaw&Jaeger disco/semiinfinito, tiempo a umbral | 6 checks |
| `eye.py` | límites ICNIRP térmico y fotoquímico | 5 checks |
| `perseids.py` | radiante, FOV, tasa, Poisson | sí |
| `validate.py` | ASTM G173, Besselianos NASA, semidiámetro, masa aire | — |
| `figures.py` | 9 figuras | — |
| `paperdata.py` | 6 tablas LaTeX + 75 keyvals | — |

## Resultados clave

- **Dentro de la totalidad**: 74,1 s (DE440s, k=0,2725076). Rango 59–74 s según
  solución de sombra. Máx. 20:29:59,8 CEST, Sol a 4,75°, acimut 285,7°.
- **Horizonte real deprimido** −0,42°; holgura 5,17°. Sitio válido.
- A 55 km del límite norte; +0,58 s por km hacia el sur; ~103 s a 115 km al sur.
- DNI: 490 W/m² en C1 → 186 W/m² en el instante de totalidad **sin eclipse**
  (el atardecer solo ya se lleva el 62 %). Cielo despejado 0 % (ECMWF), AOD 0,16 (CAMS).
- **Sensores**: concentración 299× a f/6,3, 3288× a f/1,9. ΔT local en 300 mm
  f/6,3 en C1: 0,37 K (buen sumidero) / 1,71 K (semiinfinito) / **6,84 K (cara
  trasera adiabática, el peor caso defendible)**. Tiempo característico
  a²/κ = 21 ms; 95 % de la asíntota a 0,7 s. Riesgo térmico despreciable PARA EL
  SENSOR; obturador, pantalla de enfoque y visor quedan fuera del modelo y son
  donde está el riesgo real.
- **Ojo**: en C1, E_B = 24 W/m² → 4,2 s de fijación con pupila nominal de 3 mm,
  0,9 s con 7 mm. En el instante de totalidad, Sol **sin eclipsar**,
  E_B = 1,58 W/m² → 63 s (3 mm) / 12 s (7 mm). ICNIRP derivó el límite
  fotoquímico suponiendo 3 mm: con pupila dilatada el margen cae ×5,4.
- **Perseidas**: radiante a 9,2°, P ≤ 0,71 % en todo el barrido.
- **Anillo de diamante**: el flujo residual cae con e-folding de 0,244 s en el
  último segundo; a 10 s de C2 queda 1e-3 del área pero solo 3e-4 del flujo.

## Fuentes verificadas (data/literature.json, con quote verbatim)

ICNIRP 2013 (PDF primario, ecs. 6,7,13,14,16,17 + Tablas 2–5) · Hestroffer &
Magnan 1998 (PDF ADS, Tabla 2 + ec. 5) · IMO Meteor Shower Calendar 2026 (PDF
primario, p. 11 + Tabla 6) · Besselianos NASA SE2026Aug12T · Kopp & Lean 2011 ·
Linke turbidity climatology (pvlib/SoDa) · CAMS AOD + ECMWF meteo del día ·
Tamron B016 16 elem./12 grupos (web oficial Tamron + referencia del usuario) ·
Copernicus GLO-30 · ASTM G173.

## Revisión adversarial — AMBAS COMPLETADAS

**Revisor 1 (óptica y térmica): 17 hallazgos, todos aplicados.** Sobrevivieron la
radiometría de plano focal, Carslaw & Jaeger (reproducida por función de Green a
1e-10), la elección del valor central y la cuadratura de limbo. Cayeron el falso
"bracket" térmico, tres "cuatro órdenes de magnitud" erróneos, la cota de
Perseidas y siete cifras escritas a mano.

**Revisor 2 (geometría, ojo, estadística): 4 hallazgos críticos/mayores, todos
aplicados.** Escribió a disco incrementalmente (`data/review2_findings.md`), que
es lo que permitió recuperarlos pese a morir por límite de sesión.

| Hallazgo | Antes | Ahora |
|---|---|---|
| Bug en `validate.py`: faltaba el término ΔT en el ángulo horario | franja desplazada 25 km al oeste; "horquilla de 15 s" explicada como física | reproduce las 4 duraciones centrales de NASA a **0,04 s**; horquilla real **1,4 s** |
| Convención de radio lunar | k=0,2725076 para todos los contactos | **k1=0,272488 (C1/C4), k2=0,272281 (C2/C3)**; totalidad 74,07 → **70,27 s** |
| Límite norte de la franja | 55 km (artefacto de `brentq`: el ancho del bracket) | **47,8 km al norte, 41,9 km perpendicular** |
| Límite térmico ICNIRP | evaluado en γ_ph=11 mrad → 241,9 W/m², razón 1,09 | evaluado en la subtensa de la fuente 9,18 mrad → **201,9 W/m², razón 1,30** |
| Radiancia térmica bajo eclipse | escalada por la transmisión → se desvanecía | **radiancia invariante bajo ocultación**; responde α del creciente |
| Ω=πγ²/4, subtensa completa, corrección de pupila, E_B | — | **SOBREVIVEN** (E_B verificado a mano: 23 vs 24 W/m² en C1) |

## Umbral de daño CMOS — CERRADO

`data/damage_findings.md`. Schwarz et al. (2017), Optical Engineering 56(3)
034108, CC BY: **49 kW/cm², CW 532 nm, 10 s, mancha efectiva de 9,08 µm de
radio**, clase de daño = pérdida permanente ≥10 % de sensibilidad. Único umbral
CW publicado con su tamaño de mancha; no existe segunda medida absoluta con la
que contrastar (Yoon 2016 publica valores relativos "por motivos de seguridad";
Kim 2015 de pago).

Aplicado con el reescalado q·a/k que `thermal.py` implementaba y nunca se había
usado: **margen 18× (hipótesis A, conservadora) a 2669× (hipótesis B)** en el
peor instante. Un 300 mm f/2,8 a mediodía queda en **1,9×**.

Temperaturas del apilado, corregidas: **microlente 125–150 °C** (es lo más
frágil, y mi texto la ponía en el sitio equivocado), CFA horneado a 150–250 °C
(cota de SUPERVIVENCIA, no de degradación), OV5647 70 °C operación / 125 °C
almacenamiento.

Cortinilla y pantalla de enfoque: **sin respaldo citable**. Nikon/Espenak y NASA
apuntan al sensor y al ojo. El paper lo declara así.

## Bibliografía — verificada (tarea 8 cerrada)

29 asientos: 16 con DOI, 8 con URL, 5 sin ninguno.
- **16/16 DOI resuelven** en Crossref y el título registrado coincide con el citado.
- **7/8 URL devuelven HTTP 200**; la octava es el endpoint de la API de CAMS, que
  responde 400 sin parámetros de consulta (comportamiento normal, no enlace roto).
- De los 5 sin identificador: Hestroffer & Magnan y la hoja del OV5647 se leyeron
  directamente y están transcritos con cita literal; Carslaw & Jaeger se verificó
  reproduciendo la solución por función de Green (acuerdo 1e-10 sobre 8 décadas)
  sin leer el original; Skyfield se cita por ASCL.
- **ISO 12312-2 se cita pero NO se ha consultado** (de pago). Ninguna cifra del
  paper procede de ella. Declarado explícitamente en el manuscrito.

Artefactos de verificación: `data/bib_index.json`, `data/bib_verification.json`,
`data/bib_url_check.json`.

## Reglas
- Cada número del paper sale de `src/*.py` o de una cita con quote en literature.json.
- `hardware.json` marca el estado de cada bloque; `paperdata.py::assert_no_provisional()`
  aborta la compilación si algo no está en `verified` o `verified-secondary`.
- Los 7 módulos de `src/` tienen autotests que fallan ruidosamente: los 7 pasan.
