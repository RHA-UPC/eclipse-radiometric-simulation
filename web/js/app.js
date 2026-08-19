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

let CAT = null, map, landLayer, borderLayer, pathLayers = [], marker = null, shade = null;
let current = null, mode = 'eclipse', lastPoint = null;
let basemap = 'streets', streetLayer = null, worldLoad = null, fellBack = false;

// The street basemap is the default and there is no switch for it. This is
// meant to be deployed on the web, where there is a connection; offering the
// choice made the visitor decide something they have no way to judge. The
// offline outline stays as a FALLBACK and loads only when the map server turns
// out to be unreachable, which keeps 1.2 MB of coastline off the normal path.
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
const WMS_URL = 'https://ows.terrestris.de/osm/service';

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
  map = L.map('map', { crs: L.CRS.EPSG4326, minZoom: 1, maxZoom: 15,
                       worldCopyJump: false, attributionControl: true })
         .setView([25, 0], 2);
  map.attributionControl.setPrefix('');

  // Stacking order is fixed with panes, not with bringToBack(). An image
  // overlay and an SVG renderer are siblings in the same pane and reordering
  // one does nothing to the other, so the raster kept landing on the wrong
  // side of the coastlines.
  for (const [name, z] of [['land', 340], ['shade', 350]]) {
    map.createPane(name);
    Object.assign(map.getPane(name).style, { zIndex: z, pointerEvents: 'none' });
  }
  addStreets();
  map.on('zoomend', () => { if (shade) shade.setOpacity(shadeOpacity()); });
  map.on('click', e => {
    const lon = ((e.latlng.lng + 180) % 360 + 360) % 360 - 180;
    setPoint(e.latlng.lat, lon);
  });

  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const d = L.DomUtil.create('div', 'legend');
    d.innerHTML = `<i style="background:#ff3b30"></i>línea central<br>
      <i style="background:#ff3b30;opacity:.55"></i>límites de la umbra<br>
      <i style="background:#7d8899;border-top:1px dashed #7d8899"></i>borde de la penumbra<br>
      <span>obscuración máxima</span><span class="ramp"></span>0 → 100 %`;
    return d;
  };
  legend.addTo(map);
}

function addStreets() {
  streetLayer = L.tileLayer.wms(WMS_URL, {
    layers: 'OSM-WMS', format: 'image/png', version: '1.1.1', transparent: false,
    pane: 'land', maxZoom: 15,
    attribution: '&copy; <a href="https://www.terrestris.de">terrestris</a>, ' +
      'datos de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> (ODbL)'
  }).addTo(map);

  // Falling back needs evidence, not a single failed request. A handful of
  // errors with nothing loaded means the server is unreachable; one error while
  // other tiles arrive is just one tile. The timeout covers the case that hangs
  // instead of failing, which is the one a tileerror handler never sees.
  let ok = 0, err = 0;
  streetLayer.on('tileload', () => { ok++; });
  streetLayer.on('tileerror', () => { if (++err >= 4 && ok === 0) fallback('no responde'); });
  setTimeout(() => { if (ok === 0) fallback('no responde'); }, 9000);
  if (navigator.onLine === false) fallback('sin conexión');
  window.addEventListener('offline', () => fallback('sin conexión'));
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
  if (worldLoad) return worldLoad;
  worldLoad = fetch('data/world.geojson').then(r => r.json()).then(g => {
    landLayer = L.geoJSON(g, {
      pane: 'land', interactive: false,
      style: { color: '#5a6d88', weight: 0.7, fillColor: '#1b2635', fillOpacity: 1 }
    }).addTo(map);
    borderLayer = null;
    if (shade) shade.setOpacity(shadeOpacity());
  }).catch(() => { worldLoad = null; });
  return worldLoad;
}

function fallback(why) {
  if (fellBack) return;
  fellBack = true;
  basemap = 'offline';
  if (streetLayer) { map.removeLayer(streetLayer); streetLayer = null; }
  const n = document.createElement('div');
  n.className = 'offline-note';
  n.innerHTML = `Mapa de calles no disponible (${why}). Se dibujan las costas
    de Natural Earth, que van en la propia página. Las circunstancias del
    eclipse se calculan igual: no dependen del fondo.
    <button id="retry">Reintentar</button>`;
  document.getElementById('map').appendChild(n);
  document.getElementById('retry').onclick = () => location.reload();
  loadWorld();
}

const clearPaths = () => { pathLayers.forEach(l => map.removeLayer(l)); pathLayers = []; };


