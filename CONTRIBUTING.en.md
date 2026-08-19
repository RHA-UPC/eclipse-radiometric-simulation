# How to contribute

> **Translation** of [`CONTRIBUTING.md`](CONTRIBUTING.md). The Spanish version
> is the authoritative one.

This project computes safety risks. A mistake here does not break a build: it
can end up telling someone they may look at the Sun for longer than they should.
That is why the rules below are stricter than usual.

## The rule that governs everything

**No figure without provenance.**

Every number that reaches the manuscript or a result comes from a reproducible
calculation in `src/` or from a source quoted verbatim in
`data/literature.json`. If something cannot be verified, it gets declared as
unverified rather than filled in with an estimate.

A pull request introducing a constant without a citation gets rejected, however
good the constant is.

## Before opening a pull request

1. **Run the self-checks.** Seven modules carry a `_selftest()` and verify
   physical identities rather than tabulated values: energy conservation in the
   optics, the thermodynamic concentration limit, the asymptotic limits of the
   Carslaw and Jaeger solution, continuity across the two branches of the ICNIRP
   limit, and the exact circle-circle lens area.

   ```bash
   cd src && for m in limbdark radiometry optics thermal eye spectral perseids; do
     python $m.py >/dev/null 2>&1 && echo "$m OK" || echo "$m FAILS"; done
   ```

   `limbdark.py` takes several minutes. The rest are fast except those that load
   ephemerides.

   `src/eclipsecat.py --selftest`, `src/webdata.py --selftest`,
   `node web/js/besselian.test.js` and `node web/js/radiometry.test.js` cover
   the web front end. The first takes about twenty seconds, the second is instant.
   You only need them if you touch the catalogue or the map, and then they are
   mandatory: an error there draws a credible totality path in the wrong place,
   which would lead someone to remove a filter with the photosphere in view.

   `tools/stab_solar.py --selftest` stands apart and is instant. It is outside
   the manuscript chain, so you only need it if you touch that tool. It covers
   its four failure modes: the limb fit against the brightness centroid, reading
   totality, the Moon against a bloom edge under a lit sky, and the crop never
   running off the source frame.

2. **Run `validate.py`.** It checks SPECTRL2 against the ASTM G173 reference
   spectrum and the Besselian re-implementation against NASA's published
   central-line durations. V1 and V2 carry pass criteria.

3. **Run the privacy check.**

   ```bash
   bash tools/privacy_check.sh
   ```

   It fails if absolute paths, images, video, third-party kernels or e-mail
   addresses reach the git index.

4. **If you touch physics, leave behind a check that fails when you break it.**
   An identity, an asymptotic limit, or a case with an analytic solution. No
   framework needed: one `assert` inside `_selftest()` is enough.

## Welcome contributions

- Fixes to numerical errors, especially with the case that exposes them.
- Primary sources better than the current ones, in particular a damage threshold
  measured on a modern consumer CMOS sensor, which does not exist in the
  literature today and is the largest gap in the work.
- Generalising the observing site. Today `src/siteconf.py` is the single source
  of the coordinates, and parameterising it is the medium-term intention. See
  [`ROADMAP.md`](ROADMAP.md).
- Translations of the manuscript.

## What will not be accepted

- Numbers without a source.
- Medical or safety guidance phrased as a recommendation. Ocular exposure
  results are published as calculations under declared assumptions, never as
  permission to look at the Sun. See [`SAFETY.en.md`](SAFETY.en.md).
- New dependencies for something twenty lines can solve.
- Changes that break reproducibility: deleting `data/` except the three source
  files and rerunning the chain must keep reproducing the PDF.

## Licences and assignment of rights

The code is under **AGPL-3.0-only** and the written material under
**CC BY-SA 4.0**. See [`LICENSES.en.md`](LICENSES.en.md).

**Every contribution requires signing the agreement in [`CLA.en.md`](CLA.en.md)
before it is merged.** It assigns to the project owner the rights needed to
offer the whole under other licences, including a commercial one. Without that
assignment the project would lose the option permanently as soon as the first
outside contribution arrived.

Read it in full before contributing. If you are not comfortable assigning those
rights, open an issue describing the problem and the fix instead of a pull
request: a description is not code and requires no assignment.
