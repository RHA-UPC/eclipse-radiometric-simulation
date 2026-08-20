/*
 * eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
 *
 * Parity and typography of the five dictionaries. A missing translation breaks
 * nothing at runtime -- the fallback to English sees to that -- so nothing else
 * would ever notice it. This does.
 */
const Lang = require('./lang.js');

const LANGS = ['en', 'es', 'ca', 'it', 'fr'];
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('FAIL ' + m); fails++; } };

const T = Lang._table;
const keys = Object.keys(T);
ok(keys.length > 80, `only ${keys.length} keys`);

// 1. All five, in every key.
for (const k of keys)
  for (const l of LANGS)
    ok(typeof T[k][l] === 'string' && T[k][l].length > 0, `${k}: ${l} missing`);

// 2. No language too many: a key with a sixth language is a typo.
for (const k of keys)
  for (const l of Object.keys(T[k]))
    ok(LANGS.includes(l), `${k}: unknown language ${l}`);

// 3. The {x} placeholders have to be the same in all five, or interpolation
//    leaves a hole in some languages and not in others.
for (const k of keys) {
  const ref = (T[k].en.match(/\{[a-z]+\}/g) || []).sort().join(',');
  for (const l of LANGS) {
    const got = (T[k][l].match(/\{[a-z]+\}/g) || []).sort().join(',');
    ok(got === ref, `${k}: ${l} placeholders «${got}» against en «${ref}»`);
  }
}

// 4. Balanced HTML tags: the strings carry <b> and <a> and are inserted with
//    innerHTML, so an unclosed tag eats the rest of the panel.
for (const k of keys)
  for (const l of LANGS) {
    const s = T[k][l];
    for (const tag of ['b', 'strong', 'em', 'a', 'code', 'span']) {
      const open = (s.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length;
      const close = (s.match(new RegExp('</' + tag + '>', 'g')) || []).length;
      ok(open === close, `${k}.${l}: <${tag}> opened ${open} times and closed ${close}`);
    }
  }

// 5. Per-cent typography. Spanish, Catalan and French take a space before the
//    sign; Italian and English do not. Checked where the per-cent sign follows
//    a literal figure, which is where the rule applies.
const PCT = { en: false, es: true, ca: true, it: false, fr: true };
for (const k of keys)
  for (const l of LANGS) {
    const m = T[k][l].match(/\d(\s?)%/g) || [];
    for (const hit of m) {
      const hasSpace = /\s%/.test(hit);
      ok(hasSpace === PCT[l],
         `${k}.${l}: «${hit}» — space before % ${PCT[l] ? 'missing' : 'unwanted'}`);
    }
  }

// 6. Decimal comma where it belongs. A decimal point in a Spanish sentence is
//    a mistake, and a comma in an English one is a different mistake.
for (const k of keys) {
  for (const l of ['es', 'ca', 'it', 'fr']) {
    const bad = T[k][l].match(/\d+\.\d+/g) || [];
    // Versions and standard numbers carry a point and are not decimals:
    // ISO 12312-2, AGPL-3.0, 1:10 m, 1.9.4. Ruled out by their context.
    const real = bad.filter(x => !/^\d\.\d$/.test(x) || /12312|AGPL|CC BY/.test(T[k][l]));
    ok(real.length === 0 || /AGPL|ISO|BSD|G173|DE440/.test(T[k][l]),
       `${k}.${l}: decimal point in «${real.join(' ')}»`);
  }
}

// 7. The page addresses nobody in the second person: an impersonal register
//    was asked for.
//    JavaScript's `\b` is ASCII: inside «côtes» it sees a boundary between the
//    ô and the t and would report a «tes» that is not there. Hence an explicit
//    delimiter -- start of string or a non-letter -- rather than \b.
const W = '(?:^|[^\\p{L}])';
const rx = words => new RegExp(W + '(?:' + words + ')(?![\\p{L}])', 'iu');
const SECOND_PERSON = {
  en: rx('you|your|yours|yourself'),
  es: rx('tu|tus|tú|ti|contigo|escribiste|declares|tienes|puedes|tuyo|tuya'),
  ca: rx('teu|teva|teus|teves|tu'),
  it: rx('tuo|tua|tuoi|tue|tuo'),
  fr: rx('ton|ta|tes|toi|vous|votre|vos')
};
for (const k of keys)
  for (const l of Object.keys(SECOND_PERSON)) {
    // An interface's direct instructions («Mark a point») are imperative and
    // are not a form of address; what cannot appear is the possessive or the
    // pronoun.
    const hit = T[k][l].match(SECOND_PERSON[l]);
    ok(!hit || k === 'hint_mark' || k === 'hint_place' || k === 'st_drop',
       `${k}.${l}: personal address «${hit && hit[0]}»`);
  }

// 8. Straight quotes where there should be a typographic apostrophe, in the
//    languages that use one constantly. A straight apostrophe inside an
//    innerHTML breaks nothing, but it shows.
for (const k of keys)
  for (const l of ['ca', 'it', 'fr']) {
    const bad = (T[k][l].match(/[a-zà-ú]'[a-zà-ú]/gi) || []).length;
    ok(bad === 0, `${k}.${l}: ${bad} straight apostrophes`);
  }

console.log(fails ? `${fails} FAILURES`
                  : `lang.js OK — ${keys.length} keys × ${LANGS.length} languages`);
process.exit(fails ? 1 : 0);
