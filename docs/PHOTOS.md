# The observer's photographs

23 files in `fotografias/`: 12 JPEG and 11 CR2. Analysed without loading any
image into the model's context, using only EXIF, numpy and rawpy.

That folder also holds two videos, `MVI_2418.MP4` and `MVI_2427.MP4`, which
enter neither this analysis nor any figure in the manuscript.
`tools/stab_solar.py` handles them and they exist only to be watched. With them
the rule above did not hold: tuning the detector required looking at individual
frames.

Products: `data/photos_exif.json`, `data/photometry.json`,
`data/raw_stats.json`, `data/raw_luminance.json`, `data/hotpixels.json`,
`data/photo_analysis.json`.

## What is there

Canon EOS 200D with a Tamron 16-300mm F/3.5-6.3 Di II VC PZD B016 in all 23
files. The modelled hardware and the used hardware are the same.

The partial phases were shot at **300 mm, f/40, 1/4000 s, ISO 100**. f/40 is
the lens's minimum aperture at that focal length. Two frames at 16 mm and f/22,
which is also the minimum there. The observer stopped down as far as the lens
allowed.

That matters for the safety conclusions: the work modelled the worst case at
f/6.3, and focal-plane irradiance falls with the square of the f-number. At
f/40 the concentration is 40 times lower than at f/6.3.

## The camera clock ran fast

The EXIF puts the last partial-phase photograph at 20:27:57 and the next burst
at 20:32:45, already at ISO 12800 and 1/50 s. With the predicted times (C2 at
20:29:25.6, C3 at 20:30:35.9) that burst would fall more than two minutes after
third contact, where nobody shoots at ISO 12800.

The RAW files resolve the contradiction. Normalizing the raw signal by ISO,
exposure time and f-number gives a scene luminance comparable across frames:

| File | Clock | Relative luminance |
|---|---|---|
| _MG_2419 | 20:32:45 | 7.0 × 10⁻⁴ |
| _MG_2423 | 20:33:06 | 3.4 × 10⁻⁴ |
| _MG_2426 | 20:33:26 | 6.1 × 10⁻³ |
| _MG_2428 | 20:36:04 | 1.9 × 10⁻¹ |
| _MG_2429 | 20:36:16 | 1 (reference) |

Between `_MG_2426` and `_MG_2428` the scene becomes 32 times brighter **with
identical exposure**: f/20, 1/250 s, ISO 800 in both. That is the photosphere
reappearing.

The sequence from 20:32:45 to 20:33:26 spans 41 s and has to fall inside
totality. The offset comes out of pure ordering, with no photometric model:

    Δt ≥ 20:33:26 − C3 = +171 s
    Δt ≤ 20:32:45 − C2 = +200 s

**The camera clock ran about 3 minutes fast.** With that offset the corona
burst starts 29 s after second contact and ends right at third, which is what a
photographer does when they remove the filter, adjust, and put it back on
seeing the Sun return.

## What failed: area photometry

The first attempt measured the crescent's area in the JPEGs and compared it
with the predicted obscuration curve to solve for the offset. It gave values
running from +833 s to +316 s, decreasing monotonically along the sequence.

The drift gives the problem away: saturation blooming inflates the measured
area, and the effect shrinks as the Sun dims and the crescent thins. A
two-parameter fit with a constant blooming term does not work either, because
blooming scales with surface brightness and is not constant.

The methodological conclusion: in saturated frames, area is a biased observable
and temporal ordering is not.

## What did validate: the plate scale

Canon's sheet gives 3.717 µm of pixel pitch; the EXIF, 300 mm of focal length;
DE440s, 946.66″ of apparent solar radius. Those three numbers predict a solar
radius of **86.4 px** in the thumbnails used.

The circle fit on the best-conditioned frame gives **86.5 px**.

Agreement to 0.1 %, and none of the three ingredients was tuned to the data. It
confirms the whole optical chain.

## Hot pixels

A hot pixel is a fixed defect and appears at the same coordinate across
different frames. Shot noise moves around.

Comparing `_MG_2419` and `_MG_2420`, two ISO 12800 frames 5 s apart during
totality: 196 pixels exceed 50σ in each, and **zero** do so in both at once.
The 196 are noise.

At ISO 100, comparing `_MG_2429` and `_MG_2431`: **1 pixel** out of 24 216 480,
that is 4 × 10⁻⁸.

### The limit of this test

There is no reference frame from before the eclipse, so this is an absolute
count and not a change.

More importantly: the damage mode Schwarz et al. describe for continuous
irradiation is a **permanent loss of sensitivity** of at least 10 %, visible in
a flat field and appearing dark in the image. It is not a hot pixel in a dark
frame. These photographs cannot establish it, because there is no flat field
among them.

The result is compatible with the predicted 18× margin, and does not verify it.
Verifying it would need a uniform flat field before and after.

## Summary

Confirmed by the photographs:

- the modelled hardware is the hardware used
- the plate scale, to 0.1 %
- totality lasted at least 41 s, compatible with the predicted 70.3 s
- the observer shot at f/40, well below the modelled worst case
- the sensor has no hot pixels

Not confirmed:

- the absolute contact times, because the camera clock was not synchronized
- the absence of sensitivity loss, which needs a flat field
