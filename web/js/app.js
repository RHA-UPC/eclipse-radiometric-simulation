// eclipse-radiometric-simulation
// Copyright (C) 2026 Ricardo Heredia Alessandrello
// SPDX-License-Identifier: AGPL-3.0-only
//
// Front end. All the arithmetic lives in besselian.js; this file only decides
// what to draw and how to word it. Two rules from SAFETY.md are load-bearing
// here and not stylistic: no result is phrased as advice, and the assumptions
// travel next to the number rather than in a footnote.
'use strict';

const TYPE = { total: 'total', annular: 'anular', hybrid: 'híbrido', partial: 'parcial' };
const $ = s => document.querySelector(s);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// localStorage throws outright in some privacy modes; a colour preference is
// not worth taking the page down for.
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
};

// Obscuration ramps, one per theme. They live here and not in the stylesheet
// because the raster is built pixel by pixel on a canvas, which needs the
// numbers rather than a gradient.
//
//   claro     grises: el fondo es claro y la sombra oscurece, que es lo literal
//   oscuro    la rampa fria-caliente de siempre, legible sobre negro
//   accesible una aproximacion de cinco paradas a cividis (Nunez, Anderton y
//             Renslow 2018): no son sus valores tabulados, sino cinco puntos
//             sobre el mismo eje azul-amarillo y con la misma luminancia
//             monotona, que es de donde sale la propiedad que interesa --
//             ningun par rojo/verde y ninguna inversion de claridad. Ademas
//             va contorneado escalon a escalon, para que la informacion no
//             dependa en absoluto del canal del color
const RAMPS = {
  light: [[228, 232, 228], [186, 193, 188], [138, 147, 141], [92, 100, 95],
          [48, 54, 50], [18, 21, 19]],
  dark: [[27, 58, 107], [63, 95, 174], [139, 95, 191], [209, 73, 91], [255, 107, 74]],
  a11y: [[0, 34, 78], [45, 88, 133], [124, 123, 120], [190, 165, 74], [254, 232, 56]]
};

let CAT = null, map, landLayer, borderLayer, pathLayers = [], marker = null;
let current = null, mode = 'eclipse', lastPoint = null;
let basemap = 'streets', streetLayer = null, worldLoad = null, fellBack = false;
let theme = document.documentElement.dataset.theme || 'light';
let legendBox = null, bandLayers = [], lastR = null, caps = [];
const bandCache = new Map();
const WORLD = L.latLngBounds([-90, -180], [90, 180]);

// Tres fondos, y hay que elegir porque ninguno gana en todo.
//
// El de calles y el de relieve los sirve un tercero, gratis, y a cambio
// estampa su marca: una pastilla con un codigo QR cada pocos centenares de
// pixeles. No es un fallo de carga ni algo que el navegador pueda quitar --
// viene dentro de la propia imagen, y quitarla seria incumplir las
// condiciones del servicio que la regala. Sobre una ciudad pasa
// desapercibida; sobre desierto o mar abierto, que es donde una franja de
// eclipse pasa la mayor parte de su recorrido, se queda sola en la pantalla.
//
// El tercero, la costa de Natural Earth, va dentro de la pagina: sin marca,
// sin peticiones a nadie, y por tanto sin que la visita se registre en
// ningun sitio. Es lo que dibujan los mapas de eclipses de toda la vida.
//
// Streets without giving up the poles.
//
// The obvious way to get streets is the standard OpenStreetMap tile pyramid,
// but that is Web Mercator, and Web Mercator has no poles: it is truncated at
// 85.05 deg because the projection sends 90 to infinity. Eclipse paths go
// there -- the 2026 track starts at 87 N -- so a Mercator basemap would cut
// the beginning off this project's own eclipse.
//
// The same OpenStreetMap data is available rendered in EPSG:4326 through a
// WMS, which is the projection this map already uses. One projection for
// everything: poles included, the obscuration raster laid down unchanged, and
// no rebuilding the map to switch basemap.
const OSM_CREDIT = '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> (ODbL)';
const BASEMAPS = {
  streets: { url: 'https://ows.terrestris.de/osm/service', layer: 'OSM-WMS',
             attr: '<a href="https://www.terrestris.de">terrestris</a> &middot; ' + OSM_CREDIT },
  relief:  { url: 'https://ows.mundialis.de/services/service', layer: 'TOPO-OSM-WMS',
             attr: '<a href="https://www.mundialis.de">mundialis</a> &middot; ' + OSM_CREDIT +
                   ', SRTM, GEBCO, <a href="https://www.naturalearthdata.com">Natural Earth</a>' },
  plain:   null
};

// --- formatting ---------------------------------------------------------

