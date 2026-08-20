// eclipse-radiometric-simulation
// Copyright (C) 2026 Ricardo Heredia Alessandrello
// SPDX-License-Identifier: AGPL-3.0-only
//
// Front end. All the arithmetic lives in besselian.js; this file only decides
// what to draw and how to word it. Two rules from SAFETY.md are load-bearing
// here and not stylistic: no result is phrased as advice, and the assumptions
// travel next to the number rather than in a footnote.
'use strict';

const t = (k, v) => Lang.t(k, v);
const TYPE = k => Lang.t('type_' + k);
const $ = s => document.querySelector(s);
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// localStorage throws outright in some privacy modes; a colour preference is
// not worth taking the page down for.
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } }
};

// Obscuration ramps, one per theme. They live here and not in the stylesheet
// because the band colours are interpolated between stops, which needs the
// numbers rather than a gradient.
//
//   light  greys: the background is light and shadow darkens, which is the
//          literal thing
//   dark   the usual cold-to-hot ramp, the one that read well on black
//   a11y   a five-stop approximation to cividis (Nunez, Anderton and Renslow
//          2018): not their tabulated values, but five points on the same
//          blue-yellow axis and with the same monotone luminance, which is
//          where the property that matters comes from -- no red/green pair
//          and no inversion of lightness. Every 10 % step is outlined on top
//          of that, so the information does not depend on the colour channel
//          at all
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

