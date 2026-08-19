#!/usr/bin/env python3
# eclipse-radiometric-simulation
# Copyright (C) 2026 Ricardo Heredia Alessandrello
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License, version 3, as published
# by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details. You should have received a copy of it along with this program; if
# not, see <https://www.gnu.org/licenses/>.
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Pin the eclipsed Sun to a fixed point in the frame.

Generic video stabilisers are useless here. They track background features, and
an eclipse filmed against a dark sky has none: the frame is black except for the
Sun itself. Brightness-centroid tracking, the usual planetary-imaging fallback,
is worse than useless, because the centroid of a crescent is not the centre of
the Sun. It sits inside the lit sliver and marches toward the uncovered limb as
the Moon advances, so the "stabilised" Sun would drift by most of a solar radius
over the partial phase, in step with the eclipse it is meant to hold still.

What stays fixed is the limb. The outer edge of the crescent is the solar limb
whatever the coverage, an arc of constant radius about the solar centre, so this
module fits a circle to that arc and ignores everything inside it.

Three regimes, detected per frame:

  photosphere  Pixels saturate. The lit region's outer edge is the solar limb.
  totality     No photosphere. Once the camera has opened up enough to expose
               the corona, the Moon reads as a dark disk fully enclosed by it,
               and the centroid of that hole is the lunar centre. It trails the
               solar centre by a few pixels, far below the tripod motion being
               removed, and the gap either side of totality absorbs the step.
  dark         Totality still exposed for the photosphere: the frame carries no
               signal at all. Nothing is measurable, and nothing is visible
               either, so these frames take an interpolated position.

Usage:
    python3 tools/stab_solar.py IN.MP4 OUT.mp4 [--crop 900] [--track t.csv]
    python3 tools/stab_solar.py --selftest

