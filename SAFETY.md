# Safety

Read this before using any number from this repository to decide what to do with
your eyes or your camera.

## The essentials

**Looking at the Sun without a filter certified to ISO 12312-2 can cause
permanent, painless retinal damage.** It is painless because the retina has no
pain receptors, so you will feel nothing while it happens.

**The only moment the filter comes off is between second and third contact**,
that is, during totality, and only if you are inside the umbral path. Outside
it, no moment is safe.

**A camera without a front solar filter concentrates the Sun onto parts that
cannot take it.** And an optical viewfinder delivers that concentrated beam
straight into your eye.

## Why this project insists

Its own results say that the Sun that afternoon, below five degrees of altitude
and with eleven air masses of atmosphere in the way, **still exceeded the ICNIRP
retinal thermal limit by 30 %** at first contact. With a dilated pupil, the
admissible fixation dropped to twelve seconds.

That low, red, apparently harmless Sun produces no glare, so the aversion
response that normally forces you to look away disappears. **The hazard outlives
the discomfort.** That is the most important conclusion of the whole work and
the easiest to miss.

## What a result from this repository is, and is not

The exposure times this project computes are **the result of applying the ICNIRP
2013 equations under declared assumptions**, not a recommendation of how long
you may look.

Specifically, a computed fixation time:

- corresponds to **one site, one solar altitude and one atmospheric state**, and
  does not transfer to other conditions
- assumes a healthy eye, without refractive surgery, without aphakia and without
  photosensitising medication
- assumes a pupil diameter that the work itself discusses and that you cannot
  measure in the field
- is **an exposure limit, not a target**. ICNIRP limits mark where known risk
  begins, not how far it is prudent to go.

No number here authorises anyone to look at the Sun.

## If the project becomes a web platform

These conditions bind any interface built on this code, as
[`CONTRIBUTING.md`](CONTRIBUTING.md) records:

1. No ocular exposure result is presented as advice. It is presented as a
   calculation, with its assumptions visible next to the number.
2. The ISO 12312-2 certified filter requirement appears in the interface, not
   buried in legal terms.
3. No answer states that looking is safe, under any circumstances and at any
   rounding.
4. Uncertainties are shown. At air mass 10.7 the three clear-sky models the work
   compares differ by a factor of three, and hiding that would convey false
   precision.
5. Geometry gets verified before answering. Telling someone they are inside the
   path of totality when they are not is the worst possible failure, because it
   would lead them to remove the filter with photosphere still visible.

## About photographic equipment

The work concludes that **the sensor** of a DSLR with a slow zoom faced no
appreciable thermal risk with the Sun at that altitude. That conclusion **does
not extend to the rest of the camera**: the shutter curtain and the focusing
screen are thin, unsunk parts onto which the same solar image falls while you
frame the shot.

The computed margin also depends on the aperture. A 300 mm telephoto at f/2.8
pointed at the midday Sun comes down to a factor of 1.9 against the only
published threshold. The general warning is justified; what the work bounds is
one specific case.

**Use a front solar filter throughout the partial phase, and frame in live view
rather than through the optical viewfinder.**

## No warranty

This software and this document are distributed without warranty of any kind, as
stated in sections 15 and 16 of the AGPL-3.0 and section 5 of the CC BY-SA 4.0.
Whoever uses them takes responsibility for their own decisions.

For reference guidance, see the
[American Astronomical Society eye safety guide](https://eclipse.aas.org/eye-safety).
