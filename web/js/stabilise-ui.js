/*
 * eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
 *
 * The driver for the in-browser stabiliser. Two passes over the video, the
 * same two the command-line tool makes:
 *
 *   measure   play it through once and fit the solar limb on every frame the
 *             browser hands over, building a track of (time, centre)
 *   render    play it again, translate each frame by what the track says, and
 *             record the canvas
 *
 * Playing rather than seeking, in both passes, and that is the whole trick for
 * getting the timing right. Seeking frame by frame is exact but takes tens of
 * milliseconds each, and a recorder fed at that rate stamps the result in wall
 * clock time and produces a video that plays three times too slow. Played at
 * 1x, the frames arrive at their own cadence and the recording keeps it.
 *
 * The file is opened with the File API and never uploaded. There is no server
 * on the other end of this page to upload it to.
 */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const t = (k, v) => Lang.t(k, v);
  const state = { file: null, url: null, track: null, out: null, busy: false };

  const say = (msg, pct) => {
    $('#status').textContent = msg;
    const bar = $('#bar');
    bar.hidden = pct === undefined;
    if (pct !== undefined) bar.value = pct;
  };

  // Everything downstream works on a frame no wider than this. A limb fit does
  // not get better with more pixels -- the limb is the same arc -- and it does
  // get slower, quadratically, which decides whether the measuring pass keeps
  // up with playback or drops half the frames.
  const WORK_W = 960;

  function frameGrabber(video) {
    const s = Math.min(1, WORK_W / video.videoWidth);
    const w = Math.max(2, Math.round(video.videoWidth * s));
    const h = Math.max(2, Math.round(video.videoHeight * s));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    return {
      w, h, scale: s,
      grab() {
        g.drawImage(video, 0, 0, w, h);
        return Stab.grey(g.getImageData(0, 0, w, h).data, w, h);
      }
    };
  }

  /* ---- pass one: the track --------------------------------------------- */

  async function measure(video, preview) {
    const gr = frameGrabber(video);
    const samples = [];
    let r = null, prev = null, lastT = -1e9, lost = 0;
    const pg = preview.getContext('2d');
    preview.width = gr.w; preview.height = gr.h;

    await new Promise((resolve, reject) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const step = (now, meta) => {
        if (video.ended || state.cancel) return finish();
        const g = gr.grab();
        if (r === null) r = Stab.bootstrap(g, gr.w, gr.h);
        if (r !== null) {
          const gap = meta.mediaTime - lastT;
          // A centre that moves further than the budget for the elapsed time is
          // lock loss, not motion. The budget scales with the gap so a fit
          // after a few dropped frames is not rejected merely for having had
          // time to move.
          const stale = gap > Stab.K.REACQUIRE / 25;
          const seed = stale ? null : prev;
          const res = Stab.locate(g, gr.w, gr.h, r, seed, 2);
          const jump = res && prev
            ? Math.hypot(res.cx - prev[0], res.cy - prev[1]) > Stab.K.JUMP_MAX * Math.max(1, gap * 25)
            : false;
          if (res && !jump) {
            // The centre is stored in SOURCE pixels, which is where it will
            // be drawn; the radius too, because that is what gets shown.
            // Inside the loop everything stays in working pixels.
            samples.push({ t: meta.mediaTime, cx: res.cx / gr.scale, cy: res.cy / gr.scale,
                           r: res.r / gr.scale, regime: res.regime });
            prev = [res.cx, res.cy]; r = res.r; lastT = meta.mediaTime;
          } else lost++;
        }
        pg.drawImage(video, 0, 0, gr.w, gr.h);
        const last = samples[samples.length - 1];
        if (last) {
          pg.strokeStyle = '#25c26a'; pg.lineWidth = 2;
          pg.beginPath();
          pg.arc(last.cx * gr.scale, last.cy * gr.scale, last.r * gr.scale, 0, 2 * Math.PI);
          pg.stroke();
        }
        say(t('st_measuring', { n: samples.length, lost }),
            video.duration ? meta.mediaTime / video.duration : undefined);
        video.requestVideoFrameCallback(step);
      };
      video.onended = finish;
      video.onerror = () => reject(new Error(t('st_err_read')));
      video.currentTime = 0;
      video.muted = true;
      video.playbackRate = 1;
      video.requestVideoFrameCallback(step);
      video.play().catch(reject);
    });
    video.onended = null;
    return samples;
  }

  /* ---- pass two: the render -------------------------------------------- */

  // The track is a set of samples at whatever instants the first pass managed
  // to fit; the render needs a centre at an arbitrary instant, so it reads
  // between them. Outside the measured range it holds the nearest end, which
  // is the honest answer: there is no evidence out there.
  function centreAt(track, t) {
    const n = track.length;
    if (!n) return null;
    if (t <= track[0].t) return track[0];
    if (t >= track[n - 1].t) return track[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (track[m].t <= t) lo = m; else hi = m; }
    const a = track[lo], b = track[hi], f = (t - a.t) / Math.max(1e-9, b.t - a.t);
    return { cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f };
  }

  function mimeType() {
    for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8',
                     'video/webm', 'video/mp4'])
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return null;
  }

  async function render(video, track, win) {
    const cv = document.createElement('canvas');
    cv.width = win.w; cv.height = win.h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    const mime = mimeType();
    if (!mime) throw new Error(t('st_err_rec'));
    const stream = cv.captureStream(0);
    const [tr] = stream.getVideoTracks();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });
    rec.start();

    await new Promise((resolve, reject) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const step = (now, meta) => {
        if (video.ended || state.cancel) return finish();
        const c = centreAt(track, meta.mediaTime);
        g.fillStyle = '#000';
        g.fillRect(0, 0, win.w, win.h);
        if (c) g.drawImage(video, win.tx - c.cx, win.ty - c.cy);
        if (tr.requestFrame) tr.requestFrame();
        say(t('st_recording'),
            video.duration ? meta.mediaTime / video.duration : undefined);
        video.requestVideoFrameCallback(step);
      };
      video.onended = finish;
      video.onerror = () => reject(new Error(t('st_err_read')));
      video.currentTime = 0;
      video.playbackRate = 1;
      video.requestVideoFrameCallback(step);
      video.play().catch(reject);
    });
    video.onended = null;
    rec.stop();
    await stopped;
    return new Blob(chunks, { type: mime });
  }

  /* ---- wiring ---------------------------------------------------------- */

  function pick(file) {
    if (!file) return;
    if (state.url) URL.revokeObjectURL(state.url);
    state.file = file;
    state.url = URL.createObjectURL(file);
    const v = $('#src');
    v.src = state.url;
    $('#drop').hidden = true;
    $('#work').hidden = false;
    $('#name').textContent = `${file.name} — ${Lang.nf(file.size / 1048576, 1)} MB`;
    say(t('st_ready'));
  }

  async function run() {
    if (state.busy) return;
    state.busy = true; state.cancel = false;
    $('#go').disabled = true;
    $('#out-box').hidden = true;
    const v = $('#src');
    try {
      await v.play().then(() => v.pause()).catch(() => {});
      if (!v.requestVideoFrameCallback) throw new Error(t('st_err_rvfc'));
      const track = await measure(v, $('#preview'));
      if (track.length < 2) throw new Error(t('st_err_track'));
      const clean = Stab.clean(track.map(s => ({ cx: s.cx, cy: s.cy })));
      for (let i = 0; i < track.length; i++) { track[i].cx = clean.cx[i]; track[i].cy = clean.cy[i]; }
      const full = $('#full').checked;
      const win = full
        ? { w: v.videoWidth, h: v.videoHeight, tx: v.videoWidth / 2, ty: v.videoHeight / 2 }
        : Stab.fitWindow(track.map(s => s.cx), track.map(s => s.cy),
                         v.videoWidth, v.videoHeight);
      const blob = await render(v, track, win);
      const url = URL.createObjectURL(blob);
      $('#out').src = url;
      $('#dl').href = url;
      $('#dl').download = state.file.name.replace(/\.[^.]+$/, '') + '-stabilised.webm';
      $('#out-box').hidden = false;
      const med = track.map(s => s.r).sort((a, b) => a - b)[track.length >> 1];
      say(t('st_done', { n: track.length, r: Lang.nf(med, 0), w: win.w, h: win.h,
                         mb: Lang.nf(blob.size / 1048576, 1) }));
    } catch (err) {
      say(t('st_fail', { why: err.message }));
    } finally {
      state.busy = false;
      $('#go').disabled = false;
      $('#bar').hidden = true;
    }
  }

  addEventListener('DOMContentLoaded', () => {
    const langSel = $('#lang');
    Lang.set(Lang.pick(), false);
    langSel.innerHTML = Object.entries(Lang.names)
      .map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    langSel.value = Lang.lang;
    Lang.apply();
    document.title = Lang.t('st_title');
    langSel.onchange = () => {
      Lang.set(langSel.value); Lang.apply();
      document.title = Lang.t('st_title');
      if (!state.busy) say(state.file ? t('st_ready') : '—');
    };

    const drop = $('#drop');
    $('#file').onchange = e => pick(e.target.files[0]);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => {
      e.preventDefault(); drop.classList.remove('over');
      pick(e.dataTransfer.files[0]);
    };
    $('#go').onclick = run;
    $('#again').onclick = () => {
      $('#drop').hidden = false; $('#work').hidden = true; $('#out-box').hidden = true;
    };
    if (!window.MediaRecorder || !mimeType()) say(t('st_no_recorder'));
  });
})();
