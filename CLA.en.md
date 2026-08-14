# Contributor Licence Agreement

> **Translation.** This is an English translation of [`CLA.md`](CLA.md),
> provided so that contributors anywhere can read what they are agreeing to.
> **The Spanish version is the authoritative one.** Where the two differ, the
> Spanish text governs.

**Draft. Pending review by a lawyer before the first contribution is accepted.**
The person who drafted it is not a lawyer. Do not sign it, and do not require it
signed, until a professional has reviewed it.

---

**Version:** 1.0-draft · **Date:** 14 August 2026
**Project owner:** Ricardo Heredia Alessandrello (the "Owner")
**Project:** eclipse-radiometric-simulation

## Why this agreement exists

The project is published under AGPL-3.0-only. That licence requires anyone who
modifies it and offers it over a network to publish their source code, but it
**does not stop them from exploiting it commercially**: anyone may run a paid
service built on it, as long as they publish the sources.

What the Owner wants to reserve is narrower and more specific: the ability to
offer the project **under licences other than the AGPL**, including closed or
commercial ones. Only whoever holds the rights to the entire codebase can do
that. The moment an outside contribution is merged without an assignment, the
project loses that ability permanently, because every future relicensing would
need each contributor's individual consent.

This agreement prevents that loss. It does not take away your right to use your
own work, as clause 4 sets out.

## 1. Definitions

**Contribution:** any work of authorship you submit to the Project, in any form
and by any means, including source code, documentation, text, figures, data,
configuration and commit messages, as well as any modification or addition to
pre-existing Project material.

**Contributor:** the natural or legal person signing this agreement.

**Economic rights:** the rights of reproduction, distribution, public
communication and transformation recognised by the Spanish consolidated text of
the Intellectual Property Act, and their equivalents in any other jurisdiction.

## 2. Assignment of economic rights

The Contributor assigns to the Owner, to the fullest extent permitted by
applicable law, **on an exclusive basis, worldwide, and for the full term of
protection**, all Economic rights in the Contribution, for every form of
exploitation known at the date of signature.

The assignment includes the right to transfer or sublicense those rights to
third parties without further consent and without prior notice.

Consideration for the assignment consists of publication of the Contribution
within the Project and of the licence-back granted in clause 4. No further
remuneration is due.

## 3. Fallback licence

If in any jurisdiction the assignment in clause 2 is invalid, ineffective or
unenforceable, in whole or in part, the Contributor instead grants the Owner, to
the same extent, an **exclusive, worldwide, irrevocable, perpetual, transferable
and sublicensable licence, through any number of tiers and free of charge**, to
exercise the Economic rights in the Contribution, expressly including the right
to distribute it under any terms whatsoever, whether free, closed or commercial.

The Contributor undertakes not to exercise against the Owner or against the
Owner's licensees any right that would prevent or hinder the exercise of this
licence.

## 4. Licence back to the Contributor

The Owner grants the Contributor a non-exclusive, worldwide, irrevocable and
royalty-free licence to reproduce, distribute, publicly communicate and
transform **their own Contribution**, for any purpose and under any terms.

Put plainly: you can still use, publish and relicense your own work however you
like. What you give up is exclusivity over it, not the use of it.

This licence back does not extend to the rest of the Project, which remains
under AGPL-3.0-only unless otherwise agreed in writing.

## 5. Moral rights

The moral rights of attribution and integrity cannot be waived or transferred
under Spanish law and under several other jurisdictions, and this agreement does
not purport to alter them.

To the extent permitted by law, the Contributor undertakes **not to exercise
their moral rights in a way that would prevent the Owner from modifying,
adapting, refactoring, translating, combining or relicensing the Contribution**
in accordance with clauses 2 and 3.

The Owner undertakes to preserve attribution of authorship in the repository
history.

## 6. Patent licence

The Contributor grants the Owner and every recipient of the Project a perpetual,
worldwide, non-exclusive, royalty-free and irrevocable patent licence to make,
use, offer to sell, sell, import and otherwise transfer the Contribution,
covering those claims that the Contribution necessarily infringes on its own or
in combination with the Project.

If the Contributor initiates patent litigation alleging that the Project
infringes a patent, the patent licence this agreement grants to that Contributor
over the Project terminates on the date the action is filed.

## 7. Contributor representations

The Contributor represents and warrants that:

1. The Contribution is their own original work, or they otherwise hold
   sufficient rights to assign what this agreement assigns.
2. They have legal capacity to enter into this agreement. If a minor, they
   provide the consent of their legal guardian.
3. If the Contribution was created in the course of employment or of a
   commercial engagement, or using an employer's or client's resources such that
   the entity might claim rights over it, **they have obtained that entity's
   express authorisation** and can produce it on request.
4. The Contribution incorporates no third-party material other than what they
   expressly identify on submission, stating its origin and its licence.
5. To the best of their knowledge, the Contribution infringes no third-party
   rights.

## 8. Scientific data and traceability

Anyone contributing numerical values, physical constants, measurements or
experimental results must supply their verifiable provenance, in accordance with
the Project rule described in [`CONTRIBUTING.en.md`](CONTRIBUTING.en.md).

The Contributor warrants that they have not invented, silently estimated or
undeclaredly extrapolated any value they contribute. Because the Project
computes exposure limits that bear on people's safety, this warranty is
essential, and breaching it entitles the Owner to revert the Contribution
without notice.

## 9. No obligation

This agreement places the Owner under no obligation to incorporate, maintain or
distribute any Contribution, and creates no employment, partnership or agency
relationship between the parties.

## 10. No warranty

Except as stated in clause 7, the Contribution is provided **as is**, without
warranty of any kind, express or implied, including warranties of
merchantability, fitness for a particular purpose and non-infringement.

## 11. Governing law and jurisdiction

This agreement is governed by Spanish law. For any dispute the parties submit to
the courts of the Owner's domicile, unless a mandatory consumer-protection rule
provides otherwise.

If any clause is held void, the remainder stays in force, and the void clause is
replaced by one approaching its purpose as closely as the law allows.

## 12. How to sign

Add the following line to every commit in your pull request, with your real name
and the e-mail address you sign with:

```
CLA-1.0-signed-by: First Last <you@example.org>
```

With `git` you can automate it:

```bash
git config --local commit.template .github/commit-template.txt
```

The first time, also write this sentence in your pull request:

> I have read `CLA.md` version 1.0 and I accept its terms.

The Owner will not merge a contribution missing either of those.

---

## What this agreement does not do

Worth stating plainly, so nobody signs believing otherwise.

**It does not stop you using your own code.** Clause 4 gives you back a very
broad licence over what you contributed.

**It does not make the Owner the only person who can earn money from the
Project.** AGPL-3.0 permits commercial use by anyone. What the Owner reserves is
the ability to offer the Project under licences other than the AGPL. Anyone
willing to publish their source may exploit it commercially, and that is
deliberate.

**It does not entitle you to have your contribution accepted.** See clause 9.