const pad = n => String(n).padStart(2, '0');
const utc = d => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
const utcDate = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const localTime = d => d.toLocaleTimeString(undefined,
  { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pct = x => (x * 100).toFixed(x > 0.999 && x < 1 ? 3 : 1) + ' %';
const dms = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

function hhmmss(s) {
  s = Math.round(s);
  const m = Math.floor(s / 60);
  return m ? `${m} min ${pad(s % 60)} s` : `${s} s`;
}

// --- map ----------------------------------------------------------------

// Plate carree, not Mercator. Eclipse paths are traditionally drawn on it, and
// it lets the obscuration raster be laid down as a plain image overlay: in
// Mercator the same image would need reprojecting row by row.
function initMap() {
  map = L.map('map', { crs: L.CRS.EPSG4326, maxZoom: 15, worldCopyJump: false,
                       attributionControl: true, maxBounds: WORLD,
                       maxBoundsViscosity: 1 })
         .setView([25, 0], 2);
  map.attributionControl.setPrefix('');

  // Stacking order is fixed with panes, not with bringToBack(). An image
  // overlay and an SVG renderer are siblings in the same pane and reordering
  // one does nothing to the other, so the raster kept landing on the wrong
  // side of the coastlines.
  for (const [name, z] of [['land', 340], ['caps', 345], ['shade', 350]]) {
    map.createPane(name);
    Object.assign(map.getPane(name).style, { zIndex: z, pointerEvents: 'none' });
  }
  addCaps();
  setBasemap(store.get('mapa') || 'streets');

  // No hay franjas negras: el zoom minimo es aquel en el que el mundo todavia
  // tapa la ventana, y el desplazamiento esta sujeto al mundo. Depende del
  // tamano del elemento, asi que se recalcula al cambiar de tamano.
  //
  // getBoundsZoom recorta su resultado por el minZoom vigente, asi que sin
  // bajarlo antes solo podria subir: al encoger la ventana se quedaria
  // atascado en el minimo de la ventana grande.
  const clampZoom = () => {
    map.setMinZoom(0);
    map.setMinZoom(map.getBoundsZoom(WORLD, true));
  };
  clampZoom();
  map.on('resize', clampZoom);

  map.on('zoomend', () => {
    const op = shadeOpacity();
    bandLayers.forEach(l => l.setStyle({ fillOpacity: l._alpha * op }));
  });
  map.on('click', e => {
    const lon = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
    setPoint(e.latlng.lat, lon);
  });

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    legendBox = L.DomUtil.create('div', 'legend');
    renderLegend();
    return legendBox;
  };
  legend.addTo(map);
}

// The legend carries the palette, so it is rebuilt with it rather than
// written once in the markup.
function renderLegend() {
  if (!legendBox) return;
  const ramp = RAMPS[theme].map(c => `rgb(${c[0]},${c[1]},${c[2]})`).join(',');
  legendBox.innerHTML = `<i style="background:${cssv('--central')}"></i>línea central<br>
    <i style="background:${cssv('--limit')};opacity:.55"></i>límites de la umbra<br>
    <i class="dashed" style="border-top-color:${cssv('--penumbra')}"></i>límite de visibilidad<br>
    <span>obscuración máxima</span>
    <span class="ramp" style="background:linear-gradient(90deg,${ramp})"></span>5 → 100 %
    ${theme === 'a11y' ? '<br>cada escalón del 10 % va contorneado' : ''}`;
}

// Switching theme repaints what the map draws, because the map colours are
// part of the palette. The obscuration grid is cached per eclipse so the
// switch never pays for the arithmetic twice, and the results panel is left
// alone: a radiometry run that took seconds should survive changing colour.
function applyTheme(choice) {
  store.set('tema', choice);
  theme = choice === 'auto'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : choice;
  document.documentElement.dataset.theme = theme;
  if (!map) return;
  renderLegend();
  if (landLayer) landLayer.setStyle(landStyle());
  caps.forEach(c => c.setStyle({ fillColor: cssv('--map-bg') }));
  if (marker) marker.setStyle({ color: cssv('--marker-ring'), fillColor: cssv('--marker-fill') });
  if (mode === 'eclipse' && current) drawEclipse(current);
  const cv = document.getElementById('curve');
  if (cv && lastR) drawCurve(cv, lastR);
}

function setBasemap(kind) {
  if (!(kind in BASEMAPS)) kind = 'streets';
  basemap = kind;
  store.set('mapa', kind);
  document.getElementById('map').dataset.base = kind;
  if (streetLayer) { map.removeLayer(streetLayer); streetLayer = null; }
  // Los casquetes solo tapan el negro que devuelve el WMS. Sin WMS no hay
  // negro que tapar y taparlo esconderia la costa que si llega al polo.
  caps.forEach(c => (kind === 'plain' ? map.removeLayer(c) : c.addTo(map)));
  if (kind === 'plain') { loadWorld(); return; }
  if (landLayer) map.removeLayer(landLayer);

  const b = BASEMAPS[kind];
  streetLayer = L.tileLayer.wms(b.url, {
    layers: b.layer, format: 'image/png', version: '1.1.1', transparent: false,
    pane: 'land', maxZoom: 15, noWrap: true, bounds: WORLD,
    attribution: b.attr + ' &mdash; <a href="../THIRD-PARTY-DATA.md">fuentes</a>'
  }).addTo(map);

  // Falling back needs evidence, not a single failed request. A handful of
  // errors with nothing loaded means the server is unreachable; one error while
  // other tiles arrive is just one tile. The timeout covers the case that hangs
  // instead of failing, which is the one a tileerror handler never sees.
  let ok = 0, err = 0;
  streetLayer.on('tileload', () => { ok++; });
  streetLayer.on('tileerror', () => { if (++err >= 4 && ok === 0) fallback('no responde'); });
  setTimeout(() => { if (ok === 0 && basemap === kind) fallback('no responde'); }, 9000);
  if (navigator.onLine === false) fallback('sin conexión');
}

// The outline is fetched only here, so a visit that never needs it never pays
// for it.
//
// ONE layer, filled and stroked, not two. Leaflet turns every coordinate into
// an L.LatLng object, so this file's 190 000 vertices are already 190 000
// objects; building it twice to get the fill under the raster and the borders
// over it cost twice that and killed the tab. The coastlines now sit under the
// raster, which is where the street basemap's own coastlines sit anyway.
//
// The canvas renderer is not optional either: as SVG paths, 3 800 rings take
// seconds to lay out and stutter on every pan.
function loadWorld() {
  if (worldLoad) return worldLoad.then(() => { if (landLayer) landLayer.addTo(map); });
  worldLoad = fetch('data/world.geojson').then(r => r.json()).then(g => {
    landLayer = L.geoJSON(g, { pane: 'land', interactive: false, style: landStyle() });
    borderLayer = null;
  }).catch(() => { worldLoad = null; });
  return worldLoad.then(() => { if (landLayer) landLayer.addTo(map); });
}

function fallback(why) {
  if (fellBack || basemap === 'plain') return;
  fellBack = true;
  const sel = document.getElementById('basemap');
  if (sel) sel.value = 'plain';
  setBasemap('plain');
  const n = document.createElement('div');
  n.className = 'offline-note';
  n.innerHTML = `Mapa de fondo no disponible (${why}). Se dibujan las costas
    de Natural Earth, que van en la propia página. Las circunstancias del
    eclipse se calculan igual: no dependen del fondo.
    <button id="retry">Reintentar</button>`;
  document.getElementById('map').appendChild(n);
  document.getElementById('retry').onclick = () => {
    n.remove(); fellBack = false;
    const s = document.getElementById('basemap');
    if (s) s.value = 'streets';
    setBasemap('streets');
  };
}

const clearPaths = () => { pathLayers.forEach(l => map.removeLayer(l)); pathLayers = []; };

// Los contornos cierran contra un marco que está fuera del mundo, y eso a un
// relleno no se le ve pero a un trazo sí: saldría una línea de puntos pegada
// al borde del mapa. Los tramos de fuera se cortan insertando un hueco, que
// segments() convierte después en polilíneas separadas.
const clipWorld = ring => ring.map(p =>
  (Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180) ? p : null);
const landStyle = () => ({ color: cssv('--land-line'), weight: 0.7 * (+cssv('--stroke') || 1),
                           fillColor: cssv('--land-fill'), fillOpacity: 1 });

// Los casquetes polares.
//
// El WMS no tiene nada por encima del limite de Mercator: su fuente es
// Mercator, y Mercator se acaba ahi. Lo que devuelve en esa franja es negro,
// que es exactamente la banda negra que no queremos. Se tapa con el propio
// fondo del mapa, porque un casquete sin cartografia se lee como lo que es y
// el negro se leia como un fallo de carga. La trayectoria y el raster se
// dibujan encima: el mapa sigue llegando a los polos, que es para lo que se
// eligio EPSG:4326.
//
// 84 grados y no 85,0511. El limite exacto no vale: medido en pantalla, el
// negro que devuelve el servidor baja hasta unos 84,3 grados en el nivel de
// zoom mas alejado, porque su rejilla de teselas no cae donde la nuestra. Un
// grado de margen lo cubre, y lo que se deja fuera es oceano Artico e interior
// del casquete antartico, donde ese fondo no tiene nada que ensenar.
const MERCATOR_LIMIT = 84;
const capStyle = () => ({ pane: 'caps', stroke: false, fillColor: cssv('--map-bg'),
                          fillOpacity: 1, interactive: false });
function addCaps() {
  caps = [L.rectangle([[MERCATOR_LIMIT, -180], [90, 180]], capStyle()),
          L.rectangle([[-90, -180], [-MERCATOR_LIMIT, 180]], capStyle())];
}


// Obscuration bands, as vector polygons.
//
// This used to be a raster, and a raster has one resolution while a map has
// as many as it has zoom levels. A canvas of 1920 by 960 covering the whole
// world is a pixel every 21 km, which at zoom 7 is 34 screen pixels: the
// bands came out as staircases and the accessible mode's 2-pixel outlines
// came out as 68-pixel steps. No canvas size fixes that, because the map goes
// to zoom 15.
//
// So the bands are polygons now and the browser scales them. `Bess.contours`
// builds them: the grid finds the topology, every vertex is then placed by
// bisecting the true maximum-obscuration function, and the chords are
// subdivided until they sit within half a kilometre of the real curve. It
// costs around a second per eclipse, once, against 350 ms for the raster --
// and after that, panning and zooming cost nothing at all, where the raster
// paid for a redraw on every zoom.
//
// One polygon per band, each carrying the contour ABOVE it as a hole, so the
// fills do not stack: two overlapping translucent fills would multiply their
// alphas and the ten steps would stop being ten steps. Leaflet draws every
// ring of a polygon into a single path with fill-rule evenodd, so the hole
// works without any point-in-polygon bookkeeping.
// Se guardan varios: ir y volver entre dos eclipses del catalogo con un solo
// hueco de cache repagaba el segundo entero cada vez.
const BAND_CACHE = 8;
function bandsOf(e) {
  let hit = bandCache.get(e.id);
  if (!hit) {
    hit = Bess.contours(e.elements);
    bandCache.set(e.id, hit);
    if (bandCache.size > BAND_CACHE) bandCache.delete(bandCache.keys().next().value);
  }
  return hit;
}

const clearBands = () => { bandLayers.forEach(l => map.removeLayer(l)); bandLayers = []; };

function drawBands(e) {
  clearBands();
  const C = bandsOf(e);
  const ramp = RAMPS[theme] || RAMPS.dark;
  const op = shadeOpacity();
  for (let i = 0; i < C.rings.length; i++) {
    const outer = C.rings[i];
    if (!outer.length) continue;
    const holes = C.rings[i + 1] || [];
    // El color sale del punto medio de la banda, leido de los niveles, no de
    // suponer que son diez: con once, i/10 + 0,05 se pasaba del final de la
    // rampa y el dibujo moria con un TypeError.
    const v = (C.levels[i] + (i + 1 < C.levels.length ? C.levels[i + 1] : 1)) / 2;
    const f = v * (ramp.length - 1), k = Math.floor(f), w = f - k;
    const c = ramp[k].map((q, m) => Math.round(q * (1 - w) + ramp[k + 1][m] * w));
    const alpha = (55 + 175 * v) / 255;
    const band = L.polygon(outer.concat(holes), {
      pane: 'shade', interactive: false,
      stroke: theme === 'a11y', color: '#111111', weight: 1, opacity: 0.85,
      fillColor: `rgb(${c[0]},${c[1]},${c[2]})`, fillOpacity: alpha * op
    }).addTo(map);
    band._alpha = alpha;
    bandLayers.push(band);
  }
}

// The raster answers "where is it visible at all", which is a world-scale
// question. Zoomed in on a path it only hides the coastline, so it fades.
const shadeOpacity = () => {
  const z = map.getZoom();
  if (basemap !== 'plain') return z >= 8 ? 0.18 : z >= 5 ? 0.32 : 0.55;
  return z >= 5 ? 0.26 : 0.62;
};

// Split a track at the antimeridian and at the nulls the geometry inserts
// where the shadow leaves the globe. Without the second cut a gap the shadow
// never crossed gets drawn as a straight chord, up to 250 km long.
function segments(pts) {
  const out = [[]];
  let prev = null;
  for (const p of pts) {
    if (p === null) { out.push([]); prev = null; continue; }
    if (prev && Math.abs(p[1] - prev[1]) > 180) out.push([]);
    out[out.length - 1].push([p[0], p[1]]);
    prev = p;
  }
  return out.filter(s => s.length > 1);
}

function drawEclipse(e) {
  clearPaths();
  const B = e.elements;
  drawBands(e);
  const thick = +cssv('--stroke') || 1;
  // El límite de visibilidad: fuera de esta línea el Sol no llega a estar
  // eclipsado en ningún momento. Antes se dibujaba aquí el borde de la
  // penumbra EN EL INSTANTE del máximo, que es una circunferencia y no un
  // límite: caía dentro de las bandas y las cruzaba, y la leyenda no decía
  // cuál de las dos cosas era.
  for (const ring of bandsOf(e).visible)
    for (const seg of segments(clipWorld(ring)))
      if (seg.length > 1)
        pathLayers.push(L.polyline(seg, { color: cssv('--penumbra'), weight: thick,
          dashArray: '5 4', interactive: false }).addTo(map));
  // A non-central total or annular eclipse has an umbral band that this code
  // cannot anchor, because every path curve is built outwards from the axis
  // intersection and the axis misses the Earth. The summary says so rather
  // than the map quietly implying there is nothing there.
  if (e.type !== 'partial' && e.central) {
    const lim = Bess.limits(B, 'l2');
    for (const side of lim.edges)
      pathLayers.push(L.polyline(segments(side), { color: cssv('--limit'), weight: 1.2 * thick,
        opacity: 0.55, interactive: false }).addTo(map));
    pathLayers.push(L.polyline(segments(Bess.centralLine(B)), { color: cssv('--central'),
      weight: 2 * thick, interactive: false }).addTo(map));
  }
  $('#summary').innerHTML = `
    <span class="tag ${e.type}">${TYPE[e.type]}</span><br>
    Máximo <b>${e.greatest_UT.slice(11, 19)} UTC</b> · gamma <b>${e.gamma}</b>
    ${e.magnitude ? `· magnitud <b>${e.magnitude}</b>` : ''}
    ${e.central_lat !== null ? `<br>Eclipse máximo en <b>${dms(e.central_lat, 'N', 'S')}
      ${dms(e.central_lon, 'E', 'O')}</b>`
      : `<br>Eclipse <b>no central</b>: el eje de la sombra pasa fuera de la Tierra
         y ${e.type === 'partial' ? 'la umbra no llega a rozarla'
             : 'la umbra solo roza el limbo, así que esta página no dibuja su franja aunque exista'}.`}`;
}

// --- panels -------------------------------------------------------------

// SAFETY.md forbids presenting an ocular-exposure result as advice, and forbids
// hiding uncertainty. The honest thing where the number does not exist yet is
// to say which part is computed and which is not, rather than to omit the
// section and let the geometry read as the whole answer.
function intensity(r) {
  const left = (1 - r.visible_obscuration) * 100;
  return `<div class="assume">
    <b>Intensidad.</b> Queda <b>${left < 0.01 ? '&lt; 0,01' : left.toFixed(2).replace('.', ',')} %</b>
    del área del disco. La irradiancia directa cae aproximadamente en esa
    proporción, algo menos porque el oscurecimiento del limbo hace que el borde
    aporte menos que el centro.<br><br>
    <b>Lo que no cae es el brillo.</b> La radiancia de la fotosfera es invariante
    bajo ocultación: la Luna quita área, no brillo superficial. Por eso el límite
    térmico retiniano de ICNIRP se expresa como radiancia, y por eso una fase
    parcial del 99 % sigue proyectando sobre la retina la misma luminancia que el
    Sol entero.<br><br>
    <b>La irradiancia sí se puede calcular</b>, pero no viene precalculada:
    depende del estado atmosférico del punto y del día, que este proyecto no
    tiene medido más que sobre el Ebro. Lo que hace el botón de abajo es
    resolver el modelo espectral <b>en tu ordenador</b>, con la atmósfera que
    tú declares, para que el número lleve pegada la hipótesis de la que sale.
    El caso resuelto del manuscrito está en
    <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.</div>`;
}

const SAFETY = `<div class="danger"><strong>El filtro ISO 12312-2 es obligatorio
durante toda la fase parcial.</strong> Solo se retira entre C2 y C3, y solo dentro
de la franja umbral. Esta página calcula geometría; no autoriza a mirar al Sol.
Lee <a href="../SAFETY.md">SAFETY.md</a>.</div>`;

function contactRows(r) {
  const rows = [['C1', 'primer contacto'], ['C2', 'empieza la fase central'],
                ['MAX', 'máximo'], ['C3', 'termina la fase central'], ['C4', 'último contacto']];
  return rows.filter(([k]) => r[k]).map(([k, d]) => `<tr>
      <td><b>${k}</b><br><span style="color:var(--dim);font-size:.72rem">${d}</span></td>
      <td class="num">${utc(r[k].utc)}<br><span style="color:var(--dim);font-size:.72rem">${localTime(r[k].utc)}</span></td>
      <td class="num">${r[k].alt.toFixed(1)}°${r[k].alt < 0 ? ' ⚠' : ''}<br>
        <span style="color:var(--dim);font-size:.72rem">${r[k].az.toFixed(0)}°</span></td>
    </tr>`).join('');
}

function renderPoint(e, lat, lon) {
  const r = Bess.local(e.elements, lat, lon, 0);
  const box = $('#result');
  if (!r || r.visible_obscuration <= 0) {
    box.innerHTML = `<h2>Sin eclipse visible</h2>
      <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'O')}</p>
      <p class="hint">${r ? 'El eclipse ocurre con el Sol bajo el horizonte en este punto.'
                          : 'Este punto queda fuera de la penumbra.'}</p>`;
    return;
  }
  const isCentral = r.duration_s > 0;
  const kind = isCentral ? r.central : 'partial';
  const belowMax = r.MAX.alt < 0;
  box.innerHTML = `
    <h2>${e.id} · <span class="tag ${kind}">${TYPE[kind]}</span></h2>
    <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'O')}</p>
    <div class="big ${isCentral ? 'total' : 'partial'}">${pct(r.visible_obscuration)}</div>
    <p class="sub">del disco solar cubierto (área), magnitud ${r.magnitude.toFixed(4)}</p>
    ${isCentral ? `<p><b>${hhmmss(r.duration_s)}</b> de fase ${TYPE[r.central]}</p>` : ''}
    ${belowMax ? `<p class="hint">⚠ El máximo geométrico ocurre con el Sol bajo el
      horizonte. La cifra de arriba es la máxima obscuración con el Sol visible.</p>` : ''}
    <table>
      <tr><th>contacto</th><th class="num">UTC / ${TZ}</th><th class="num">alt / az</th></tr>
      ${contactRows(r)}
    </table>
    <div class="assume"><b>Hipótesis.</b> Elevación del terreno 0 m y horizonte
      astronómico: el relieve real no entra todavía, así que un Sol bajo puede
      quedar oculto tras una montaña que este cálculo no ve. Altura solar
      geométrica, sin refracción. Elementos besselianos ajustados desde JPL DE440s,
      radio solar IAU 2015 nominal (695 700 km). Las horas locales son las de tu
      navegador (${TZ}), no las del punto marcado.</div>
    ${intensity(r)}
    <button id="calc">Calcular irradiancia y exposición ocular aquí</button>
    <p class="hint">Se resuelve SPECTRL2 sobre 122 longitudes de onda, el
    oscurecimiento del limbo y los límites de ICNIRP 2013 en tu propio equipo.
    Unas dos décimas de segundo. Nada se envía a ningún sitio.</p>
    <div id="radio-out"></div>
    ${SAFETY}`;
  atmForm = null;
  const btn = document.getElementById('calc');
  if (btn) btn.onclick = () => runRadio(btn, lat, lon);
}

function renderPlace(lat, lon) {
  const rows = [];
  for (const e of CAT.eclipses) {
    const r = Bess.local(e.elements, lat, lon, 0);
    if (!r || r.visible_obscuration < 0.001) continue;
    rows.push({ e, r });
  }
  const box = $('#result');
  box.innerHTML = `<h2>${rows.length} eclipse${rows.length === 1 ? '' : 's'} visible${rows.length === 1 ? '' : 's'}</h2>
    <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'O')} · 2026 – 2050</p>
    ${rows.length ? `<table>
      <tr><th>fecha</th><th class="num">cubierto</th><th class="num">duración</th><th class="num">alt</th></tr>
      ${rows.map(({ e, r }, i) => {
        const central = r.duration_s > 0;
        return `<tr class="clickable" data-i="${i}">
          <td>${e.id}<br><span class="tag ${central ? r.central : 'partial'}">${TYPE[central ? r.central : 'partial']}</span></td>
          <td class="num">${pct(r.visible_obscuration)}</td>
          <td class="num">${central ? hhmmss(r.duration_s) : '—'}</td>
          <td class="num">${(r.visible_max || r.MAX).alt.toFixed(0)}°</td></tr>`;
      }).join('')}</table>`
      : '<p class="hint">Ningún eclipse solar alcanza este punto entre 2026 y 2050.</p>'}
    <div class="assume"><b>Visible</b> significa aquí que alguna parte del eclipse
      ocurre con el Sol sobre el horizonte astronómico y a nivel del mar. No se
      tiene en cuenta el relieve ni la meteorología.</div>
    ${rows.length ? SAFETY : ''}`;
  box.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => {
    const e = rows[+tr.dataset.i].e;
    setMode('eclipse');
    $('#pick').value = e.id;
    current = e;
    drawEclipse(e);
    renderPoint(e, lat, lon);
  });
}

