# Which licence covers what

The repository mixes software, scientific text and data, and each part carries
the licence that suits it.

| Part | Licence | File |
|---|---|---|
| Code in `src/`, `tools/`, `web/js/`, `web/css/` and `web/*.html` | **AGPL-3.0-only** | [`LICENSE`](LICENSE) |
| Manuscript, figures and documentation: `paper/`, `figs/`, `out/`, `docs/`, `*.md` | **CC BY-SA 4.0** | [`LICENSE-DOCS`](LICENSE-DOCS) |
| Derived data produced by this project: `data/`, `web/data/` | **CC BY-SA 4.0** | [`LICENSE-DOCS`](LICENSE-DOCS) |
| Vendored third-party code in `web/vendor/` | Its own licence, kept beside it | [`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) |
| Third-party data | Their own terms, not relicensed | [`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md) |

Every source file carries a header with
`SPDX-License-Identifier: AGPL-3.0-only`.

`web/data/spectral.json` is the one exception inside `web/data/`: it
redistributes a coefficient table that arrives under BSD-3-Clause, and that
licence travels with it in `web/vendor/LICENSE-pvlib.txt`. See
[`THIRD-PARTY-DATA.md`](THIRD-PARTY-DATA.md).

## Why AGPL and not GPL

The project aims to become a web platform where anyone can simulate eclipse
safety at their own location. GPL-3.0 triggers on distribution of the software;
someone running it as a network service never distributes anything, so they owe
no source. Section 13 of the AGPL closes that door: whoever offers a modified
version over a network must make the source available to its users.

`AGPL-3.0-only` was chosen rather than "or later", so that future versions
published by the Free Software Foundation do not apply automatically.

## Why CC BY-SA and not CC BY-NC

The repository launched under CC BY-NC 4.0. The non-commercial clause had three
problems: it put the project outside the open-source definition, it stopped
GitHub from displaying the licence at all, and it drove away any contributor
with a job. CC BY-SA 4.0 keeps copyleft over the text, requires derivative works
to be shared on the same terms, and fits an open-science ecosystem.

## What this means in practice

**You may** use, study, modify and redistribute all of this, including for
commercial purposes.

**You must**, if you distribute a modified version of the code or offer it as a
network service, publish the complete source under AGPL-3.0. If you redistribute
the text or the figures, modified or not, attribute authorship and keep
CC BY-SA.

**You may not** build a closed layer on top and sell it without publishing the
source, nor relicense the work under proprietary terms.

## Commercial use under other terms

If you need to integrate this project into a closed product, the owner may be
able to offer a different licence. Get in touch through a repository issue.

That possibility depends on the owner retaining the rights to the whole
codebase, which is why every contribution requires signing
[`CLA.md`](CLA.md).

## Licence change of 14 August 2026

The repository's first two publications went out under CC BY-NC 4.0. The owner
was the only person holding rights to the code and no outside contribution had
been merged, so the change required nobody's consent. Anyone who obtained a copy
under CC BY-NC 4.0 keeps the rights that licence granted them over that copy,
because Creative Commons licences are irrevocable.
