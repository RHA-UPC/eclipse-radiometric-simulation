# TODO

What is open, ordered by what blocks what. [`ROADMAP.md`](ROADMAP.md) carries
the reasoning behind most of these and is the place to read before starting
one; this file is the checklist.

Two rules for anything crossed off here. A change to the geometry or the
radiometry is not done until its self-check is green — the tests are the
contract, not a formality. And a change that trades an answer's quality for
bytes or milliseconds gets reverted, however good the number looks.

Last audited against the tree on 20 August 2026.

---

## Blocking, before this is offered to anybody

- [ ] **Lawyer review of [`CLA.md`](CLA.md).** The draft was written by
      somebody who is not one and its own banner asks for the review; until it
      lands, no outside code is merged, which is what
      [`CONTRIBUTING.md`](CONTRIBUTING.md) says. Five specific questions under
      the Spanish consolidated IP Act are written out in ROADMAP §6: article 48
      against clause 9, article 47 and the non-waivable revision action,
      clause 5 versus article 55, clause 7.2 versus article 44, and the blanket
      sentence contributors are asked to write in the pull request. Two smaller
      ones with them: clause 11 fixes jurisdiction at a domicile the document
      never states, and the CLA publishes a real name and e-mail permanently
      with no controller, purpose or retention named.
- [ ] **Civil liability and insurance.** The AGPL's warranty disclaimer covers
      software claims, not personal injury, and this page is read by people
      about to point equipment at the Sun. ROADMAP §3.
- [ ] **Move the attribution promise off git history.** Clause 5 discharges the
      paternity right by undertaking to preserve authorship "in the repository
      history"; rebase, squash-merge and force-push all rewrite that. An
      `AUTHORS` file in the tree is durable, a log is not.

## The interface still owes the visitor something

- [ ] **The geometry's own uncertainty is not on screen.** The two declared
      conventions — solar radius and ΔT — move the limits by a few hundred
      metres, and anyone standing that close to a limit deserves the number.
      Today it is only in the documentation.
- [ ] **Real atmospheric data per point and date.** The one item on any of
      these lists that forces a server: a static site cannot query CAMS. Until
      then the page asks for the atmosphere and shows it beside the result,
      which is honest but is not the answer.
- [ ] **Time zone from the coordinates.** The page shows UTC and the browser's
      own time and says plainly that the second is not the marked point's.
      Honest, still not the answer.
- [ ] **Buildings come from one Overpass endpoint with no retry.** It returned
      504 twice during the August 2026 checks. The failure is handled and
      says so, and the button can be pressed again, but a single public
      endpoint is the weakest link in that feature.

## Science declared open

All four are acknowledged in the manuscript and in
[`docs/FINDINGS.md`](docs/FINDINGS.md). The first is the most valuable thing
this project could receive from outside.

- [ ] **No published damage threshold for a modern consumer CMOS sensor.** The
      only comparison available is Schwarz et al. 2017 on a 2010 Aptina
      MT9V024 with 6 µm pixels.
- [ ] **The absence of sensitivity loss is unverified.** The damage mode is a
      permanent drop of at least 10 % visible only in a flat field, and no flat
      field was taken. Anyone repeating the observation should take one before
      and after.
- [ ] **The shutter-curtain claim has no peer-reviewed backing.** It rests on
      this work's own thin-plate calculation; the literature search was made
      and it failed.
- [ ] **The real lunar limb.** The diamond-ring calculation uses the mean limb;
      mountains break the crescent into Baily's beads and can move a contact by
      a second or two.

## The manuscript chain, which is still one site and one eclipse

The web page computes any of 56 eclipses anywhere. `src/` does not, and the
three blockers below are why. ROADMAP §§1–2.

- [ ] **Take the site out of `src/siteconf.py`**, so it receives a site instead
      of having one written into it.