// --- wiring -------------------------------------------------------------

function setPoint(lat, lon) {
  lastPoint = [lat, lon];
  if (marker) map.removeLayer(marker);
  marker = L.circleMarker([lat, lon], { radius: 6, color: cssv('--marker-ring'), weight: 2,
    fillColor: cssv('--marker-fill'), fillOpacity: 1 }).addTo(map);
  $('#in-lat').value = lat.toFixed(4);
  $('#in-lon').value = lon.toFixed(4);
  if (mode === 'eclipse' && current) renderPoint(current, lat, lon);
  else renderPlace(lat, lon);
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  $('#ctl-eclipse').hidden = m !== 'eclipse';
  $('#ctl-lugar').hidden = m === 'eclipse';
  if (m === 'lugar') { clearPaths(); clearBands(); }
  else if (current) drawEclipse(current);
  if (lastPoint) setPoint(lastPoint[0], lastPoint[1]);
  else $('#result').innerHTML = '';
}

const themeSel = $('#theme');
themeSel.value = store.get('tema') || 'auto';
themeSel.onchange = () => applyTheme(themeSel.value);

const baseSel = $('#basemap');
baseSel.value = store.get('mapa') || 'streets';
baseSel.onchange = () => {
  document.querySelector('.offline-note')?.remove();
  fellBack = false;
  setBasemap(baseSel.value);
  bandLayers.forEach(l => l.setStyle({ fillOpacity: l._alpha * shadeOpacity() }));
};
matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => { if (themeSel.value === 'auto') applyTheme('auto'); });