Needs opencv-python-headless and imageio-ffmpeg. The output is re-encoded from
raw frames, so it carries neither the source audio track nor the camera metadata.
"""

import argparse
import subprocess
import sys

import cv2
import numpy as np
from scipy.ndimage import median_filter

THR_PHOT = 200      # the photosphere saturates; nothing else in frame gets near
BRIGHT_SKY = 30     # median frame level above which the sky, not the Sun, is lit
CORONA_THR = 60     # closes the corona ring once the camera has opened up
MIN_HOLE = 10000    # px. A crescent encloses nothing; the Moon encloses ~40000
MIN_PIX = 150       # lit pixels needed before a fit is worth attempting
MIN_EDGE = 30       # limb points needed to constrain a three-parameter circle
R_GUESS = 110.0     # solar radius, px. Only a starting point; the fit refines it
R_BAND = (80.0, 140.0)
TOL_SCHEDULE = (10.0, 6.0, 3.0, 2.0, 2.0)  # annulus half-width per iteration, px
JUMP_MAX = 40.0     # a centre that moves more than this in one frame is lock loss
REACQUIRE = 25      # frames after which the last centre is too stale to seed with


def _kasa(x, y):
    """Algebraic circle fit (Kasa 1976): least squares on x^2+y^2 = Dx+Ey+F."""
    sol, *_ = np.linalg.lstsq(np.c_[x, y, np.ones(len(x))], x * x + y * y, rcond=None)
    cx, cy = sol[0] / 2.0, sol[1] / 2.0
    return cx, cy, np.sqrt(max(sol[2] + cx * cx + cy * cy, 0.0))


def _coarse(mask, r, scale=2):
    """Where a filled disk of radius r covers the most lit pixels.

    A filled disk, not a ring. Solar and lunar limbs share a radius to within a
    few per cent, so a ring accumulator peaks equally on both centres and cannot
    tell them apart. Only the solar centre has the whole crescent inside its
    disk, which is what this correlation scores.

    The peak is a plateau, not a point: the trial disk is larger than the true
    one, so a band of positions ties for best score. Taking the centroid of the
    tie rather than one corner of it is worth up to 20 px on a thin crescent,
    and starting the limb fit that far out lets it converge on the wrong circle.
    """
    small = cv2.resize(mask.astype(np.float32), None, fx=1.0 / scale, fy=1.0 / scale,
                       interpolation=cv2.INTER_AREA)
    rs = max(2, int(round(r / scale)))
    k = np.zeros((2 * rs + 1, 2 * rs + 1), np.float32)
    cv2.circle(k, (rs, rs), rs, 1.0, -1)
    if k.shape[0] >= small.shape[0] or k.shape[1] >= small.shape[1]:
        return None
    resp = cv2.matchTemplate(small, k, cv2.TM_CCORR)
    ys, xs = np.nonzero(resp >= resp.max() * 0.999)
    return (xs.mean() + rs) * scale, (ys.mean() + rs) * scale


def _ring_kernels(r):
    """Signed cos/sin kernels over a ring: a circular Hough that knows polarity."""
    n = 2 * r + 3
    c = n // 2
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = xx - c, yy - c
    d = np.hypot(dx, dy)
    on = np.abs(d - r) < 1.0
    w = float(max(int(on.sum()), 1))
    kx = np.where(on, dx / np.maximum(d, 1e-6), 0.0).astype(np.float32) / w
    ky = np.where(on, dy / np.maximum(d, 1e-6), 0.0).astype(np.float32) / w
    return kx.astype(np.float32), ky.astype(np.float32), c


def _parabolic(sc, x, y):
    """Sub-grid peak position by fitting a parabola through the three samples."""
    out = []
    for i, (lo, hi) in enumerate(((x - 1, x + 1), (y - 1, y + 1))):
        if lo < 0 or hi >= sc.shape[1 - i]:
            out.append(0.0)
            continue
        a, b, c = (sc[y, x - 1], sc[y, x], sc[y, x + 1]) if i == 0 else \
                  (sc[y - 1, x], sc[y, x], sc[y + 1, x])
        den = a - 2.0 * b + c
        # den can be zero on a flat peak, or NaN if a neighbour was masked out.
        if not np.isfinite(den) or den == 0.0:
            out.append(0.0)
            continue
        out.append(float(np.clip(0.5 * (a - c) / den, -1.0, 1.0)))
    return x + out[0], y + out[1]


def find_dark_disk(g, r, centre=None, scale=2, span=30):
    """Centre of the Moon silhouetted against a lit sky. Returns (cx, cy, score).

    Against a bright sky the emerging photosphere is useless as a reference: it
    blooms far past its own limb, so a threshold traces the flare rather than the
    Sun. The Moon does not bloom. It is a black disk of fixed radius, and its
    edge survives intact right next to the glare.

    Polarity is what separates the two. Going outward, the lunar limb steps from
    dark to bright and the bloom boundary from bright to dark, so scoring the
    signed radial gradient around a ring keeps one and rejects the other. An
    unsigned Hough scores both alike and settles on whichever is brighter.
    """
    small = cv2.GaussianBlur(
        cv2.resize(g.astype(np.float32), None, fx=1.0 / scale, fy=1.0 / scale,
                   interpolation=cv2.INTER_AREA), (0, 0), 1.5)
    gx = cv2.Scharr(small, cv2.CV_32F, 1, 0)
    gy = cv2.Scharr(small, cv2.CV_32F, 0, 1)
    kx, ky, off = _ring_kernels(max(2, int(round(r / scale))))
    if kx.shape[0] >= small.shape[0] or kx.shape[1] >= small.shape[1]:
        return None
    sc = cv2.matchTemplate(gx, kx, cv2.TM_CCORR) + cv2.matchTemplate(gy, ky, cv2.TM_CCORR)
    if centre is not None and np.isfinite(centre).all():   # track near last frame
        m = np.zeros(sc.shape, bool)
        px, py = int(centre[0] / scale) - off, int(centre[1] / scale) - off
        m[max(0, py - span):py + span, max(0, px - span):px + span] = True
        if not m.any():
            return None
        # A finite sentinel, not -inf: the peak can land against the window edge,
        # and infinities there turn the parabolic refinement into NaN.
        sc = np.where(m, sc, float(sc.min()) - 1.0)
    _, best, _, loc = cv2.minMaxLoc(sc)
    fx, fy = _parabolic(sc, loc[0], loc[1])
    cx, cy = (fx + off) * scale, (fy + off) * scale
    if not (np.isfinite(cx) and np.isfinite(cy) and np.isfinite(best)):
        return None
    return cx, cy, float(best)


def _enclosed(mask):
    """Dark pixels the border cannot reach: during totality, the Moon's disk."""
    ff = mask.copy()
    cv2.floodFill(ff, np.zeros((mask.shape[0] + 2, mask.shape[1] + 2), np.uint8), (0, 0), 1)
    return ff == 0