// Three base maps, and a choice has to be made because none of them wins
// outright.
//
// Streets and relief come from a third party, free of charge, and in exchange
// it stamps its mark on them: a panel with a QR code every few hundred pixels.
// It is not a loading failure and not something the browser can remove -- it
// comes inside the image itself, and removing it would breach the terms of the
// service that gives it away. Over a city it goes unnoticed; over desert or
// open sea, which is where an eclipse path spends most of its run, it is left
// alone on the screen.
//
// The third, the Natural Earth coastline, ships inside the page: no mark, no
// requests to anybody, and therefore no record of the visit anywhere. It is
// what eclipse maps have always drawn.
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
const localTime = d => d.toLocaleTimeString(Lang.locale(),
  { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pct = x => Lang.pct(x * 100);
const dms = (v, pos, neg) => `${Lang.nf(Math.abs(v), 4)}° ${v >= 0 ? pos : neg}`;

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

  // No black strips: the minimum zoom is the level at which the world still
  // covers the window, and panning is clamped to the world. It depends on the
  // element's size, so it is recomputed on resize.
  //
  // getBoundsZoom clamps its result by the current minZoom, so without
  // dropping that first it could only go up: on shrinking the window it would
  // stay stuck at the large window's minimum.
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
  legendBox.innerHTML =
    `<i style="background:${cssv('--central')}"></i>${t('leg_central')}<br>
     <i style="background:${cssv('--limit')};opacity:.55"></i>${t('leg_umbra')}<br>
     <i class="dashed" style="border-top-color:${cssv('--penumbra')}"></i>${t('leg_visibility')}<br>
     <span>${t('leg_obscuration')}</span>
     <span class="ramp" style="background:linear-gradient(90deg,${ramp})"></span>${
       Lang.pctRaw(5, 0)} → ${Lang.pctRaw(100, 0)}
     ${theme === 'a11y' ? '<br>' + t('leg_outline_note') : ''}`;
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
  // The caps only cover the black the WMS returns. With no WMS there is no
  // black to cover, and covering would hide coastline that does reach the
  // pole.
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
  streetLayer.on('tileerror', () => { if (++err >= 4 && ok === 0) fallback(t('why_noanswer')); });
  setTimeout(() => { if (ok === 0 && basemap === kind) fallback(t('why_noanswer')); }, 9000);
  if (navigator.onLine === false) fallback(t('why_offline'));
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
  n.innerHTML = t('offline_note', { why }) +
    ` <button id="retry">${t('offline_retry')}</button>`;
  document.getElementById('map').appendChild(n);
  document.getElementById('retry').onclick = () => {
    n.remove(); fellBack = false;
    const s = document.getElementById('basemap');
    if (s) s.value = 'streets';
    setBasemap('streets');
  };
}

const clearPaths = () => { pathLayers.forEach(l => map.removeLayer(l)); pathLayers = []; };

// The contours close against a frame that sits outside the world, which a
// fill hides and a stroke does not: it would come out as a dotted line pinned
// to the edge of the map. The outside stretches are cut by inserting a gap,
// which segments() then turns into separate polylines.
const clipWorld = ring => ring.map(p =>
  (Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180) ? p : null);
const landStyle = () => ({ color: cssv('--land-line'), weight: 0.7 * (+cssv('--stroke') || 1),
                           fillColor: cssv('--land-fill'), fillOpacity: 1 });

// The polar caps.
//
// The WMS has nothing above the Mercator limit: its source is Mercator, and
// Mercator ends there. What it returns in that strip is black, which is
// exactly the black band nobody wants. It gets covered with the map's own
// background, because a cap without cartography reads as what it is while the
// black read as a loading failure. The paths and the bands are drawn on top:
// the map still reaches the poles, which is what EPSG:4326 was chosen for.
//
// 84 degrees and not 85.0511. The exact limit does not do: measured on screen,
// the black the server returns reaches down to about 84.3 degrees at the
// widest zoom, because its tile grid does not fall where ours does. A degree
// of margin covers it, and what gets left out is Arctic Ocean and Antarctic
// interior, where that background has nothing to show anyway.
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
// Several are kept: going back and forth between two eclipses of the
// catalogue with a single cache slot paid the whole second again every time.
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
    // The colour comes from the middle of the band, read from the levels
    // themselves and not from assuming there are ten: with eleven,
    // i/10 + 0.05 ran off the end of the ramp and the drawing died with a
    // TypeError.
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
  // The visibility limit: outside this line the Sun is never eclipsed at any
  // instant. What used to be drawn here was the edge of the penumbra AT THE
  // INSTANT of greatest eclipse, which is a circle and not a limit: it fell
  // inside the bands and crossed them, and the legend did not say which of
  // the two it was.
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
    <span class="tag ${e.type}">${TYPE(e.type)}</span><br>
    ${t('sum_line', { utc: e.greatest_UT.slice(11, 19), gamma: Lang.nf(e.gamma, 4) })}
    ${e.magnitude ? t('sum_magnitude', { mag: Lang.nf(e.magnitude, 4) }) : ''}
    ${e.central_lat !== null
      ? '<br>' + t('sum_greatest_at', { lat: dms(e.central_lat, 'N', 'S'),
                                        lon: dms(e.central_lon, 'E', 'W') })
      : '<br>' + t('sum_noncentral', { tail: t(e.type === 'partial'
          ? 'sum_noncentral_partial' : 'sum_noncentral_umbra') })}`;
}

// --- panels -------------------------------------------------------------

// SAFETY.md forbids presenting an ocular-exposure result as advice, and forbids
// hiding uncertainty. The honest thing where the number does not exist yet is
// to say which part is computed and which is not, rather than to omit the
// section and let the geometry read as the whole answer.
function intensity(r) {
  const left = (1 - r.visible_obscuration) * 100;
  return `<div class="assume">
    <b>${t('int_h')}</b> ${t('int_left', {
      left: left < 0.01 ? '&lt; ' + Lang.pctRaw(0.01, 2) : Lang.pctRaw(left, 2) })}<br><br>
    ${t('int_radiance')}<br><br>
    ${t('int_compute')}</div>`;
}

const SAFETY = () => `<div class="danger">${t('safety_strip')}</div>`;

function contactRows(r) {
  return ['C1', 'C2', 'MAX', 'C3', 'C4'].filter(k => r[k]).map(k => `<tr>
      <td><b>${k}</b><br><span style="color:var(--dim);font-size:.72rem">${t('c_' + k)}</span></td>
      <td class="num">${utc(r[k].utc)}<br><span style="color:var(--dim);font-size:.72rem">${localTime(r[k].utc)}</span></td>
      <td class="num">${Lang.nf(r[k].alt, 1)}°${r[k].alt < 0 ? ' ⚠' : ''}<br>
        <span style="color:var(--dim);font-size:.72rem">${Lang.nf(r[k].az, 0)}°</span></td>
    </tr>`).join('');
}

// The real horizon of the marked point, once it has been asked for. It lives
// outside renderPoint because it survives changing eclipse: the relief of a
// place does not depend on which eclipse is being looked at, and downloading
// it again would cost.
let horizon = null;

const azRange = r => {
  const az = ['C1', 'C2', 'MAX', 'C3', 'C4'].filter(k => r[k]).map(k => r[k].az);
  if (!az.length) return [0, 360];
  // Unwrapped: an eclipse starting at 350 and ending at 10 does not span 340
  // degrees of sky, it spans twenty.
  const u = az.map(a => a - az[0]).map(d => ((d + 540) % 360) - 180);
  return [az[0] + Math.min(...u) - 8, az[0] + Math.max(...u) + 8];
};

// An obstacle the terrain model cannot see -- the block across the street,
// the tree line -- but which anyone standing there can. Declared by hand,
// because nobody has it mapped and whoever is looking does know.
const OBSTACLE = { h: 0, d: 0 };
const obstacleAlt = () => (OBSTACLE.h > 0 && OBSTACLE.d > 0)
  ? Math.atan2(OBSTACLE.h, OBSTACLE.d) * 180 / Math.PI : 0;

function skylineAt(az) {
  return Math.max(horizon ? Terrain.altAt(horizon, az) : 0, obstacleAlt());
}

function horizonRows(r) {
  const rows = ['C1', 'C2', 'MAX', 'C3', 'C4'].filter(k => r[k]).map(k => {
    const sun = r[k].alt, sky = skylineAt(r[k].az);
    const p = horizon.prof.reduce((best, q) =>
      Math.abs(((q.az - r[k].az + 540) % 360) - 180)
        < Math.abs(((best.az - r[k].az + 540) % 360) - 180) ? q : best, horizon.prof[0]);
    const obs = obstacleAlt() >= p.alt && obstacleAlt() > 0;
    const dist = p.distM < 1000 ? Lang.nf(p.distM, 0) + ' m' : Lang.nf(p.distM / 1000, 1) + ' km';
    return `<tr><td><b>${k}</b><br><span style="color:var(--dim);font-size:.72rem">az ${Lang.nf(r[k].az, 0)}°</span></td>
      <td class="num">${Lang.nf(sun, 1)}°</td>
      <td class="num">${Lang.nf(sky, 1)}°</td>
      <td>${sun < 0 ? t('hz_below')
        : sun < sky ? `<b>${t('hz_hidden')}</b>${obs ? t('hz_by_obstacle')
            : p.building ? t('hz_by_building')
            : p.distM ? t('hz_at_dist', { d: dist }) : ''}`
        : t('hz_in_view')}</td></tr>`;
  }).join('');
  return `<table>
      <tr><th>${t('tbl_contact')}</th><th class="num">${t('hz_sun')}</th>
          <th class="num">${t('hz_horizon')}</th><th></th></tr>
      ${rows}
    </table>`;
}

function horizonBlock(r) {
  if (!horizon) return `
    <button id="relieve" class="ghost wide">${t('hz_button')}</button>
    <p class="hint">${t('hz_intro')}</p>`;
  const b = horizon.buildings;
  return `
    <div id="hztab">${horizonRows(r)}</div>
    <div class="assume"><b>${t('hz_assume_h')}</b> ${t('hz_assume', {
        elev: Lang.nf(horizon.elevM, 0), radius: Lang.nf(horizon.radiusKm, 0),
        step: Lang.nf(horizon.mPerPx, 0), tiles: horizon.tiles, credit: horizon.credit })}
      ${b ? ' ' + t('hz_buildings_note', { total: b.total, n: b.withHeight,
              guess: b.guessed ? t('hz_buildings_guess', { n: b.guessed }) : '' }) : ''}</div>
    <div class="row">
      ${b ? '' : `<button id="edificios" class="ghost">${t('hz_buildings_btn')}</button>`}
    </div>
    <label style="margin-top:.7rem">${t('hz_obstacle_label')}</label>
    <div class="coords">
      <input id="obs-h" type="number" min="0" step="1" placeholder="${t('hz_obstacle_h')}" value="${OBSTACLE.h || ''}">
      <input id="obs-d" type="number" min="0" step="1" placeholder="${t('hz_obstacle_d')}" value="${OBSTACLE.d || ''}">
    </div>
    <p class="hint">${t('hz_obstacle_hint', {
      alt: obstacleAlt() ? t('hz_obstacle_alt', { a: Lang.nf(obstacleAlt(), 1) }) : '' })}</p>`;
}

function renderPoint(e, lat, lon) {
  const r = Bess.local(e.elements, lat, lon, horizon ? horizon.elevM : 0);
  const box = $('#result');
  if (!r || r.visible_obscuration <= 0) {
    box.innerHTML = `<h2>${t('pt_none_h')}</h2>
      <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'W')}</p>
      <p class="hint">${t(r ? 'pt_below' : 'pt_outside')}</p>`;
    return;
  }
  const isCentral = r.duration_s > 0;
  const kind = isCentral ? r.central : 'partial';
  const belowMax = r.MAX.alt < 0;
  box.innerHTML = `
    <h2>${e.id} · <span class="tag ${kind}">${TYPE(kind)}</span></h2>
    <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'W')}</p>
    <div class="big ${isCentral ? 'total' : 'partial'}">${pct(r.visible_obscuration)}</div>
    <p class="sub">${t('pt_covered', { mag: Lang.nf(r.magnitude, 4) })}</p>
    ${isCentral ? `<p><b>${hhmmss(r.duration_s)}</b> ${t('pt_phase', { kind: TYPE(r.central) })}</p>` : ''}
    ${belowMax ? `<p class="hint">${t('pt_below_max')}</p>` : ''}
    ${horizon && r.MAX.alt > 0 && r.MAX.alt < skylineAt(r.MAX.az)
      ? `<p class="hint">${t('pt_terrain_hidden', { sun: Lang.nf(r.MAX.alt, 1),
                                                    sky: Lang.nf(skylineAt(r.MAX.az), 1) })}</p>` : ''}
    <table>
      <tr><th>${t('tbl_contact')}</th><th class="num">UTC / ${TZ}</th>
          <th class="num">${t('tbl_altaz')}</th></tr>
      ${contactRows(r)}
    </table>
    <div class="assume"><b>${t('assume_h')}</b>
      ${horizon ? t('assume_elev', { m: Lang.nf(horizon.elevM, 0) }) : t('assume_sea')}
      ${t('assume_rest', { tz: TZ })}</div>
    ${horizonBlock(r)}
    ${intensity(r)}
    <button id="calc">${t('rad_button')}</button>
    <p class="hint">${t('rad_hint')}</p>
    <div id="radio-out"></div>
    ${SAFETY()}`;
  atmForm = null;
  const btn = document.getElementById('calc');
  if (btn) btn.onclick = () => runRadio(btn, lat, lon);
  wireHorizon(e, lat, lon);
}

function wireHorizon(e, lat, lon) {
  const rel = document.getElementById('relieve');
  if (rel) rel.onclick = async () => {
    rel.disabled = true;
    rel.textContent = t('hz_loading');
    try {
      const r0 = Bess.local(e.elements, lat, lon, 0);
      const [a0, a1] = azRange(r0 || {});
      horizon = await Terrain.horizon(lat, lon, { azFrom: a0, azTo: a1, stepDeg: 1 });
    } catch (err) {
      rel.disabled = false;
      rel.textContent = t('hz_failed');
      return;
    }
    renderPoint(e, lat, lon);
  };
  const ed = document.getElementById('edificios');
  if (ed) ed.onclick = async () => {
    ed.disabled = true; ed.textContent = t('hz_loading');
    try {
      horizon = Terrain.withBuildings(horizon, await Terrain.buildings(lat, lon, 400));
    } catch (err) {
      ed.disabled = false; ed.textContent = t('hz_buildings_failed');
      return;
    }
    renderPoint(e, lat, lon);
  };
  // Both fields are read together on either event: every change repaints, and
  // with one handler per field the second was left writing into a node that
  // was no longer in the document.
  const apply = () => {
    const h = document.getElementById('obs-h'), d = document.getElementById('obs-d');
    const tab = document.getElementById('hztab');
    if (!h || !d || !tab) return;
    OBSTACLE.h = +h.value || 0;
    OBSTACLE.d = +d.value || 0;
    // The table only. Repainting the whole panel destroys the field being
    // typed into: tabbing from height to distance, the first change took the
    // second field away mid-entry.
    tab.innerHTML = horizonRows(Bess.local(e.elements, lat, lon, horizon.elevM));
  };
  ['obs-h', 'obs-d'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onchange = apply;
  });
}

function renderPlace(lat, lon) {
  const rows = [];
  for (const e of CAT.eclipses) {
    const r = Bess.local(e.elements, lat, lon, horizon ? horizon.elevM : 0);
    if (!r || r.visible_obscuration < 0.001) continue;
    rows.push({ e, r });
  }
  const box = $('#result');
  box.innerHTML = `<h2>${rows.length === 1 ? t('pl_count_one')
                                              : t('pl_count_many', { n: rows.length })}</h2>
    <p class="sub">${dms(lat, 'N', 'S')} · ${dms(lon, 'E', 'W')} · 2026 – 2050</p>
    ${rows.length ? `<table>
      <tr><th>${t('pl_date')}</th><th class="num">${t('pl_covered')}</th>
          <th class="num">${t('pl_duration')}</th><th class="num">${t('pl_alt')}</th></tr>
      ${rows.map(({ e, r }, i) => {
        const central = r.duration_s > 0;
        const kind = central ? r.central : 'partial';
        return `<tr class="clickable" data-i="${i}">
          <td>${e.id}<br><span class="tag ${kind}">${TYPE(kind)}</span></td>
          <td class="num">${pct(r.visible_obscuration)}</td>
          <td class="num">${central ? hhmmss(r.duration_s) : '—'}</td>
          <td class="num">${Lang.nf((r.visible_max || r.MAX).alt, 0)}°</td></tr>`;
      }).join('')}</table>`
      : `<p class="hint">${t('pl_none')}</p>`}
    <div class="assume">${t('pl_assume')}</div>
    ${rows.length ? SAFETY() : ''}`;
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
  // The relief belongs to the point, not to the session: moving the marker
  // invalidates it. The tiles stay in the module's cache, so coming back to
  // the same place downloads nothing again.
  if (!lastPoint || Math.abs(lastPoint[0] - lat) > 1e-6 || Math.abs(lastPoint[1] - lon) > 1e-6) {
    horizon = null;
    OBSTACLE.h = OBSTACLE.d = 0;
  }
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

// Language. The page is hydrated before anything else runs, so the first paint
// is already in the right language rather than in English for a frame.
const langSel = $('#lang');
Lang.set(Lang.pick());
langSel.innerHTML = Object.entries(Lang.names)
  .map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
langSel.value = Lang.lang;
Lang.apply();
document.title = Lang.t('app_title') + ' · ' + Lang.t('label_eclipse');

function relabel() {
  Lang.apply();
  document.title = Lang.t('app_title') + ' · ' + Lang.t('label_eclipse');
  const sel = $('#pick');
  if (CAT && sel) {
    const keep = sel.value;
    sel.innerHTML = CAT.eclipses.map(e =>
      `<option value="${e.id}">${e.id} — ${TYPE(e.type)}</option>`).join('');
    sel.value = keep;
  }
  renderLegend();
  if (mode === 'eclipse' && current) drawEclipse(current);
  if (lastPoint) setPoint(lastPoint[0], lastPoint[1]);
}

langSel.onchange = () => { Lang.set(langSel.value); relabel(); };

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
    `<option value="${e.id}">${e.id} — ${TYPE(e.type)}</option>`).join('');
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
    $('#result').innerHTML = `<h2>${t('err_coords_h')}</h2>
      <p class="hint">${t('err_coords_p')}</p>`;
    if (marker) { map.removeLayer(marker); marker = null; }
    lastPoint = null;
    return;
  }
  setPoint(la, ((lo + 180) % 360 + 360) % 360 - 180);
  map.setView([la, lo], Math.max(map.getZoom(), 3));
};
$('#geo').onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition(
  p => { setPoint(p.coords.latitude, p.coords.longitude); map.setView([p.coords.latitude, p.coords.longitude], 5); },
  () => $('#result').innerHTML = `<p class="hint">${t('err_geo')}</p>`);

// --- radiometry on demand -------------------------------------------------
//
// Nothing below runs until the visitor asks for it. It is the expensive half
// of the page (a couple of hundred milliseconds and an 8 kB table), it is
// useless without an atmosphere the visitor has to choose, and precomputing it
// for every point of the planet and every eclipse would be absurd: the whole
// point is that the model is cheap enough to evaluate where you are standing.

let atmForm = null;

const fmt = (v, d = 1) => Lang.nf(v, d);
// Below a hundredth of a per cent the fixed notation is all zeros, so the
// exponent is written out. The mantissa still goes through the locale, which
// is what puts the decimal comma where the language wants it.
const sci = v => v >= 0.01 ? Lang.pctRaw(v * 100, 2)
  : Lang.pctRaw(0, 0).replace(/^0/, (v * 100).toExponential(1)
      .replace(/^([\d.]+)e/, (m, m1) => Lang.nf(parseFloat(m1), 1) + '·10^'));

// ICNIRP's long-exposure branch is stated for t < 30 000 s and says nothing
// beyond it. "No limit" would therefore be wrong twice over: it overreaches
// the standard, and SAFETY.md forbids any answer that reads as permission.
const ICNIRP_T_MAX = 30000;
function secs(s) {
  if (!isFinite(s) || s >= ICNIRP_T_MAX)
    return t('rad_no_bound', { h: fmt(ICNIRP_T_MAX / 3600, 1) });
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
    <h3>${t('atm_h')}</h3>
    <select id="atm-preset">
      <option value="g173">${t('atm_g173')}</option>
      <option value="ebro">${t('atm_ebro')}</option>
      <option value="custom">${t('atm_custom')}</option>
    </select>
    <div class="grid" style="margin-top:.45rem">
      ${f('aod500', t('atm_aod'), '0.001', '500 nm')}
      ${f('precipitable_water_cm', t('atm_water'), '0.01', 'cm')}
      ${f('ozone_atm_cm', t('atm_ozone'), '0.001', 'atm-cm')}
      ${f('p_surface_Pa', t('atm_pressure'), '100', 'Pa')}
    </div>
    <p class="hint">${t('atm_hint')}</p>
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
  g.fillText(t('rad_chart_label'), 50, 16);
}

function renderRadio(R) {
  lastR = R;
  // The visitor may have switched mode or moved the marker while this ran.
  const box = document.getElementById('radio-out');
  if (!box) return;
  const maxA = R.max_obsc;
  const amMax = R.max_obsc.airmass;
  const other = Math.max(R.filter_blue, R.filter_thermal);
  box.innerHTML = `
    <canvas class="chart" id="curve"></canvas>
    <h3 class="sec">${t('rad_h_beam')}</h3>
    <div class="kv"><span>${t('rad_no_moon')}</span><b>${fmt(maxA.dni0, 1)} W/m²</b></div>
    <div class="kv"><span>${t('rad_with_moon')}</span><b>${fmt(maxA.dni, maxA.dni < 10 ? 3 : 1)} W/m²</b></div>
    <div class="kv"><span>${t('rad_flux_deficit')}</span><b>${sci(maxA.obsc_flux)}</b></div>
    <div class="kv"><span>${t('rad_area_deficit')}</span><b>${sci(maxA.obsc_area)}</b></div>
    <div class="kv"><span>${t('rad_lux')}</span><b>${fmt(maxA.lux, 0)} lx</b></div>
    <div class="kv"><span>${t('rad_airmass')}</span><b>${fmt(amMax, 1)}</b></div>
    ${R.loc.duration_s > 0 ? `<p class="hint">${t('rad_totality_note')}</p>` : ''}

    <h3 class="sec">${t('rad_h_icnirp')}</h3>
    <div class="kv ${R.thermal_ratio > 1 ? 'hot' : ''}"><span>${t('rad_thermal')}</span>
      <b>${fmt(R.thermal_ratio, 2)} ×</b></div>
    <div class="kv"><span>${t('rad_stare3')}</span><b>${secs(R.stare_3mm)}</b></div>
    <div class="kv"><span>${t('rad_stare7')}</span><b>${secs(R.stare_7mm)}</b></div>
    <div class="kv"><span>${t('rad_filter')}
      <br><span style="color:var(--dim);font-size:.72rem">${t('rad_filter_which', {
        which: t(R.filter_thermal < R.filter_blue ? 'rad_thermal_word' : 'rad_photo_word'),
        other: other >= 1 ? '—' : fmt(other, 4) })}</span></span>
      <b>${R.filter_needed >= 1 ? '—'
          : R.filter_needed < 0.01 ? R.filter_needed.toExponential(2)
          : fmt(R.filter_needed, 4)}</b></div>
    ${R.filter_needed >= 1 ? `<p class="hint">${t('rad_nofilter')}</p>` : ''}

    <div class="assume">
      <b>${t('rad_what_h')}</b> ${t('rad_what')}
      <br><br>
      ${R.clamped && R.clamped.length
        ? t('rad_clamped', { n: R.clamped.length }) + '<br><br>' : ''}
      <b>${t('rad_unc_h')}</b> ${t('rad_unc_am', { am: fmt(amMax, 1) })}
      ${t(amMax > 6 ? 'rad_unc_far' : 'rad_unc_near')}
      ${R.bracket ? '<br>' + t('rad_bracket', {
        lo: fmt(R.bracket.lo.aod, 3), hi: fmt(R.bracket.hi.aod, 3),
        dhi: fmt(R.bracket.hi.dni, 1), dlo: fmt(R.bracket.lo.dni, 1),
        rhi: fmt(R.bracket.hi.ratio, 2), rlo: fmt(R.bracket.lo.ratio, 2) }) : ''}
    </div>`;
  drawCurve(document.getElementById('curve'), R);
}

async function runRadio(btn, lat, lon) {
  btn.disabled = true;
  btn.textContent = t('rad_button_busy');
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
    if (box) box.innerHTML = `<p class="hint">${t('rad_no_eclipse')}</p>`;
  }
  if (!document.body.contains(btn)) return;
  btn.disabled = false;
  btn.textContent = t('atm_recompute');
}