fetch('data/eclipses.json').then(r => r.json()).then(cat => {
  CAT = cat;
  initMap();
  const sel = $('#pick');
  sel.innerHTML = cat.eclipses.map(e =>
    `<option value="${e.id}">${e.id} — ${TYPE[e.type]}</option>`).join('');
  sel.onchange = () => {
    current = cat.eclipses.find(e => e.id === sel.value);
    drawEclipse(current);
    if (lastPoint) renderPoint(current, lastPoint[0], lastPoint[1]);
  };
  current = cat.eclipses.find(e => e.id === '2026-08-12') || cat.eclipses[0];
  sel.value = current.id;
  drawEclipse(current);
});

document.querySelectorAll('.mode').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#gate-ok').onclick = () => $('#gate').hidden = true;
$('#go').onclick = () => {
  const la = parseFloat($('#in-lat').value), lo = parseFloat($('#in-lon').value);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90) {
    // Failing in silence left the previous point's answer on screen under the
    // new coordinates, which is worse than an error: it looks like a result.
    $('#result').innerHTML = `<h2>Coordenadas no válidas</h2>
      <p class="hint">La latitud va de −90 a 90 y la longitud tiene que ser un
      número. Las longitudes fuera de ±180 se envuelven solas.</p>`;
    if (marker) { map.removeLayer(marker); marker = null; }
    lastPoint = null;
    return;
  }
  setPoint(la, ((lo + 180) % 360 + 360) % 360 - 180);
  map.setView([la, lo], Math.max(map.getZoom(), 3));
};
$('#geo').onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(
  p => { setPoint(p.coords.latitude, p.coords.longitude); map.setView([p.coords.latitude, p.coords.longitude], 5); },
  () => $('#result').innerHTML = '<p class="hint">El navegador no dio la ubicación.</p>');

