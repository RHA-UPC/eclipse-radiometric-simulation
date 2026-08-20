# Roadmap

The web page already computes any of 56 eclipses at any point on Earth. The
manuscript chain behind it still computes one eclipse at one site. Closing that
gap — a platform where anyone enters coordinates and equipment and gets their
own safety analysis — is what is left.

What follows is ordered by what blocks what, not by difficulty.

**Update, 20 August 2026.** The geometric half of the jump is done, and by a
route that sidesteps the blockers rather than solving them:
`src/eclipsecat.py` fits its own Besselian elements from DE440s for the 56
eclipses between 2026 and 2050, and `web/` consumes them as a static site that
computes in the browser. Neither `pathgeom.py` nor `terrain.py` nor the 32 MB
ephemeris takes part, so none of the three technical blockers even arises for
geometry. They still block the radiometric half, which is the one that cannot
yet be given anywhere. What fell and what did not is marked below.

---

## 1. Generalize the site

The step that unblocks everything else, and easier than it looks.

- [x] **Done for the web, not for `src/`.** `web/` has no site: local
      circumstances come out of the elements and a pair of coordinates. The
      manuscript chain is still tied to `siteconf.py`.
- [ ] **Take the site out of `src/siteconf.py`.** Today that module is the only
      source of the coordinates, the elevation and the constants, so
      generalizing means turning it into a function that receives a site
      instead of having one written into it. The other modules already import
      it and need no structural change.
- [x] **Parameterize the eclipse date.** Solved by the second route:
      `eclipsecat.py` computes them from DE440s instead of reading them, and
      checks them against NASA's published values for 2026. The manuscript
      still uses the `data/literature.json` entry, which is now a cross-check
      rather than the source.
- [ ] **Resolve the time zone from the coordinates.** Everything is in CEST
      because the site is in Spain. The web page shows UTC and the browser's
      time, and says explicitly that the second is not the marked point's; that
      is honest, but it is not the answer.
- [x] **Cover the annular and partial cases.** Done in the web: the catalogue
      classifies total, annular, hybrid and partial by the sign of the umbral
      radius at the ground, a point outside the penumbra returns nothing rather
      than a small magnitude, and an eclipse whose maximum falls below the
      horizon is declared as such. Still pending in `src/`.

## 2. Clear the three technical blockers

None of them blocks geometry any more, because the web does not use them. All
three still stand for radiometry, which is what is missing.

- [ ] **`src/pathgeom.py` takes thirty to sixty minutes.** Unusable inside an
      HTTP request. Either the umbral path gets precomputed on a grid and
      interpolated, or the algorithm gets rewritten. Interpolating NASA's limit
      table, used to validate it, already showed 220 m agreement, so
      precomputing looks like the cheap route.
- [ ] **`src/terrain.py` reads the Copernicus DEM over `/vsicurl` on every
      query**, sampling radials every 0.25° of azimuth out to 100 km. Under
      real traffic that runs into the bucket's limits. It needs a tile cache
      and, probably, horizon precomputation by region. The browser page already
      does a cheaper version of this against a different model — nine tiles out
      to 25 km, cached in the tab — which is a working sketch of the answer, not
      the answer.
- [ ] **Cache the ephemerides.** `de440s.bsp` is 32 MB. On a server it loads
      once, but the cost of a full calculation is worth measuring before
      promising response times.
- [ ] **Measure the cost of a full simulation** before designing anything. No
      architectural decision makes sense without that number.

## 3. Design the platform as a calculator, not an adviser

Binding. See [`SAFETY.md`](SAFETY.md).

- [x] Turn the manuscript's "Warning" section into an entry screen. It comes
      first and has to be dismissed to reach the map.
- [x] Show the ISO 12312-2 filter requirement in the interface, not in a buried
      legal notice. It sits under every result, not once on entry.
- [x] Present every result next to its assumptions. A point's panel carries
      what is assumed: ground at zero, astronomical horizon, no refraction, the
      adopted solar radius, and whose local time is being shown.
- [x] **Show the uncertainty.** The panel shows the air mass, warns above six
      that the model is extrapolating, cites the factor of three this work
      found at air mass 10.7, and accompanies every result with a sensitivity
      bracket over aerosol between half and double the declared AOD.
- [x] Verify the geometry before answering. `src/eclipsecat.py --selftest` and
      `node web/js/besselian.test.js` require under 1.5 s per contact against
      the DE440s chain, under 3 km against NASA's central line, and that the
      study's site falls at the 41.9 km from the northern limit the manuscript
      publishes.