def locate(g, r=R_GUESS, centre=None):
    """Centre of the Sun in one frame. Returns (cx, cy, r, regime) or None.

    Regimes: 0 photosphere limb, 1 lunar disk inside the corona, 2 lunar disk
    against a lit sky.

    The hole test comes first because totality also saturates plenty of pixels,
    so a photosphere threshold alone cannot tell the two apart: past second
    contact it latches onto the brightest patch of inner corona, whose outer
    edge is neither circular nor fixed, and wanders by a hundred pixels as the
    camera's automatic exposure opens up.
    """
    if np.median(g) > BRIGHT_SKY:
        # Daylight or heavy haze: the sky itself carries signal, so every
        # threshold-based route below is meaningless. Track the Moon instead.
        res = find_dark_disk(g, r, centre)
        return None if res is None else (res[0], res[1], r, 2)
    hole = _enclosed((g >= CORONA_THR).astype(np.uint8))
    area = int(hole.sum())
    if area >= MIN_HOLE:
        r_eq = np.sqrt(area / np.pi)
        if R_BAND[0] < r_eq < R_BAND[1]:
            ys, xs = np.nonzero(hole)
            return float(xs.mean()), float(ys.mean()), float(r_eq), 1
    if int((g >= THR_PHOT).sum()) < MIN_PIX:
        return None
    res = fit_limb(g, THR_PHOT, r, centre)
    return None if res is None else (res[0], res[1], res[2], 0)


def fit_limb(g, thr, r=R_GUESS, centre=None):
    """Fit a circle to the limb of the lit region. Returns (cx, cy, r, n) or None.

    Trimmed least squares: keep only edge points lying within a tolerance of the
    current radius, refit, tighten the tolerance, repeat. The annulus is what
    discards the lunar limb cutting across the crescent, a different circle about
    a different centre. It has to tighten because a wide annulus still admits the
    stretch of lunar limb that happens to pass at roughly the solar radius, and a
    tenth of the points sitting on the wrong circle drags the centre by pixels.
    """
    mask = (g >= thr).astype(np.uint8)
    if int(mask.sum()) < MIN_PIX:
        return None
    if centre is None:
        centre = _coarse(mask, r)
        if centre is None:
            return None
    cx, cy = float(centre[0]), float(centre[1])
    edge = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    ys, xs = np.nonzero(edge)
    if len(xs) < MIN_EDGE:
        return None
    xs, ys = xs.astype(float), ys.astype(float)
    keep = None
    for tol in TOL_SCHEDULE:
        keep = np.abs(np.hypot(xs - cx, ys - cy) - r) < tol
        if int(keep.sum()) < MIN_EDGE:
            return None
        cx, cy, r = _kasa(xs[keep], ys[keep])
        if not R_BAND[0] < r < R_BAND[1] or not np.isfinite([cx, cy, r]).all():
            return None
    return cx, cy, r, int(keep.sum())


def measure(cap, n):
    """Per-frame solar centre. Columns: cx, cy, r, regime (0 photosphere, 1 totality)."""
    track = np.full((n, 4), np.nan)
    prev, r, last = None, R_GUESS, -10 ** 6
    for i in range(n):
        ok, img = cap.read()
        if not ok:
            track = track[:i]
            break
        gap = i - last
        if gap > REACQUIRE:
            prev = None                         # too stale to seed with; search again
        res = locate(img.max(axis=2), r, prev)
        if res is not None and prev is not None:
            # Budget scales with the gap, so a fit after a few dropped frames is
            # not rejected merely for having had time to move.
            if np.hypot(res[0] - prev[0], res[1] - prev[1]) > JUMP_MAX * gap:
                res = None                      # lost lock; let interpolation cover it
        if res is not None:
            track[i] = res
            prev, r, last = (res[0], res[1]), res[2], i
        if i % 250 == 0:
            print(f'  measured {i}/{n}', file=sys.stderr)
    return track


def clean(track, med_win=9, max_dev=12.0):
    """Reject outlying fits, interpolate the gaps. Returns cx, cy filled.

    No smoothing beyond outlier rejection, on purpose. The tripod shake is real
    motion and removing it is the point; smoothing the measured track would
    subtract a smoothed position and leave the shake in the output.
    """
    t = np.arange(len(track))
    out = []
    for col in (0, 1):
        v = track[:, col].copy()
        good = np.isfinite(v)
        if good.sum() < 2:
            raise SystemExit('stab_solar: too few frames tracked to stabilise')
        v = np.interp(t, t[good], v[good])
        good &= np.abs(v - median_filter(v, size=med_win)) < max_dev
        out.append(np.interp(t, t[good], v[good]))
    return out[0], out[1]