// --- radiometry on demand -------------------------------------------------
//
// Nothing below runs until the visitor asks for it. It is the expensive half
// of the page (a couple of hundred milliseconds and an 8 kB table), it is
// useless without an atmosphere the visitor has to choose, and precomputing it
// for every point of the planet and every eclipse would be absurd: the whole
// point is that the model is cheap enough to evaluate where you are standing.

let atmForm = null;

const fmt = (v, d = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const sci = v => v >= 0.01 ? fmt(v * 100, 2) + ' %'
  : (v * 100).toExponential(1).replace('.', ',').replace('e', '·10^') + ' %';

// ICNIRP's long-exposure branch is stated for t < 30 000 s and says nothing
// beyond it. "Sin límite" would therefore be wrong twice over: it overreaches
// the standard, and SAFETY.md forbids any answer that reads as permission.
const ICNIRP_T_MAX = 30000;
function secs(s) {
  if (!isFinite(s) || s >= ICNIRP_T_MAX)
    return 'la norma no acota más allá de ' + fmt(ICNIRP_T_MAX / 3600, 1) + ' h';
  if (s < 60) return fmt(s, 1) + ' s';
  if (s < 3600) return fmt(s / 60, 1) + ' min';
  return fmt(s / 3600, 1) + ' h';
}

// Physically admissible ranges. Without them a negative water column runs the
// Bird transmittance through a negative power and the panel prints NaN, or an
// AOD of -1 prints 1e242 W/m2, both in the same styling as a real answer and
// both under a note saying the model is inside its fitted range.
const ATM_RANGE = {
  aod500: [0, 5], precipitable_water_cm: [0, 12],
  ozone_atm_cm: [0.05, 0.7], p_surface_Pa: [30000, 110000]
};

function atmPanel(A) {
  const f = (k, label, step, unit) =>
    `<label class="f"><span>${label}${unit ? ' (' + unit + ')' : ''}</span>
      <input data-atm="${k}" type="number" step="${step}" min="${ATM_RANGE[k][0]}"
       max="${ATM_RANGE[k][1]}" value="${A[k]}"></label>`;
  return `<div class="atm">
    <h3>Atmósfera supuesta</h3>
    <select id="atm-preset">
      <option value="g173">ASTM G173-03 — caso de referencia</option>
      <option value="ebro">Ebro, 12 ago 2026 — medida (CAMS + ECMWF + WOUDC)</option>
      <option value="custom">La mía</option>
    </select>
    <div class="grid" style="margin-top:.45rem">
      ${f('aod500', 'Aerosol AOD', '0.001', '500 nm')}
      ${f('precipitable_water_cm', 'Agua precipitable', '0.01', 'cm')}
      ${f('ozone_atm_cm', 'Ozono', '0.001', 'atm-cm')}
      ${f('p_surface_Pa', 'Presión', '100', 'Pa')}
    </div>
    <p class="hint">Esto <b>no es una medida de tu punto</b>: es lo que tú
    declaras. El resultado vale bajo esa hipótesis y no fuera de ella.</p>
  </div>`;
}

function readAtm() {
  const A = Object.assign({}, Radio.tables.atmospheres.g173);
  const clamped = [];
  document.querySelectorAll('[data-atm]').forEach(i => {
    const k = i.dataset.atm, [lo, hi] = ATM_RANGE[k];
    let v = parseFloat(i.value);
    if (!Number.isFinite(v)) { i.value = A[k]; return; }
    if (v < lo || v > hi) { v = Math.min(hi, Math.max(lo, v)); clamped.push(k); i.value = v; }
    A[k] = v;
  });
  A.T_air_C = 15;
  A.ground_albedo = 0.2;
  A.clamped = clamped;
  return A;
}

// Direct-beam irradiance against time, logarithmic because it spans three or
// four decades. Contacts are ticked so the curve can be read against them.
function drawCurve(cv, R) {
  const w = cv.width = cv.clientWidth * 2, h = cv.height = 300;
  const g = cv.getContext('2d');
  const up = R.series.filter(s => !s.below && s.dni > 1e-6);
  if (up.length < 2) return;
  const t0 = R.series[0].t, t1 = R.series[R.series.length - 1].t;
  const lo = Math.log10(Math.max(1e-4, Math.min(...up.map(s => s.dni))));
  const hi = Math.log10(Math.max(...up.map(s => s.dni0)));
  const X = t => (t - t0) / (t1 - t0) * (w - 60) + 46;
  const Y = v => h - 34 - (Math.log10(Math.max(v, 10 ** lo)) - lo) / (hi - lo) * (h - 56);

  g.fillStyle = cssv('--chart-bg'); g.fillRect(0, 0, w, h);
  g.font = '18px system-ui'; g.textBaseline = 'middle';
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
    const y = Y(10 ** e);
    if (y < 10 || y > h - 30) continue;
    g.strokeStyle = cssv('--chart-grid'); g.beginPath(); g.moveTo(46, y); g.lineTo(w - 14, y); g.stroke();
    g.fillStyle = cssv('--chart-axis'); g.textAlign = 'right';
    g.fillText(e >= 0 && e <= 3 ? String(10 ** e) : '1e' + e, 42, y);
  }
  for (const [k, lbl] of [['C1', 'C1'], ['C2', 'C2'], ['C3', 'C3'], ['C4', 'C4']]) {
    if (!R.loc[k]) continue;
    const x = X(R.loc[k].t);
    if (x < 46 || x > w - 14) continue;
    g.strokeStyle = cssv('--chart-axis'); g.setLineDash([4, 5]);
    g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h - 30); g.stroke(); g.setLineDash([]);
    g.fillStyle = cssv('--chart-axis'); g.textAlign = 'center'; g.fillText(lbl, x, h - 16);
  }
  const line = (key, colour, width) => {
    g.strokeStyle = colour; g.lineWidth = width; g.beginPath();
    let started = false;
    for (const s of R.series) {
      if (s.below || !(s[key] > 0)) { started = false; continue; }
      const x = X(s.t), y = Y(s[key]);
      started ? g.lineTo(x, y) : g.moveTo(x, y);
      started = true;
    }
    g.stroke();
  };
  line('dni0', cssv('--chart-base'), 2);
  line('dni', cssv('--chart-line'), 3);
  g.fillStyle = cssv('--chart-axis'); g.textAlign = 'left';
  g.fillText('W/m² (haz directo) — gris: sin Luna', 50, 16);
}