// Obscuration raster. The grid is equirectangular and so is the map, so the
// browser's own image smoothing is the interpolation; no contouring needed.
function drawShade(B) {
  if (shade) { map.removeLayer(shade); shade = null; }
  // The grid is equirectangular and so is the map, so it goes down as it is.
  // That is the whole reason the street basemap is a WMS in EPSG:4326 rather
  // than the usual Mercator tiles: an image overlay stretches linearly in
  // projected space, and in Mercator this raster would have to be resampled
  // row by row or it slides tens of degrees at high latitude.
  const g = Bess.obscurationGrid(B);
  const cv = document.createElement('canvas');
  cv.width = g.nlon; cv.height = g.nlat;
  const img = cv.getContext('2d').createImageData(g.nlon, g.nlat);
  const stops = [[27, 58, 107], [63, 95, 174], [139, 95, 191], [209, 73, 91], [255, 107, 74]];
  for (let k = 0; k < g.grid.length; k++) {
    // Quantised to ten steps. A continuous ramp saturates: over a continent
    // where everything lies between 90 and 100 %, every pixel is the same red
    // and the raster stops carrying information. Steps read as contours.
    const raw = g.grid[k];
    if (raw <= 0.001) continue;
    const v = Math.min(0.999, Math.floor(raw * 10) / 10 + 0.05);
    const f = v * (stops.length - 1);
    const i = Math.floor(f), w = f - i;
    const c = stops[i].map((s, j) => s * (1 - w) + stops[i + 1][j] * w);
    img.data.set([c[0], c[1], c[2], 55 + 175 * v], k * 4);
  }
  cv.getContext('2d').putImageData(img, 0, 0);
  shade = L.imageOverlay(cv.toDataURL(), [[-90, -180], [90, 180]],
    { pane: 'shade', opacity: shadeOpacity() }).addTo(map);
}

// The raster answers "where is it visible at all", which is a world-scale
// question. Zoomed in on a path it only hides the coastline, so it fades.
const shadeOpacity = () => {
  const z = map.getZoom();
  if (basemap === 'streets') return z >= 8 ? 0.12 : z >= 5 ? 0.28 : 0.55;
  return z >= 5 ? 0.22 : 0.62;
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
  drawShade(B);
  for (const seg of Bess.penumbraOutline(B, e.greatest_h))
    pathLayers.push(L.polyline(segments(seg), { color: '#7d8899', weight: 1,
      dashArray: '4 4', interactive: false }).addTo(map));
  // A non-central total or annular eclipse has an umbral band that this code
  // cannot anchor, because every path curve is built outwards from the axis
  // intersection and the axis misses the Earth. The summary says so rather
  // than the map quietly implying there is nothing there.
  if (e.type !== 'partial' && e.central) {
    const lim = Bess.limits(B, 'l2');
    for (const side of lim.edges)
      pathLayers.push(L.polyline(segments(side), { color: '#ff3b30', weight: 1.2,
        opacity: 0.55, interactive: false }).addTo(map));
    pathLayers.push(L.polyline(segments(Bess.centralLine(B)), { color: '#ff3b30',
      weight: 2, interactive: false }).addTo(map));
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
  marker = L.circleMarker([lat, lon], { radius: 6, color: '#ffffff', weight: 2,
    fillColor: '#6ea8fe', fillOpacity: 1 }).addTo(map);
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
  if (m === 'lugar') { clearPaths(); if (shade) { map.removeLayer(shade); shade = null; } }
  else if (current) drawEclipse(current);
  if (lastPoint) setPoint(lastPoint[0], lastPoint[1]);
  else $('#result').innerHTML = '';
}

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

  g.fillStyle = '#0a0f16'; g.fillRect(0, 0, w, h);
  g.font = '18px system-ui'; g.textBaseline = 'middle';
  for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
    const y = Y(10 ** e);
    if (y < 10 || y > h - 30) continue;
    g.strokeStyle = '#1e2734'; g.beginPath(); g.moveTo(46, y); g.lineTo(w - 14, y); g.stroke();
    g.fillStyle = '#6b7a8d'; g.textAlign = 'right';
    g.fillText(e >= 0 && e <= 3 ? String(10 ** e) : '1e' + e, 42, y);
  }
  for (const [k, lbl] of [['C1', 'C1'], ['C2', 'C2'], ['C3', 'C3'], ['C4', 'C4']]) {
    if (!R.loc[k]) continue;
    const x = X(R.loc[k].t);
    if (x < 46 || x > w - 14) continue;
    g.strokeStyle = '#3a4657'; g.setLineDash([4, 5]);
    g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h - 30); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#6b7a8d'; g.textAlign = 'center'; g.fillText(lbl, x, h - 16);
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
  line('dni0', '#4b5c73', 2);
  line('dni', '#ff6b4a', 3);
  g.fillStyle = '#8b98a8'; g.textAlign = 'left';
  g.fillText('W/m² (haz directo) — gris: sin Luna', 50, 16);
}

function renderRadio(R) {
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