- [ ] **`src/pathgeom.py` takes thirty to sixty minutes.** Precompute the
      umbral path on a grid and interpolate, or rewrite it. Interpolating
      NASA's limit table already agreed to 220 m, so precomputing looks cheap.
- [ ] **`src/terrain.py` reads the Copernicus DEM over `/vsicurl` per query.**
      It needs a tile cache and probably horizon precomputation by region. The
      browser does a cheaper version of this against a different model, which
      is a sketch of the answer and not the answer.
- [ ] **Cache the ephemerides** — `de440s.bsp` is 32 MB — and **measure the
      cost of a full simulation** before designing anything around it.

## Engineering

- [ ] **Self-checks into CI.** Today: seven `_selftest()` in `src/`,
      `eclipsecat.py --selftest`, `webdata.py --selftest`, four
      `web/js/*.test.js` and the one in `tools/stab_solar.py`, all by hand.
      `limbdark.py` takes minutes and needs its own scheduled job; the rest fit
      in one step.
- [ ] **Nothing in the repository exercises the browser.** The map, the
      compass, the visibility profile and the stabiliser interface were
      verified with throwaway Playwright scripts that were never committed. The
      node tests cover the ports, not the page. A small committed browser check
      would have caught both of the profile's framing mistakes.
- [ ] **`tools/privacy_check.sh` as a pre-push hook**, so it stops depending on
      somebody remembering.
- [ ] **The contour scan is the page's hot loop.** A profile of drawing one
      eclipse puts 29 % of the time inside the marching squares in `contours`,
      24 % in `obscurationGrid`, 18 % in `obsAt`; a standalone benchmark of the
      cell scan ran it in 18 ms against 40. It is the most delicate code here,
      so it is worth doing carefully or not at all: `besselian.test.js` green
      and the vertex positions unchanged, or it does not land.
- [ ] **Pin the dependency versions.** The manuscript declares the ones used;
      there is no `requirements.txt` or `pyproject.toml`.
- [ ] **Cut `limbdark.py`'s runtime**, or separate its convergence study from
      the rest of its self-check.

## Documentation and housekeeping

- [ ] **Translate the manuscript into English.** The repository and the
      interface already are, and it would widen who can review the paper
      considerably.
- [ ] **Decide what to do about the file named `CLAUDE.md`.** It is a working
      document of conventions and traps, it is linked from the README as the
      place to start before touching the code, and its name is the one thing in
      a public repository that says how it was written. Renaming it costs one
      commit and two links; keeping it costs nothing. Nobody has decided.
- [ ] **Decide how the CLA is accepted** — a line per commit or a bot — and
      automate the check.
- [ ] **Define the price and scope of the commercial licence** before anybody
      asks for it.

---

## Measured, and deliberately not done

Do not re-propose these without a materially different mechanism. Each was
tried, measured, and refused on the number that follows it.

- **Splitting `lang.js` per language.** Saves about 20 kB gzipped on first load
  and makes the page slower: the dictionary is one download today and would
  become two round trips, the second of them blocking the first paint.
- **Coarser coastline coordinates.** Measured under the current packing:
  hundredths of a degree take `world.json` from 106 kB gzipped to 75 kB and
  move a vertex by up to 557 m; five-hundredths take it to 98 kB for 111 m.
  This page draws umbral limits to the kilometre and lets anyone zoom to street
  level, so both are buying bytes with the map. The packing that shipped is
  lossless for exactly this reason.
- **Leaflet's canvas renderer for the coastlines.** The right tool on paper. It
  kills the renderer process in headless Chromium on `setView`, in both panes
  and at two data sizes.
- **Removing the tile services' watermark.** It is inside the image, it is on
  both operators, and removing it would breach their terms. The third base map
  — coastlines that ship inside the page and contact nobody — exists because of
  this.
- **A traffic light that says "safe" or "unsafe".** Forcing a verdict means
  hiding an uncertainty that reaches a factor of three at air mass 10.7.
  ROADMAP, "What will not be done".