function renderRadio(R) {
  lastR = R;
  // The visitor may have switched mode or moved the marker while this ran.
  const box = document.getElementById('radio-out');
  if (!box) return;
  const maxA = R.max_obsc;
  const amMax = R.max_obsc.airmass;
  box.innerHTML = `
    <canvas class="chart" id="curve"></canvas>
    <h3 class="sec">Irradiancia del haz directo</h3>
    <div class="kv"><span>Sin la Luna, al máximo</span><b>${fmt(maxA.dni0, 1)} W/m²</b></div>
    <div class="kv"><span>Con la Luna, al máximo</span><b>${fmt(maxA.dni, maxA.dni < 10 ? 3 : 1)} W/m²</b></div>
    <div class="kv"><span>Déficit de flujo (con oscurecimiento del limbo)</span><b>${sci(maxA.obsc_flux)}</b></div>
    <div class="kv"><span>Déficit geométrico de área</span><b>${sci(maxA.obsc_area)}</b></div>
    <div class="kv"><span>Iluminancia del haz al máximo</span><b>${fmt(maxA.lux, 0)} lx</b></div>
    <div class="kv"><span>Masa de aire al máximo</span><b>${fmt(amMax, 1)}</b></div>
    ${R.loc.duration_s > 0 ? `<p class="hint">Durante la totalidad el haz directo
    es exactamente cero, y por eso lo son también los vatios y los lux de arriba.
    Lo que se ve entonces es la corona, que este modelo <b>no incluye</b>: es del
    orden de un millón de veces más débil que la fotosfera y pide otra física.</p>` : ''}

    <h3 class="sec">Límites de exposición ocular ICNIRP 2013</h3>
    <div class="kv ${R.thermal_ratio > 1 ? 'hot' : ''}"><span>Límite térmico retiniano, peor momento</span>
      <b>${fmt(R.thermal_ratio, 2)} ×</b></div>
    <div class="kv"><span>Fijación que admite el límite fotoquímico, pupila 3 mm</span>
      <b>${secs(R.stare_3mm)}</b></div>
    <div class="kv"><span>Lo mismo con pupila dilatada a 7 mm</span><b>${secs(R.stare_7mm)}</b></div>
    <div class="kv"><span>Transmitancia que tendría que tener un filtro
      <br><span style="color:var(--dim);font-size:.72rem">manda el límite ${
        R.filter_thermal < R.filter_blue ? 'térmico' : 'fotoquímico'}; el otro pide ${
        (Math.max(R.filter_blue, R.filter_thermal) >= 1 ? '—'
          : fmt(Math.max(R.filter_blue, R.filter_thermal), 4))}</span></span>
      <b>${R.filter_needed >= 1 ? '—'
          : R.filter_needed < 0.01 ? R.filter_needed.toExponential(2)
          : fmt(R.filter_needed, 4)}</b></div>
    ${R.filter_needed >= 1 ? `<p class="hint">Bajo estas hipótesis el modelo no
    encuentra ningún factor de atenuación <em>exigido por las dos ecuaciones de
    ICNIRP</em>, cosa que ocurre con el Sol muy bajo o con una atmósfera muy
    cargada. No es una autorización: la norma acota lo que acota, el filtro
    ISO 12312-2 sigue siendo obligatorio y el modelo está extrapolando
    justamente ahí.</p>` : ''}

    <div class="assume">
      <b>Qué es esto y qué no.</b> Son las ecuaciones de ICNIRP 2013 evaluadas
      bajo las hipótesis que tú has declarado, no una recomendación de cuánto
      mirar. Un límite marca dónde empieza el riesgo conocido, no hasta dónde es
      prudente llegar. Supone un ojo sano, sin cirugía refractiva ni medicación
      fotosensibilizante, y un diámetro pupilar que no puedes medir en el campo.
      La razón térmica compara la radiancia de la fotosfera con el límite de la
      tabla 4; la radiancia <b>no baja</b> con la ocultación, lo que baja es la
      subtensa del creciente, que es lo que mueve el límite.
      <br><br>
      ${R.clamped && R.clamped.length ? `<b style="color:var(--hot)">Valores
      corregidos.</b> ${R.clamped.length} de los que escribiste caían fuera de lo
      físicamente posible y se han llevado al borde del rango antes de calcular.
      <br><br>` : ''}
      <b>Incertidumbre.</b> La masa de aire al máximo es ${fmt(amMax, 1)}.
      ${amMax > 6 ? `A partir de unas seis masas de aire los modelos empíricos de
      cielo claro están extrapolando muy lejos de donde se ajustaron: este trabajo
      encontró que a masa de aire 10,7 tres modelos publicados difieren en un
      factor tres. Toma la cifra como el orden de magnitud que es.`
      : `Dentro del rango donde el modelo está ajustado.`}
      ${R.bracket ? `<br>Sensibilidad al aerosol: con AOD entre
      ${fmt(R.bracket.lo.aod, 3)} y ${fmt(R.bracket.hi.aod, 3)} (la mitad y el doble
      del declarado), la irradiancia del haz sin la Luna en su momento más
      intenso va de ${fmt(R.bracket.hi.dni, 1)} a ${fmt(R.bracket.lo.dni, 1)} W/m²
      y la razón térmica de ${fmt(R.bracket.hi.ratio, 2)} a
      ${fmt(R.bracket.lo.ratio, 2)}. Es sensibilidad a un parámetro, no un
      presupuesto de incertidumbre.` : ''}
    </div>`;
  drawCurve(document.getElementById('curve'), R);
}

