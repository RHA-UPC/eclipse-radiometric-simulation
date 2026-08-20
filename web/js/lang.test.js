/*
 * eclipse-radiometric-simulation — SPDX-License-Identifier: AGPL-3.0-only
 *
 * Parity and typography of the five dictionaries. A missing translation does
 * not break anything at runtime -- the fallback to English sees to that -- so
 * nothing else would ever notice it. This does.
 */
const Lang = require('./lang.js');

const LANGS = ['en', 'es', 'ca', 'it', 'fr'];
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('FAIL ' + m); fails++; } };

const T = Lang._table;
const keys = Object.keys(T);
ok(keys.length > 80, `solo ${keys.length} claves`);

// 1. Las cinco, en todas.
for (const k of keys)
  for (const l of LANGS)
    ok(typeof T[k][l] === 'string' && T[k][l].length > 0, `${k}: falta ${l}`);

// 2. Ningún idioma de más: una clave con un sexto idioma es una errata.
for (const k of keys)
  for (const l of Object.keys(T[k]))
    ok(LANGS.includes(l), `${k}: idioma desconocido ${l}`);

// 3. Los marcadores {x} tienen que ser los mismos en las cinco, o la
//    interpolación deja un hueco en unas lenguas y no en otras.
for (const k of keys) {
  const ref = (T[k].en.match(/\{[a-z]+\}/g) || []).sort().join(',');
  for (const l of LANGS) {
    const got = (T[k][l].match(/\{[a-z]+\}/g) || []).sort().join(',');
    ok(got === ref, `${k}: marcadores de ${l} «${got}» contra en «${ref}»`);
  }
}

// 4. Etiquetas HTML balanceadas: las cadenas llevan <b> y <a> y se insertan
//    con innerHTML, así que una etiqueta sin cerrar se come el resto del panel.
for (const k of keys)
  for (const l of LANGS) {
    const s = T[k][l];
    for (const tag of ['b', 'strong', 'em', 'a', 'code', 'span']) {
      const open = (s.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length;
      const close = (s.match(new RegExp('</' + tag + '>', 'g')) || []).length;
      ok(open === close, `${k}.${l}: <${tag}> abierta ${open} veces y cerrada ${close}`);
    }
  }

// 5. Tipografía del porcentaje. Español, catalán y francés llevan espacio ante
//    el signo; italiano e inglés no. Se comprueba donde el porcentaje va con
//    una cifra literal delante, que es donde la norma aplica.
const PCT = { en: false, es: true, ca: true, it: false, fr: true };
for (const k of keys)
  for (const l of LANGS) {
    const m = T[k][l].match(/\d(\s?)%/g) || [];
    for (const hit of m) {
      const hasSpace = /\s%/.test(hit);
      ok(hasSpace === PCT[l], `${k}.${l}: «${hit}» — ${PCT[l] ? 'falta' : 'sobra'} el espacio ante %`);
    }
  }

// 6. Coma decimal donde toca. Un punto decimal en una frase española es un
//    error, y una coma en una inglesa es otro distinto.
for (const k of keys) {
  for (const l of ['es', 'ca', 'it', 'fr']) {
    const bad = T[k][l].match(/\d+\.\d+/g) || [];
    // Las versiones y las normas llevan punto y no son decimales: ISO 12312-2,
    // AGPL-3.0, 1:10 m, 1.9.4. Se descartan por el contexto inmediato.
    const real = bad.filter(x => !/^\d\.\d$/.test(x) || /12312|AGPL|CC BY/.test(T[k][l]));
    ok(real.length === 0 || /AGPL|ISO|BSD|G173|DE440/.test(T[k][l]),
       `${k}.${l}: punto decimal en «${real.join(' ')}»`);
  }
}

// 7. La página no tutea ni habla de «tú»: se pidió registro impersonal.
// `\b` de JavaScript es ASCII: en «côtes» ve frontera entre la ô y la t y
// daría por encontrado un «tes» que no existe. De ahí que el delimitador sea
// explícito -- principio de cadena o carácter no alfabético -- en vez de \b.
const W = '(?:^|[^\\p{L}])';
const rx = words => new RegExp(W + '(?:' + words + ')(?![\\p{L}])', 'iu');
const TU = {
  es: rx('tu|tus|tú|ti|contigo|escribiste|declares|tienes|puedes|tuyo|tuya'),
  ca: rx('teu|teva|teus|teves|tu'),
  it: rx('tuo|tua|tuoi|tue|tuo'),
  fr: rx('ton|ta|tes|toi|vous|votre|vos')
};
for (const k of keys)
  for (const l of Object.keys(TU)) {
    // Las instrucciones directas de una interfaz («Marca un punto») son
    // imperativas y no son un tuteo de tratamiento; lo que no puede aparecer
    // es el posesivo o el pronombre.
    const hit = T[k][l].match(TU[l]);
    ok(!hit || k === 'hint_mark' || k === 'hint_place' || k === 'st_drop',
       `${k}.${l}: trato personal «${hit && hit[0]}»`);
  }

// 8. Comillas rectas donde debería haber apóstrofo tipográfico, en las lenguas
//    que lo usan constantemente. Un apóstrofo recto dentro de un innerHTML no
//    rompe nada, pero canta.
for (const k of keys)
  for (const l of ['ca', 'it', 'fr']) {
    const bad = (T[k][l].match(/[a-zà-ú]'[a-zà-ú]/gi) || []).length;
    ok(bad === 0, `${k}.${l}: ${bad} apóstrofos rectos`);
  }

console.log(fails ? `${fails} FALLOS` : `lang.js OK — ${keys.length} claves × ${LANGS.length} idiomas`);
process.exit(fails ? 1 : 0);