def fit_window(cx, cy, w, h, aspect=16.0 / 9.0):
    """Largest window of the given aspect holding the Sun dead centre throughout.

    Shifting a frame exposes blank edges. Against a dark sky nobody sees them;
    against a lit one they read as broken, so the output is cropped instead to
    a region every frame can fill.

    Centring is the binding constraint, not the travel. The window has to sit
    symmetric about the Sun in every frame, so its half-width cannot exceed the
    Sun's closest approach to any edge. A Sun framed low in the shot therefore
    costs height, however much unused sky sits above it.

    Returns ((width, height), (tx, ty)), the Sun landing on (tx, ty).
    """
    ow = 2.0 * min(cx.min(), w - cx.max())
    oh = 2.0 * min(cy.min(), h - cy.max())
    ow = min(ow, oh * aspect)
    ow = max(2.0, int(ow) // 2 * 2.0)
    oh = max(2.0, int(ow / aspect) // 2 * 2.0)
    return (int(ow), int(oh)), (ow / 2.0, oh / 2.0)


def render(cap, cx, cy, path, size, fps, ffmpeg, target=None):
    """Translate every frame so the Sun lands on a fixed point of the output."""
    w, h = size
    tx, ty = (w / 2.0, h / 2.0) if target is None else target
    proc = subprocess.Popen(
        [ffmpeg, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
         '-s', f'{w}x{h}', '-r', f'{fps}', '-i', '-',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
         path], stdin=subprocess.PIPE)
    m = np.zeros((2, 3), np.float32)
    m[0, 0] = m[1, 1] = 1.0
    for i in range(len(cx)):
        ok, img = cap.read()
        if not ok:
            break
        m[0, 2], m[1, 2] = tx - cx[i], ty - cy[i]
        frame = cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_LANCZOS4,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        proc.stdin.write(np.ascontiguousarray(frame).tobytes())
        if i % 250 == 0:
            print(f'  rendered {i}/{len(cx)}', file=sys.stderr)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('stab_solar: ffmpeg failed')


def _selftest():
    """Synthetic occultation: the fit must hold the centre the centroid loses."""
    truth, r_true = (200.0, 190.0), 105.0
    worst_fit, worst_centroid = 0.0, np.inf
    # No Moon, then three separations. For equal radii the lit crescent is d
    # wide, so the last case leaves a 15 px sliver: past that the arc gets too
    # short to constrain a circle, which is where the real video goes dark anyway.
    for d in (None, 90.0, 40.0, 15.0):
        img = np.zeros((400, 400), np.uint8)
        cv2.circle(img, (int(truth[0]), int(truth[1])), int(r_true), 255, -1)
        if d is not None:
            cv2.circle(img, (int(truth[0] + d), int(truth[1])), int(r_true), 0, -1)
        res = fit_limb(img, THR_PHOT)
        assert res is not None, f'no fit at d={d}'
        cx, cy, r, _ = res
        err = np.hypot(cx - truth[0], cy - truth[1])
        assert err < 1.0, (d, err)
        assert abs(r - r_true) < 2.0, (d, r)
        worst_fit = max(worst_fit, err)
        if d is not None:
            ys, xs = np.nonzero(img >= THR_PHOT)
            cerr = np.hypot(xs.mean() - truth[0], ys.mean() - truth[1])
            worst_centroid = min(worst_centroid, cerr)
    # The reason this module is not four lines of cv2.moments.
    assert worst_centroid > 20.0, worst_centroid
    # Totality: a corona ring around a dark Moon must be read as regime 1, and a
    # crescent must never be, or the tail of the video tracks the wrong thing.
    tot = np.zeros((400, 400), np.uint8)
    cv2.circle(tot, (210, 180), int(r_true * 1.5), 120, -1)
    cv2.circle(tot, (210, 180), int(r_true), 0, -1)
    res = locate(tot)
    assert res is not None and res[3] == 1, res
    assert np.hypot(res[0] - 210, res[1] - 180) < 1.0, res
    crescent = np.zeros((400, 400), np.uint8)
    cv2.circle(crescent, (200, 190), int(r_true), 255, -1)
    cv2.circle(crescent, (240, 190), int(r_true), 0, -1)
    assert locate(crescent)[3] == 0
    # Lit sky: the Moon has to win against a bloom edge of the opposite polarity
    # and comparable strength, which is the case an unsigned Hough gets wrong.
    sky = np.full((500, 500), 90, np.uint8)
    cv2.circle(sky, (330, 250), 160, 230, -1)
    cv2.circle(sky, (200, 250), int(r_true), 20, -1)
    sky = cv2.GaussianBlur(sky, (0, 0), 3.0)
    res = locate(sky, r_true)
    assert res is not None and res[3] == 2, res
    assert np.hypot(res[0] - 200, res[1] - 250) < 3.0, res
    # The crop must centre the Sun and no frame may run off the source. Checking
    # both invariants directly beats checking the arithmetic that produced them.
    cxs, cys = np.array([974.0, 1230.0]), np.array([689.0, 880.0])
    (ow, oh), (tx, ty) = fit_window(cxs, cys, 1920, 1080)
    assert abs(ow / oh - 16.0 / 9.0) < 0.02, (ow, oh)
    assert abs(tx - ow / 2.0) < 1.0 and abs(ty - oh / 2.0) < 1.0, (tx, ty, ow, oh)
    for x0, y0 in zip(cxs, cys):
        assert x0 - tx >= 0 and (ow - 1) - tx + x0 <= 1919, (x0, tx, ow)
        assert y0 - ty >= 0 and (oh - 1) - ty + y0 <= 1079, (y0, ty, oh)
    # Outlier rejection must survive a wild fit and a run of untracked frames.
    tr = np.full((60, 4), np.nan)
    tr[:, 0] = np.arange(60) * 0.5 + 100.0
    tr[:, 1] = 50.0
    tr[20:30, :2] = np.nan
    tr[40, 0] = 900.0
    cx, cy = clean(tr)
    assert np.abs(cx - (np.arange(60) * 0.5 + 100.0)).max() < 1e-6
    assert np.abs(cy - 50.0).max() < 1e-6
    print(f'stab_solar selftest OK  (limb error <= {worst_fit:.2f} px, '
          f'centroid error >= {worst_centroid:.0f} px)')


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('src', nargs='?', help='input video')
    p.add_argument('dst', nargs='?', help='output video')
    p.add_argument('--crop', type=int, default=0,
                   help='emit a square CROP x CROP window instead of the full frame')
    p.add_argument('--fit', action='store_true',
                   help='crop to the largest 16:9 window no frame runs off, so a '
                        'lit sky gets no blank edges')
    p.add_argument('--end', type=int, default=0,
                   help='stop after frame END, e.g. where the shot is rezoomed')
    p.add_argument('--track', help='CSV of the measured track; reused if it exists')
    p.add_argument('--selftest', action='store_true')
    a = p.parse_args()
    if a.selftest:
        return _selftest()
    if not a.src or not a.dst:
        p.error('need SRC and DST')

    import imageio_ffmpeg
    cap = cv2.VideoCapture(a.src)
    if not cap.isOpened():
        raise SystemExit(f'stab_solar: cannot open {a.src}')
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if a.end:
        n = min(n, a.end)
    print(f'{w}x{h}  {fps:g} fps  {n} frames', file=sys.stderr)

    track = None
    if a.track:
        try:
            track = np.loadtxt(a.track, delimiter=',')
            print(f'reusing track {a.track}', file=sys.stderr)
        except OSError:
            track = None
    if track is None:
        track = measure(cap, n)
        if a.track:
            np.savetxt(a.track, track, delimiter=',', fmt='%.3f',
                       header='cx,cy,r,regime')
    ok = np.isfinite(track[:, 0])
    print(f'tracked {ok.sum()}/{len(track)} frames '
          f'({100 * ok.mean():.1f}%), radius {np.nanmedian(track[:, 2]):.1f} px',
          file=sys.stderr)

    cx, cy = clean(track[:n])
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    target = None
    if a.crop:
        size = (a.crop, a.crop)
    elif a.fit:
        size, target = fit_window(cx, cy, w, h)
        print(f'fitted window {size[0]}x{size[1]}, Sun pinned at '
              f'({target[0]:.0f}, {target[1]:.0f})', file=sys.stderr)
    else:
        size = (w, h)
    render(cap, cx, cy, a.dst, size, fps, imageio_ffmpeg.get_ffmpeg_exe(), target)
    cap.release()
    print(f'wrote {a.dst}', file=sys.stderr)


if __name__ == '__main__':
    main()