- [x] **Take the radiometric half to the web.** Done by the second route and
      without precomputing anything: the panel carries a button that solves
      SPECTRL2, the chromatic transmission with limb darkening and both ICNIRP
      limits on the visitor's machine, under a declared atmosphere. The ASTM
      G173-03 conditions are the default, marked as a reference case and not as
      a measurement.
- [x] **Real terrain in the horizon.** Done on request and client-side: the
      page takes the elevation of the point from a public model, builds the
      skyline azimuth by azimuth out to 25 km, and says at each contact whether
      the Sun is in view or behind a ridge. Building heights come in where
      OpenStreetMap records them, with the coverage stated, and there is a
      field for the obstacle nobody has mapped.
- [ ] **The geometry's own uncertainty is still missing from the interface.**
      The two declared conventions (solar radius and ΔT) move the limits by a
      few hundred metres, and anyone that close to the edge deserves to know.
      Today it is only written in the documentation.
- [ ] **Real atmospheric data per point and date.** That would close the gap
      properly, and it is the only item on this list that forces a server: a
      static site cannot query CAMS.
- [ ] Consult a lawyer about civil liability before opening to the public, and
      consider insurance. The AGPL's warranty disclaimer covers software
      claims, not personal injury.

## 4. Close the declared scientific gaps

All three are acknowledged in the manuscript and in
[`docs/FINDINGS.md`](docs/FINDINGS.md).

- [ ] **No published damage threshold exists for a modern consumer CMOS
      sensor.** The only available comparison is Schwarz et al. 2017, which
      measured a 2010 Aptina MT9V024 with 6 µm pixels. Finding or producing a
      measurement on a current sensor is the most valuable contribution this
      project could receive.
- [ ] **The absence of sensitivity loss is unverified.** The damage mode
      Schwarz describes is a permanent drop of at least 10 % visible only in a
      flat field, and none is available. Anyone repeating the observation
      should take a uniform flat field before and after.
- [ ] **The claim about the shutter curtain has no peer-reviewed backing.** It
      rests only on this work's thin-plate calculation. The literature search
      was made and it failed.
- [ ] Model the focusing screen and the shutter curtain explicitly, instead of
      citing them as out of scope.
- [ ] Bring in the real lunar limb. The diamond-ring calculation uses the mean
      limb, and mountains break the crescent into Baily's beads, so contact
      instants can shift by a second or two.

## 5. Engineering

- [ ] **Move the self-checks into CI.** Today they are seven `_selftest()` in
      `src/`, plus `src/eclipsecat.py --selftest` and `src/webdata.py
      --selftest`, plus `web/js/besselian.test.js`, `radiometry.test.js`,
      `stabilise.test.js` and `lang.test.js`, plus the one in
      `tools/stab_solar.py`, all by hand. `limbdark.py` takes several minutes,
      so it needs its own scheduled job; the rest fit in one step.
- [ ] Add `tools/privacy_check.sh` as a pre-push hook, so it does not depend on
      somebody remembering.
- [ ] Pin the dependency versions. The manuscript declares the ones used, but
      there is no `requirements.txt` or `pyproject.toml`.
- [ ] Cut `limbdark.py`'s runtime, or separate its convergence study from the
      rest of the self-check.
- [ ] Translate the manuscript into English. It would widen who can review it
      considerably. The repository and the interface are already there.

## 6. Licence and contributions

- [ ] **Review of [`CLA.md`](CLA.md) by a lawyer before merging the first
      outside contribution.** The current draft was written by someone who is
      not one. Clause 2's assignment against the limits of article 43 of the
      Spanish consolidated Intellectual Property Act matters especially, as
      does clause 5's partial waiver of moral rights.
- [ ] Decide whether the CLA is accepted signed per commit line or through a
      bot, and automate the check.
- [ ] Define the price and scope of the commercial licence before anybody asks
      for it.

---

## What will not be done

**Turning this into an app that says "safe" or "unsafe".** The project
publishes calculations with their hypotheses in view. A traffic light would
force hiding the uncertainty, which at air mass 10.7 reaches a factor of three.

**Giving an ocular exposure number without showing which atmosphere it comes
from.** The web computes geometry across the planet because geometry does not
depend on the air. Irradiance does, and the repository has one day and one site
measured, so the page computes it under a hypothesis the visitor sees and can
change. Filling it in with a standard atmosphere and presenting it as data
would be inventing provenance for a safety figure.

**Promising worldwide coverage before validating outside Europe.** The
Copernicus DEM covers the planet, but the topographic horizon has been checked
against one site. Widening coverage requires validating, not just downloading
more tiles.