async function runRadio(btn, lat, lon) {
  btn.disabled = true;
  btn.textContent = 'Calculando en tu ordenador…';
  await Radio.load();
  if (!atmForm) {
    btn.insertAdjacentHTML('beforebegin', atmPanel(Radio.tables.atmospheres.g173));
    atmForm = true;
    document.getElementById('atm-preset').onchange = e => {
      const p = Radio.tables.atmospheres[e.target.value];
      if (!p) return;
      document.querySelectorAll('[data-atm]').forEach(i => {
        if (p[i.dataset.atm] !== undefined) i.value = p[i.dataset.atm];
      });
    };
  }
  // Yield once so the button repaints before the arithmetic blocks the thread.
  await new Promise(r => setTimeout(r, 0));
  const atm = readAtm();
  const R = Radio.run(current.elements, lat, lon, 0, atm);
  if (R) R.clamped = atm.clamped;
  if (R) {
    // Aerosol sensitivity, not a full uncertainty budget, and labelled as such.
    const at = f => {
      const r = Radio.run(current.elements, lat, lon, 0,
        Object.assign({}, atm, { aod500: atm.aod500 * f }), 80);
      // dni0 at the brightest instant, not the eclipsed value at maximum:
      // inside the umbra the latter is exactly zero and the sentence would
      // always read "de 0,00 a 0,00 W/m2", showing a null uncertainty where
      // SAFETY.md rule 4 requires a real one.
      return { aod: atm.aod500 * f, dni: r.brightest.dni0, ratio: r.thermal_ratio };
    };
    R.bracket = { lo: at(0.5), hi: at(2.0) };
    renderRadio(R);
  } else {
    const box = document.getElementById('radio-out');
    if (box) box.innerHTML = '<p class="hint">Aquí no hay eclipse sobre el horizonte.</p>';
  }
  if (!document.body.contains(btn)) return;
  btn.disabled = false;
  btn.textContent = 'Recalcular con esta atmósfera';
}
