/*
 * eclipse-radiometric-simulation — the visibility profile
 * Copyright (C) 2026 Ricardo Heredia Alessandrello
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Split off app.js and fetched with terrain.js rather than before it. Nothing
 * in here can run until the elevation model has been downloaded, which is a
 * button nobody has to press, so putting it on the critical path would have
 * charged every visitor for a feature most of them never open.
 *
 * A classic script, like the rest: it shares the page's global scope and
 * writes `lastProf`, which app.js declares and repaints from on a theme
 * change.
 */
/* --- visibility profile ---------------------------------------------------
   The table answers the question; this shows the working. A section of the
   ground from the marked point out along the azimuth of the Sun at maximum,
   and the ray that has to clear it.

   The terrain is drawn as real altitudes and the curvature drop is added to
   the ray rather than taken off the ground. It is the same comparison the
   verdict makes -- the one in Terrain.ridge -- and it leaves the profile
   readable as a relief instead of as a bowl. */
async function drawProfile(e, lat, lon) {
  const box = document.getElementById('profbox');
  if (!box || !horizon) return;
  const r = Bess.local(e.elements, lat, lon, horizon.elevM);
  if (!r || !r.MAX) { box.innerHTML = ''; lastProf = null; return; }
  const az = r.MAX.az, alt = r.MAX.alt;
  const P = await Terrain.slice(lat, lon, az, horizon.radiusKm * 1000);
  // The panel may have been repainted while the slice ran.
  const live = document.getElementById('profbox');
  if (!live) return;

  /* The buildings that stand on this bearing, with the same angular width
     Terrain.withBuildings gives them. Their tops are drawn at the height the
     verdict uses -- above the observer's own ground, not above the ground
     under the building -- so the chart cannot disagree with the table it sits
     under. Inside four hundred metres the two differ by the slope, and that is
     said in the caption rather than quietly corrected here. */
  const walls = ((horizon.buildings && horizon.buildings.walls) || []).filter(q => {
    const span = ((q.az1 - q.az0 + 540) % 360) - 180;
    return Math.abs(((az - (q.az0 + span / 2) + 540) % 360) - 180) <= Math.abs(span) / 2 + .5;
  });
  const sky = skylineAt(az);
  /* What is doing the blocking, and how far off. The chart has to frame that
     feature or it argues with its own caption: over a valley six kilometres
     long, a rise three hundred metres away that covers the Sun is a pixel
     wide and the ray looks clear the whole way. */
  const near = horizon.prof.reduce((best, q) =>
    Math.abs(((q.az - az + 540) % 360) - 180)
      < Math.abs(((best.az - az + 540) % 360) - 180) ? q : best, horizon.prof[0]);
  P.block = alt >= 0 && alt < sky
    ? { d: Math.max(30, obstacleAlt() > near.alt ? OBSTACLE.d : near.distM), alt: sky }
    : null;
  P.sunAlt = alt; P.sunAz = az; P.walls = walls;
  // The declared obstacle is drawn too. It moves the verdict the caption
  // prints, and a caption saying the Sun is covered over a chart where the ray
  // clears everything is the page arguing with itself.
  P.obstacle = (OBSTACLE.h > 0 && OBSTACLE.d > 0) ? { h: OBSTACLE.h, d: OBSTACLE.d } : null;
  const cap = alt < 0 ? t('prof_below')
    : alt < sky ? t('prof_hidden', { alt: Lang.nf(alt, 1), sky: Lang.nf(sky, 1) })
    : t('prof_visible', { alt: Lang.nf(alt, 1) });
  const key = ['terrain', 'obs', 'sun', 'sight']
    .concat(walls.length ? ['build'] : []).concat(P.obstacle ? ['obst'] : [])
    .concat(P.block ? ['block'] : []);
  live.innerHTML = `<h3 class="prof-h">${t('prof_h')}</h3>
    <p class="hint">${cap}</p>
    <canvas class="chart tall" id="profile" role="img"
            aria-label="${t('prof_h')}. ${cap.replace(/"/g, '')}"></canvas>
    <ul class="legend-key">${key.map(k =>
      `<li><i class="sw sw-${k}"></i>${t('prof_lg_' + k)}</li>`).join('')}</ul>
    <p class="hint prof-note">${t('prof_note', { az: Lang.nf(az, 1),
                                       km: Lang.nf(P.reachM / 1000, 0) })}</p>`;
  lastProf = P;
  paintProfile(document.getElementById('profile'), P);
  if (P.viewM < P.reachM - 1)
    live.querySelector('.prof-note').insertAdjacentHTML('beforeend',
      ' ' + t(P.block ? 'prof_note_frame' : 'prof_note_cut',
              { km: Lang.nf(P.viewM / 1000, 1) }));
}

// A grid step a person would have chosen: 1, 2 or 5 times a power of ten.
const niceStep = v => {
  const e = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9))), m = v / e;
  return e * (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10);
};

function paintProfile(cv, P) {
  if (!cv) return;
  const w = cv.width = cv.clientWidth * 2, h = cv.height = 380;
  const g = cv.getContext('2d');
  const sight = d => P.h0 + d * Math.tan(P.sunAlt * D2R) + d * d / (2 * P.rEff);

  /* Where to stop drawing. The check runs the whole section, but a ray at six
     degrees is two and a half kilometres up by the far end, and a chart scaled
     to that leaves the relief as a line along the floor -- the one thing it
     exists to show. Past the point where the ray clears the highest ground in
     the section nothing further can block it, so that is where the picture
     ends. The number is in the caption; the verdict above it still comes from
     the whole thing. */
  // Buildings count as ground for this: a section framed on a hill it clears
  // in three hundred metres left Manhattan's towers as a smudge on the axis.
  const maxE = Math.max(...P.pts.map(q => q.elev),
                        ...P.walls.map(q => P.h0 + q.heightM),
                        P.obstacle ? P.h0 + P.obstacle.h : -Infinity);
  let view = P.reachM;
  if (P.block) {
    // Framed on whatever covers the Sun, which is the whole subject.
    view = Math.min(P.reachM, Math.max(1500, P.block.d * 2.5));
  } else if (P.sunAlt > 0) {
    for (const q of P.pts)
      if (sight(q.d) > maxE) { view = Math.min(P.reachM, Math.max(600, q.d * 1.2)); break; }
  } else {
    // A Sun under the horizon sends the ray down instead of up, and the far
    // end of it is further below the ground than the ground is tall. The
    // verdict is already made; the picture only has to show the near ground.
    view = Math.min(P.reachM, 5000);
  }
  P.viewM = view;

  const tops = P.walls.map(q => P.h0 + q.heightM);
  const vals = P.pts.filter(q => q.d <= view).map(q => q.elev)
    .concat([P.h0, sight(0), sight(view)], tops,
            P.obstacle ? [P.h0 + P.obstacle.h] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 60) { const m = (hi + lo) / 2; lo = m - 30; hi = m + 30; }
  const pad = (hi - lo) * .1; lo -= pad; hi += pad;
  const L = 76, Rr = 18, T = 16, B = 46;
  const X = d => L + d / view * (w - L - Rr);
  const Y = v => h - B - (v - lo) / (hi - lo) * (h - T - B);

  g.fillStyle = cssv('--chart-bg'); g.fillRect(0, 0, w, h);
  g.font = '18px system-ui'; g.textBaseline = 'middle';

  const stepY = niceStep((hi - lo) / 4);
  for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) {
    const y = Y(v);
    g.strokeStyle = cssv('--chart-grid'); g.lineWidth = 1;
    g.beginPath(); g.moveTo(L, y); g.lineTo(w - Rr, y); g.stroke();
    g.fillStyle = cssv('--chart-axis'); g.textAlign = 'right';
    g.fillText(Lang.nf(v, 0), L - 8, y);
  }
  // One unit for the whole axis: a row reading 0, 500, 1 km, 2 km is three
  // different things in four labels, and the last of them was 1.5 rounded.
  const stepX = niceStep(view / 4);
  const km = view >= 3000;
  for (let d = 0; d <= view + 1; d += stepX) {
    const x = X(d), edge = x > w - Rr - 40;
    g.textAlign = edge ? 'right' : 'center';
    g.fillStyle = cssv('--chart-axis');
    g.fillText(km ? Lang.nf(d / 1000, d % 1000 ? 1 : 0) + ' km' : Lang.nf(d, 0) + ' m',
               edge ? w - Rr : x, h - 26);
  }
  g.strokeStyle = cssv('--chart-axis'); g.lineWidth = 2;
  g.beginPath(); g.moveTo(L, T); g.lineTo(L, h - B); g.lineTo(w - Rr, h - B); g.stroke();
  g.save();
  g.translate(22, (T + h - B) / 2); g.rotate(-Math.PI / 2);
  g.textAlign = 'center'; g.fillStyle = cssv('--chart-axis');
  g.fillText(t('prof_axis_alt'), 0, 0);
  g.restore();

  // Ground: filled to the floor so the ridge reads as solid rather than as one
  // more line among four.
  const seen = P.pts.filter(q => q.d <= view);
  g.beginPath(); g.moveTo(X(0), Y(seen[0].elev));
  for (const q of seen) g.lineTo(X(q.d), Y(q.elev));
  g.lineTo(X(seen[seen.length - 1].d), h - B); g.lineTo(X(0), h - B); g.closePath();
  g.fillStyle = cssv('--chart-base'); g.globalAlpha = .28; g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.moveTo(X(0), Y(seen[0].elev));
  for (const q of seen) g.lineTo(X(q.d), Y(q.elev));
  g.strokeStyle = cssv('--chart-line'); g.lineWidth = 3; g.stroke();

  for (const q of P.walls) {
    const x = X(q.distM), base = Math.min(h - B, Y(elevAt(P, q.distM)));
    const top = Y(P.h0 + q.heightM);
    if (top >= base) continue;
    g.fillStyle = cssv('--violet'); g.globalAlpha = .75;
    g.fillRect(x - 3, top, 6, base - top); g.globalAlpha = 1;
  }

  if (P.block && P.block.d <= view) {
    const x = X(P.block.d);
    g.strokeStyle = cssv('--hot'); g.lineWidth = 2; g.setLineDash([4, 5]);
    g.beginPath(); g.moveTo(x, T); g.lineTo(x, h - B); g.stroke(); g.setLineDash([]);
  }

  if (P.obstacle) {
    // Metres from the point, against a section tens of kilometres long: it
    // lands on the axis and is drawn at a minimum width so that it is there to
    // be seen at all.
    const x = X(P.obstacle.d), base = Y(elevAt(P, P.obstacle.d));
    g.fillStyle = cssv('--hot');
    g.fillRect(x - 2, Math.min(base, Y(P.h0 + P.obstacle.h)), 5,
               Math.abs(base - Y(P.h0 + P.obstacle.h)));
  }

  g.strokeStyle = cssv('--warm'); g.lineWidth = 3; g.setLineDash([9, 7]);
  g.beginPath(); g.moveTo(X(0), Y(sight(0)));
  g.lineTo(X(view), Y(sight(view))); g.stroke(); g.setLineDash([]);

  const dot = (x, y, fill) => {
    g.beginPath(); g.arc(x, y, 8, 0, 2 * Math.PI);
    g.fillStyle = fill; g.fill();
    g.strokeStyle = cssv('--chart-bg'); g.lineWidth = 2; g.stroke();
  };
  dot(X(0), Y(P.h0), cssv('--marker-fill'));
  dot(X(view), Y(sight(view)), cssv('--warm'));
}

// The ground under a distance, by the same linear reading the chart draws.
function elevAt(P, d) {
  const i = Math.max(0, Math.min(P.pts.length - 2, Math.floor(d / P.stepM)));
  const f = (d - P.pts[i].d) / P.stepM;
  return P.pts[i].elev * (1 - f) + P.pts[i + 1].elev * f;
}
