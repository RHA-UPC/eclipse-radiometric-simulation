/*
 * eclipse-radiometric-simulation — user-facing text, five languages
 * Copyright (C) 2026 Ricardo Heredia Alessandrello
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Grouped by key, not by language, so a missing translation is visible on the
 * line where it is missing instead of hiding at the bottom of a dictionary
 * nobody scrolls to. `lang.test.js` fails the build if any key is short of the
 * five, and the runtime fallback to English exists to degrade gracefully in
 * production, not to excuse a gap.
 *
 * English is the source. Spanish is a co-source rather than a translation: the
 * page was written in Spanish first and several passages read better there, so
 * where the two disagree the meaning is the arbiter, not the word order.
 *
 * House rules that are not negotiable, because they are the target languages'
 * own and not this file's taste:
 *
 *   en  Oxford British spelling, -ize suffixes: metres, colour, centre,
 *       normalize. No space before the per-cent sign.
 *   es  Decimal comma and a space before the per-cent sign (RAE). Impersonal
 *       register: the page addresses nobody in the second person.
 *   ca  Decimal comma and a space before the per-cent sign. TERMCAT
 *       terminology: «configuració», not «ajustos»; «satel·litari», not the
 *       rejected «satel·lital».
 *   it  Decimal comma and NO space before the per-cent sign. «prove», not
 *       «evidenze», which the Crusca calls an anglicizing calque.
 *   fr  Decimal comma, a non-breaking space before : ; ! ? and before the
 *       per-cent sign. «en périphérie», not «edge».
 *
 * Numbers never appear as literals in here. They arrive already formatted for
 * the active locale, because a decimal point in a Spanish sentence is a
 * mistake and a decimal comma in an English one is a different mistake.
 */
const Lang = (() => {
  'use strict';

  const S = {

  /* ---- shell -------------------------------------------------------- */
  app_title: {
    en: 'Solar eclipses', es: 'Eclipses solares', ca: 'Eclipsis solars',
    it: 'Eclissi solari', fr: 'Éclipses solaires' },
  app_tagline: {
    en: 'Local circumstances of every solar eclipse from 2026 to 2050, computed from JPL DE440s ephemerides.',
    es: 'Circunstancias locales de todos los eclipses solares de 2026 a 2050, calculadas desde efemérides JPL DE440s.',
    ca: 'Circumstàncies locals de tots els eclipsis solars del 2026 al 2050, calculades a partir d’efemèrides JPL DE440s.',
    it: 'Circostanze locali di tutte le eclissi solari dal 2026 al 2050, calcolate dalle effemeridi JPL DE440s.',
    fr: 'Circonstances locales de toutes les éclipses solaires de 2026 à 2050, calculées à partir des éphémérides JPL DE440s.' },
  mode_eclipse: {
    en: 'By eclipse', es: 'Por eclipse', ca: 'Per eclipsi', it: 'Per eclissi', fr: 'Par éclipse' },
  mode_place: {
    en: 'By place', es: 'Por lugar', ca: 'Per lloc', it: 'Per luogo', fr: 'Par lieu' },
  nav_stabiliser: {
    en: 'Stabiliser', es: 'Estabilizador', ca: 'Estabilitzador',
    it: 'Stabilizzatore', fr: 'Stabilisateur' },
  nav_calculator: {
    en: 'Eclipse calculator', es: 'Calculadora de eclipses', ca: 'Calculadora d’eclipsis',
    it: 'Calcolatore di eclissi', fr: 'Calculateur d’éclipses' },

  attr_sources: { en: 'sources', es: 'fuentes', ca: 'fonts', it: 'fonti', fr: 'sources' },
  base_label: { en: 'Map', es: 'Fondo', ca: 'Fons', it: 'Sfondo', fr: 'Fond' },
  base_streets: { en: 'Map: streets', es: 'Fondo: calles', ca: 'Fons: carrers',
    it: 'Sfondo: strade', fr: 'Fond : rues' },
  base_relief: { en: 'Map: relief', es: 'Fondo: relieve', ca: 'Fons: relleu',
    it: 'Sfondo: rilievo', fr: 'Fond : relief' },
  base_plain: { en: 'Map: coastlines only', es: 'Fondo: solo costas', ca: 'Fons: només costes',
    it: 'Sfondo: solo coste', fr: 'Fond : côtes seules' },
  theme_auto: { en: 'Theme: automatic', es: 'Tema: automático', ca: 'Tema: automàtic',
    it: 'Tema: automatico', fr: 'Thème : automatique' },
  theme_light: { en: 'Theme: light', es: 'Tema: claro', ca: 'Tema: clar',
    it: 'Tema: chiaro', fr: 'Thème : clair' },
  theme_dark: { en: 'Theme: dark', es: 'Tema: oscuro', ca: 'Tema: fosc',
    it: 'Tema: scuro', fr: 'Thème : sombre' },
  theme_a11y: { en: 'Theme: accessible', es: 'Tema: accesible', ca: 'Tema: accessible',
    it: 'Tema: accessibile', fr: 'Thème : accessible' },
  aria_theme: { en: 'Colour theme', es: 'Tema de color', ca: 'Tema de color',
    it: 'Tema di colore', fr: 'Thème de couleur' },
  aria_base: { en: 'Base map', es: 'Mapa de fondo', ca: 'Mapa de fons',
    it: 'Mappa di sfondo', fr: 'Fond de carte' },
  aria_lang: { en: 'Language', es: 'Idioma', ca: 'Idioma', it: 'Lingua', fr: 'Langue' },

  /* ---- safety gate --------------------------------------------------- */
  gate_h: {
    en: 'Before using this',
    es: 'Antes de usar esto',
    ca: 'Abans d’utilitzar això',
    it: 'Prima di usare questo strumento',
    fr: 'Avant d’utiliser ceci' },
  gate_p1: {
    en: '<strong>Looking at the Sun without an ISO 12312-2 certified filter can cause permanent, painless retinal damage.</strong> Painless, because the retina has no pain receptors.',
    es: '<strong>Mirar al Sol sin un filtro certificado ISO 12312-2 puede provocar daño retiniano permanente e indoloro.</strong> Indoloro, porque la retina no tiene receptores de dolor.',
    ca: '<strong>Mirar el Sol sense un filtre certificat ISO 12312-2 pot provocar dany retinià permanent i indolor.</strong> Indolor, perquè la retina no té receptors de dolor.',
    it: '<strong>Guardare il Sole senza un filtro certificato ISO 12312-2 può provocare un danno retinico permanente e indolore.</strong> Indolore, perché la retina non ha recettori del dolore.',
    fr: '<strong>Regarder le Soleil sans filtre certifié ISO 12312-2 peut provoquer des lésions rétiniennes permanentes et indolores.</strong> Indolores, car la rétine n’a pas de récepteurs de la douleur.' },
  gate_p2: {
    en: 'The filter comes off <strong>between second and third contact</strong> — that is, during totality — and only inside the path of the umbra. Outside it there is no safe moment at all.',
    es: 'El filtro solo se retira <strong>entre el segundo y el tercer contacto</strong>, es decir durante la totalidad, y únicamente dentro de la franja umbral. Fuera de ella no hay ningún momento seguro.',
    ca: 'El filtre només es retira <strong>entre el segon i el tercer contacte</strong>, és a dir durant la totalitat, i únicament dins de la franja umbral. Fora d’aquesta franja no hi ha cap moment segur.',
    it: 'Il filtro si toglie <strong>tra il secondo e il terzo contatto</strong>, cioè durante la totalità, e soltanto dentro la fascia di totalità. Fuori non esiste alcun momento sicuro.',
    fr: 'Le filtre ne se retire qu’<strong>entre le deuxième et le troisième contact</strong>, c’est-à-dire pendant la totalité, et uniquement à l’intérieur de la bande de totalité. En dehors, aucun moment n’est sûr.' },
  gate_p3: {
    en: 'This page <strong>computes geometry</strong>. It does not say that looking is safe, under any circumstance and with any rounding. Read <a href="../SAFETY.md">SAFETY.md</a> before using any number from here to decide what to do with an eye or a camera.',
    es: 'Esta página <strong>calcula geometría</strong>. No dice que mirar sea seguro, en ninguna circunstancia y con ningún redondeo. Conviene leer <a href="../SAFETY.md">SAFETY.md</a> antes de usar cualquier número de aquí para decidir qué hacer con un ojo o con una cámara.',
    ca: 'Aquesta pàgina <strong>calcula geometria</strong>. No diu que mirar sigui segur, en cap circumstància ni amb cap arrodoniment. Cal llegir <a href="../SAFETY.md">SAFETY.md</a> abans d’utilitzar cap xifra d’aquí per decidir què fer amb un ull o amb una càmera.',
    it: 'Questa pagina <strong>calcola geometria</strong>. Non afferma che guardare sia sicuro, in nessuna circostanza e con nessun arrotondamento. Conviene leggere <a href="../SAFETY.md">SAFETY.md</a> prima di usare un qualsiasi numero di qui per decidere cosa fare con un occhio o con una fotocamera.',
    fr: 'Cette page <strong>calcule de la géométrie</strong>. Elle ne dit pas que regarder est sans danger, en aucune circonstance et avec aucun arrondi. Il faut lire <a href="../SAFETY.md">SAFETY.md</a> avant d’utiliser un chiffre d’ici pour décider quoi faire d’un œil ou d’un appareil photo.' },
  gate_ok: {
    en: 'Read and understood', es: 'Leído', ca: 'Llegit', it: 'Letto', fr: 'Lu' },

  /* ---- controls ------------------------------------------------------ */
  label_eclipse: { en: 'Eclipse', es: 'Eclipse', ca: 'Eclipsi', it: 'Eclissi', fr: 'Éclipse' },
  label_coords: { en: 'Coordinates', es: 'Coordenadas', ca: 'Coordenades',
    it: 'Coordinate', fr: 'Coordonnées' },
  ph_lat: { en: 'latitude', es: 'latitud', ca: 'latitud', it: 'latitudine', fr: 'latitude' },
  ph_lon: { en: 'longitude', es: 'longitud', ca: 'longitud', it: 'longitudine', fr: 'longitude' },
  btn_compute: { en: 'Compute', es: 'Calcular', ca: 'Calcula', it: 'Calcola', fr: 'Calculer' },
  btn_locate: { en: 'My location', es: 'Mi ubicación', ca: 'La meva ubicació',
    it: 'La mia posizione', fr: 'Ma position' },
  hint_mark: {
    en: 'Mark a point on the map to see the circumstances there.',
    es: 'Marca un punto en el mapa para ver las circunstancias ahí.',
    ca: 'Marca un punt al mapa per veure les circumstàncies allà.',
    it: 'Segna un punto sulla mappa per vedere le circostanze in quel luogo.',
    fr: 'Marquez un point sur la carte pour voir les circonstances à cet endroit.' },
  hint_place: {
    en: 'Or mark the point on the map directly. The location does not leave the browser: there is no server here.',
    es: 'O marca el punto directamente en el mapa. La ubicación no sale del navegador: aquí no hay servidor.',
    ca: 'O marca el punt directament al mapa. La ubicació no surt del navegador: aquí no hi ha servidor.',
    it: 'Oppure segna il punto direttamente sulla mappa. La posizione non esce dal browser: qui non c’è alcun server.',
    fr: 'Ou marquez le point directement sur la carte. La position ne quitte pas le navigateur : il n’y a pas de serveur ici.' },

  /* ---- eclipse types ------------------------------------------------- */
  type_total: { en: 'total', es: 'total', ca: 'total', it: 'totale', fr: 'totale' },
  type_annular: { en: 'annular', es: 'anular', ca: 'anular', it: 'anulare', fr: 'annulaire' },
  type_hybrid: { en: 'hybrid', es: 'híbrido', ca: 'híbrid', it: 'ibrida', fr: 'hybride' },
  type_partial: { en: 'partial', es: 'parcial', ca: 'parcial', it: 'parziale', fr: 'partielle' },

  /* ---- summary ------------------------------------------------------- */
  sum_line: {
    en: 'Greatest eclipse <b>{utc} UTC</b> · gamma <b>{gamma}</b>',
    es: 'Máximo <b>{utc} UTC</b> · gamma <b>{gamma}</b>',
    ca: 'Màxim <b>{utc} UTC</b> · gamma <b>{gamma}</b>',
    it: 'Massimo <b>{utc} UTC</b> · gamma <b>{gamma}</b>',
    fr: 'Maximum <b>{utc} UTC</b> · gamma <b>{gamma}</b>' },
  sum_magnitude: {
    en: '· magnitude <b>{mag}</b>', es: '· magnitud <b>{mag}</b>', ca: '· magnitud <b>{mag}</b>',
    it: '· magnitudine <b>{mag}</b>', fr: '· magnitude <b>{mag}</b>' },
  sum_greatest_at: {
    en: 'Greatest eclipse at <b>{lat} {lon}</b>',
    es: 'Eclipse máximo en <b>{lat} {lon}</b>',
    ca: 'Eclipsi màxim a <b>{lat} {lon}</b>',
    it: 'Eclissi massima a <b>{lat} {lon}</b>',
    fr: 'Éclipse maximale à <b>{lat} {lon}</b>' },
  sum_noncentral: {
    en: '<b>Non-central</b> eclipse: the shadow axis misses the Earth and {tail}.',
    es: 'Eclipse <b>no central</b>: el eje de la sombra pasa fuera de la Tierra y {tail}.',
    ca: 'Eclipsi <b>no central</b>: l’eix de l’ombra passa fora de la Terra i {tail}.',
    it: 'Eclissi <b>non centrale</b>: l’asse dell’ombra passa fuori dalla Terra e {tail}.',
    fr: 'Éclipse <b>non centrale</b> : l’axe de l’ombre passe hors de la Terre et {tail}.' },
  sum_noncentral_partial: {
    en: 'the umbra never touches it',
    es: 'la umbra no llega a rozarla',
    ca: 'l’ombra no arriba a fregar-la',
    it: 'l’ombra non la sfiora nemmeno',
    fr: 'l’ombre ne la frôle même pas' },
  sum_noncentral_umbra: {
    en: 'the umbra only grazes the limb, so this page does not draw its band even though it exists',
    es: 'la umbra solo roza el limbo, así que esta página no dibuja su franja aunque exista',
    ca: 'l’ombra només frega el limbe, de manera que aquesta pàgina no dibuixa la seva franja encara que existeixi',
    it: 'l’ombra sfiora soltanto il lembo, quindi questa pagina non ne disegna la fascia benché esista',
    fr: 'l’ombre ne fait qu’effleurer le limbe, de sorte que cette page ne trace pas sa bande bien qu’elle existe' },

  /* ---- legend -------------------------------------------------------- */
  leg_central: { en: 'central line', es: 'línea central', ca: 'línia central',
    it: 'linea centrale', fr: 'ligne centrale' },
  leg_umbra: { en: 'umbral limits', es: 'límites de la umbra', ca: 'límits de l’ombra',
    it: 'limiti dell’ombra', fr: 'limites de l’ombre' },
  leg_visibility: { en: 'visibility limit', es: 'límite de visibilidad', ca: 'límit de visibilitat',
    it: 'limite di visibilità', fr: 'limite de visibilité' },
  leg_obscuration: { en: 'greatest obscuration', es: 'obscuración máxima',
    ca: 'obscuració màxima', it: 'oscuramento massimo', fr: 'obscurcissement maximal' },
  leg_outline_note: {
    en: 'every 10% step is outlined',
    es: 'cada escalón del 10 % va contorneado',
    ca: 'cada esglaó del 10 % va contornejat',
    it: 'ogni gradino del 10% è contornato',
    fr: 'chaque palier de 10 % est souligné' },

  /* ---- point panel --------------------------------------------------- */
  pt_none_h: { en: 'No eclipse visible', es: 'Sin eclipse visible', ca: 'Cap eclipsi visible',
    it: 'Nessuna eclissi visibile', fr: 'Aucune éclipse visible' },
  pt_below: {
    en: 'The eclipse happens with the Sun below the horizon at this point.',
    es: 'El eclipse ocurre con el Sol bajo el horizonte en este punto.',
    ca: 'L’eclipsi passa amb el Sol sota l’horitzó en aquest punt.',
    it: 'L’eclissi avviene con il Sole sotto l’orizzonte in questo punto.',
    fr: 'L’éclipse a lieu avec le Soleil sous l’horizon en ce point.' },
  pt_outside: {
    en: 'This point falls outside the penumbra.',
    es: 'Este punto queda fuera de la penumbra.',
    ca: 'Aquest punt queda fora de la penombra.',
    it: 'Questo punto resta fuori dalla penombra.',
    fr: 'Ce point se trouve hors de la pénombre.' },
  pt_covered: {
    en: 'of the solar disk covered (by area), magnitude {mag}',
    es: 'del disco solar cubierto (área), magnitud {mag}',
    ca: 'del disc solar cobert (àrea), magnitud {mag}',
    it: 'del disco solare coperto (area), magnitudine {mag}',
    fr: 'du disque solaire couvert (aire), magnitude {mag}' },
  pt_phase: { en: 'of {kind} phase', es: 'de fase {kind}', ca: 'de fase {kind}',
    it: 'di fase {kind}', fr: 'de phase {kind}' },
  pt_below_max: {
    en: '⚠ The geometric maximum happens with the Sun below the horizon. The figure above is the greatest obscuration with the Sun visible.',
    es: '⚠ El máximo geométrico ocurre con el Sol bajo el horizonte. La cifra de arriba es la máxima obscuración con el Sol visible.',
    ca: '⚠ El màxim geomètric passa amb el Sol sota l’horitzó. La xifra de dalt és la màxima obscuració amb el Sol visible.',
    it: '⚠ Il massimo geometrico avviene con il Sole sotto l’orizzonte. La cifra qui sopra è il massimo oscuramento con il Sole visibile.',
    fr: '⚠ Le maximum géométrique se produit avec le Soleil sous l’horizon. Le chiffre ci-dessus est l’obscurcissement maximal avec le Soleil visible.' },
  pt_terrain_hidden: {
    en: '⚠ At maximum the Sun stands at {sun}° and the skyline here rises to {sky}°: from this exact spot it is not in view. The figure above is geometric and assumes a clear horizon.',
    es: '⚠ En el máximo el Sol está a {sun}° y el horizonte de aquí se levanta hasta {sky}°: desde este punto exacto no se ve. La cifra de arriba es geométrica y supone horizonte despejado.',
    ca: '⚠ Al màxim el Sol és a {sun}° i l’horitzó d’aquí s’aixeca fins a {sky}°: des d’aquest punt exacte no es veu. La xifra de dalt és geomètrica i suposa horitzó lliure.',
    it: '⚠ Al massimo il Sole sta a {sun}° e l’orizzonte qui si alza fino a {sky}°: da questo punto esatto non si vede. La cifra qui sopra è geometrica e presuppone un orizzonte sgombro.',
    fr: '⚠ Au maximum le Soleil est à {sun}° et l’horizon d’ici s’élève jusqu’à {sky}° : depuis ce point précis il n’est pas visible. Le chiffre ci-dessus est géométrique et suppose un horizon dégagé.' },
  tbl_contact: { en: 'contact', es: 'contacto', ca: 'contacte', it: 'contatto', fr: 'contact' },
  tbl_altaz: { en: 'alt / az', es: 'alt / az', ca: 'alt / az', it: 'alt / az', fr: 'haut. / az.' },
  c_C1: { en: 'first contact', es: 'primer contacto', ca: 'primer contacte',
    it: 'primo contatto', fr: 'premier contact' },
  c_C2: { en: 'central phase begins', es: 'empieza la fase central', ca: 'comença la fase central',
    it: 'inizia la fase centrale', fr: 'début de la phase centrale' },
  c_MAX: { en: 'maximum', es: 'máximo', ca: 'màxim', it: 'massimo', fr: 'maximum' },
  c_C3: { en: 'central phase ends', es: 'termina la fase central', ca: 'acaba la fase central',
    it: 'finisce la fase centrale', fr: 'fin de la phase centrale' },
  c_C4: { en: 'last contact', es: 'último contacto', ca: 'últim contacte',
    it: 'ultimo contatto', fr: 'dernier contact' },

  assume_h: { en: 'Assumptions.', es: 'Hipótesis.', ca: 'Hipòtesis.',
    it: 'Ipotesi.', fr: 'Hypothèses.' },
  assume_elev: {
    en: 'Ground elevation <b>{m} m</b>, taken from the elevation model.',
    es: 'Elevación del terreno <b>{m} m</b>, tomada del modelo de elevación.',
    ca: 'Elevació del terreny <b>{m} m</b>, presa del model d’elevació.',
    it: 'Quota del terreno <b>{m} m</b>, presa dal modello di elevazione.',
    fr: 'Altitude du terrain <b>{m} m</b>, tirée du modèle d’élévation.' },
  assume_sea: {
    en: 'Ground elevation 0 m and an astronomical horizon: real relief does not enter until it is asked for below, so a low Sun can sit behind a mountain this calculation cannot see.',
    es: 'Elevación del terreno 0 m y horizonte astronómico: el relieve real no entra hasta que se pide abajo, así que un Sol bajo puede quedar oculto tras una montaña que este cálculo no ve.',
    ca: 'Elevació del terreny 0 m i horitzó astronòmic: el relleu real no hi entra fins que es demana a sota, de manera que un Sol baix pot quedar amagat rere una muntanya que aquest càlcul no veu.',
    it: 'Quota del terreno 0 m e orizzonte astronomico: il rilievo reale non entra finché non lo si chiede qui sotto, quindi un Sole basso può restare nascosto dietro una montagna che questo calcolo non vede.',
    fr: 'Altitude du terrain 0 m et horizon astronomique : le relief réel n’intervient qu’à la demande ci-dessous, de sorte qu’un Soleil bas peut se cacher derrière une montagne que ce calcul ne voit pas.' },
  assume_rest: {
    en: 'Geometric solar altitude, no refraction. Besselian elements fitted from JPL DE440s, nominal IAU 2015 solar radius (695 700 km). Local times are the browser’s ({tz}), not the marked point’s.',
    es: 'Altura solar geométrica, sin refracción. Elementos besselianos ajustados desde JPL DE440s, radio solar IAU 2015 nominal (695 700 km). Las horas locales son las del navegador ({tz}), no las del punto marcado.',
    ca: 'Altura solar geomètrica, sense refracció. Elements besselians ajustats a partir de JPL DE440s, radi solar IAU 2015 nominal (695 700 km). Les hores locals són les del navegador ({tz}), no les del punt marcat.',
    it: 'Altezza solare geometrica, senza rifrazione. Elementi besseliani adattati da JPL DE440s, raggio solare IAU 2015 nominale (695 700 km). Gli orari locali sono quelli del browser ({tz}), non quelli del punto segnato.',
    fr: 'Hauteur solaire géométrique, sans réfraction. Éléments besséliens ajustés à partir de JPL DE440s, rayon solaire IAU 2015 nominal (695 700 km). Les heures locales sont celles du navigateur ({tz}), pas celles du point marqué.' },

  /* ---- place panel --------------------------------------------------- */
  pl_count_one: { en: '1 eclipse visible', es: '1 eclipse visible', ca: '1 eclipsi visible',
    it: '1 eclissi visibile', fr: '1 éclipse visible' },
  pl_count_many: { en: '{n} eclipses visible', es: '{n} eclipses visibles',
    ca: '{n} eclipsis visibles', it: '{n} eclissi visibili', fr: '{n} éclipses visibles' },
  pl_none: {
    en: 'No solar eclipse reaches this point between 2026 and 2050.',
    es: 'Ningún eclipse solar alcanza este punto entre 2026 y 2050.',
    ca: 'Cap eclipsi solar no arriba a aquest punt entre el 2026 i el 2050.',
    it: 'Nessuna eclissi solare raggiunge questo punto tra il 2026 e il 2050.',
    fr: 'Aucune éclipse solaire n’atteint ce point entre 2026 et 2050.' },
  pl_date: { en: 'date', es: 'fecha', ca: 'data', it: 'data', fr: 'date' },
  pl_covered: { en: 'covered', es: 'cubierto', ca: 'cobert', it: 'coperto', fr: 'couvert' },
  pl_duration: { en: 'duration', es: 'duración', ca: 'durada', it: 'durata', fr: 'durée' },
  pl_alt: { en: 'alt', es: 'alt', ca: 'alt', it: 'alt', fr: 'haut.' },
  pl_assume: {
    en: '<b>Visible</b> here means that some part of the eclipse happens with the Sun above the astronomical horizon and at sea level. Relief and weather are not taken into account.',
    es: '<b>Visible</b> significa aquí que alguna parte del eclipse ocurre con el Sol sobre el horizonte astronómico y a nivel del mar. No se tiene en cuenta el relieve ni las condiciones atmosféricas.',
    ca: '<b>Visible</b> vol dir aquí que alguna part de l’eclipsi passa amb el Sol sobre l’horitzó astronòmic i al nivell del mar. No es té en compte el relleu ni les condicions atmosfèriques.',
    it: '<b>Visibile</b> significa qui che una parte dell’eclissi avviene con il Sole sopra l’orizzonte astronomico e al livello del mare. Non si tiene conto del rilievo né delle condizioni atmosferiche.',
    fr: '<b>Visible</b> signifie ici qu’une partie de l’éclipse se produit avec le Soleil au-dessus de l’horizon astronomique et au niveau de la mer. Ni le relief ni les conditions atmosphériques ne sont pris en compte.' },

  /* ---- safety strip -------------------------------------------------- */
  safety_strip: {
    en: '<strong>An ISO 12312-2 filter is mandatory throughout the partial phase.</strong> It comes off only between C2 and C3, and only inside the path of the umbra. This page computes geometry; it does not authorize looking at the Sun. Read <a href="../SAFETY.md">SAFETY.md</a>.',
    es: '<strong>El filtro ISO 12312-2 es obligatorio durante toda la fase parcial.</strong> Solo se retira entre C2 y C3, y solo dentro de la franja umbral. Esta página calcula geometría; no autoriza a mirar al Sol. Léase <a href="../SAFETY.md">SAFETY.md</a>.',
    ca: '<strong>El filtre ISO 12312-2 és obligatori durant tota la fase parcial.</strong> Només es retira entre C2 i C3, i només dins de la franja umbral. Aquesta pàgina calcula geometria; no autoritza a mirar el Sol. Cal llegir <a href="../SAFETY.md">SAFETY.md</a>.',
    it: '<strong>Il filtro ISO 12312-2 è obbligatorio per tutta la fase parziale.</strong> Si toglie solo tra C2 e C3, e soltanto dentro la fascia di totalità. Questa pagina calcola geometria; non autorizza a guardare il Sole. Si legga <a href="../SAFETY.md">SAFETY.md</a>.',
    fr: '<strong>Le filtre ISO 12312-2 est obligatoire pendant toute la phase partielle.</strong> Il ne se retire qu’entre C2 et C3, et seulement dans la bande de totalité. Cette page calcule de la géométrie ; elle n’autorise pas à regarder le Soleil. Lire <a href="../SAFETY.md">SAFETY.md</a>.' },

  /* ---- terrain horizon ----------------------------------------------- */
  hz_button: {
    en: 'Check the real horizon here', es: 'Comprobar el horizonte real aquí',
    ca: 'Comprovar l’horitzó real aquí', it: 'Verificare qui l’orizzonte reale',
    fr: 'Vérifier l’horizon réel ici' },
  hz_intro: {
    en: 'Everything above assumes ground at sea level and an astronomical horizon. This downloads the elevation model for the area and works out the skyline towards the Sun, in this browser. It is the only part of the page that asks a third party for anything: a handful of images from an elevation server, which place the visitor inside a tile tens of kilometres across.',
    es: 'Todo lo de arriba supone terreno a nivel del mar y horizonte astronómico. Esto descarga el modelo de elevación de la zona y calcula el perfil del relieve hacia el Sol, en este navegador. Es la única parte de la página que pide algo a un tercero: unas cuantas imágenes de un servidor de elevación, que sitúan a quien mira dentro de una tesela de decenas de kilómetros.',
    ca: 'Tot el que hi ha a dalt suposa terreny al nivell del mar i horitzó astronòmic. Això descarrega el model d’elevació de la zona i calcula el perfil del relleu cap al Sol, en aquest navegador. És l’única part de la pàgina que demana res a un tercer: unes quantes imatges d’un servidor d’elevació, que situen qui mira dins d’una tessel·la de desenes de quilòmetres.',
    it: 'Tutto quanto sopra presuppone terreno al livello del mare e orizzonte astronomico. Questo scarica il modello di elevazione della zona e calcola il profilo del rilievo verso il Sole, in questo browser. È l’unica parte della pagina che chiede qualcosa a terzi: alcune immagini di un server di elevazione, che collocano chi guarda dentro una tessera di decine di chilometri.',
    fr: 'Tout ce qui précède suppose un terrain au niveau de la mer et un horizon astronomique. Ceci télécharge le modèle d’élévation de la zone et calcule le profil du relief vers le Soleil, dans ce navigateur. C’est la seule partie de la page qui demande quoi que ce soit à un tiers : quelques images d’un serveur d’élévation, qui situent le visiteur dans une tuile de plusieurs dizaines de kilomètres.' },
  hz_loading: {
    en: 'Downloading the terrain model…', es: 'Descargando el modelo del terreno…',
    ca: 'Descarregant el model del terreny…', it: 'Scaricamento del modello del terreno…',
    fr: 'Téléchargement du modèle de terrain…' },
  hz_failed: {
    en: 'The terrain could not be downloaded. Retry',
    es: 'No se pudo descargar el relieve. Reintentar',
    ca: 'No s’ha pogut descarregar el relleu. Torna-ho a provar',
    it: 'Non è stato possibile scaricare il rilievo. Riprovare',
    fr: 'Le relief n’a pas pu être téléchargé. Réessayer' },
  hz_sun: { en: 'Sun', es: 'Sol', ca: 'Sol', it: 'Sole', fr: 'Soleil' },
  hz_horizon: { en: 'horizon', es: 'horizonte', ca: 'horitzó', it: 'orizzonte', fr: 'horizon' },
  hz_in_view: { en: 'in view', es: 'a la vista', ca: 'a la vista', it: 'in vista', fr: 'visible' },
  hz_below: { en: 'below the horizon', es: 'bajo el horizonte', ca: 'sota l’horitzó',
    it: 'sotto l’orizzonte', fr: 'sous l’horizon' },
  hz_hidden: { en: 'hidden', es: 'tapado', ca: 'tapat', it: 'coperto', fr: 'masqué' },
  hz_by_obstacle: { en: ' (obstacle)', es: ' (obstáculo)', ca: ' (obstacle)',
    it: ' (ostacolo)', fr: ' (obstacle)' },
  hz_by_building: { en: ' (building)', es: ' (edificio)', ca: ' (edifici)',
    it: ' (edificio)', fr: ' (bâtiment)' },
  hz_at_dist: { en: ' (at {d})', es: ' (a {d})', ca: ' (a {d})', it: ' (a {d})', fr: ' (à {d})' },
  hz_assume_h: { en: 'Relief.', es: 'Relieve.', ca: 'Relleu.', it: 'Rilievo.', fr: 'Relief.' },
  hz_assume: {
    en: 'Elevation of the point <b>{elev} m</b>. Profile out to {radius} km, one sample every {step} m, {tiles} tiles from {credit}. Earth curvature and mean refraction (k = 0.13): near the ground and at sunset the real refraction swings enough to move a distant skyline by a few arcminutes. An obstacle beyond {radius} km does not enter, and neither does vegetation.',
    es: 'Elevación del punto <b>{elev} m</b>. Perfil hasta {radius} km, una muestra cada {step} m, {tiles} teselas de {credit}. Curvatura terrestre y refracción media (k = 0,13): cerca del suelo y al ocaso la refracción real se mueve lo bastante como para correr un horizonte lejano unos minutos de arco. Un obstáculo más allá de {radius} km no entra, y tampoco entra la vegetación.',
    ca: 'Elevació del punt <b>{elev} m</b>. Perfil fins a {radius} km, una mostra cada {step} m, {tiles} tessel·les de {credit}. Curvatura terrestre i refracció mitjana (k = 0,13): a prop del sòl i al capvespre la refracció real es mou prou com per desplaçar un horitzó llunyà uns minuts d’arc. Un obstacle més enllà de {radius} km no hi entra, i la vegetació tampoc.',
    it: 'Quota del punto <b>{elev} m</b>. Profilo fino a {radius} km, un campione ogni {step} m, {tiles} tessere da {credit}. Curvatura terrestre e rifrazione media (k = 0,13): vicino al suolo e al tramonto la rifrazione reale oscilla abbastanza da spostare un orizzonte lontano di qualche minuto d’arco. Un ostacolo oltre {radius} km non entra, e nemmeno la vegetazione.',
    fr: 'Altitude du point <b>{elev} m</b>. Profil jusqu’à {radius} km, un échantillon tous les {step} m, {tiles} tuiles de {credit}. Courbure terrestre et réfraction moyenne (k = 0,13) : près du sol et au coucher, la réfraction réelle varie assez pour déplacer un horizon lointain de quelques minutes d’arc. Un obstacle au-delà de {radius} km n’entre pas, et la végétation non plus.' },
  hz_buildings_btn: {
    en: 'Add OpenStreetMap buildings', es: 'Añadir edificios de OpenStreetMap',
    ca: 'Afegir edificis d’OpenStreetMap', it: 'Aggiungere edifici da OpenStreetMap',
    fr: 'Ajouter les bâtiments d’OpenStreetMap' },
  hz_buildings_failed: {
    en: 'OpenStreetMap did not answer. Retry', es: 'OpenStreetMap no respondió. Reintentar',
    ca: 'OpenStreetMap no ha respost. Torna-ho a provar',
    it: 'OpenStreetMap non ha risposto. Riprovare',
    fr: 'OpenStreetMap n’a pas répondu. Réessayer' },
  hz_buildings_note: {
    en: '<b>Buildings out to 400 m:</b> of {total}, {n} declare a height in OpenStreetMap{guess}. The rest do not, and do not enter; beyond 400 m none is queried, so a distant tower at the end of an avenue is not in this count.',
    es: '<b>Edificios hasta 400 m:</b> de {total}, {n} declaran altura en OpenStreetMap{guess}. Los demás no la declaran y no entran, y más allá de 400 m no se consulta ninguno: una torre lejana al final de una avenida no está en esta cuenta.',
    ca: '<b>Edificis fins a 400 m:</b> de {total}, {n} declaren altura a OpenStreetMap{guess}. La resta no la declaren i no hi entren, i més enllà de 400 m no se’n consulta cap: una torre llunyana al final d’una avinguda no és en aquest compte.',
    it: '<b>Edifici fino a 400 m:</b> su {total}, {n} dichiarano un’altezza in OpenStreetMap{guess}. Gli altri non la dichiarano e non entrano, e oltre i 400 m non se ne consulta nessuno: una torre lontana in fondo a un viale non è in questo conto.',
    fr: '<b>Bâtiments jusqu’à 400 m :</b> sur {total}, {n} déclarent une hauteur dans OpenStreetMap{guess}. Les autres ne la déclarent pas et n’entrent pas, et au-delà de 400 m aucun n’est interrogé : une tour lointaine au bout d’une avenue n’est pas dans ce compte.' },
  hz_buildings_guess: {
    en: ' ({n} inferred from the number of storeys, at 3 m each)',
    es: ' ({n} deducidas del número de plantas, a 3 m cada una)',
    ca: ' ({n} deduïdes del nombre de plantes, a 3 m cadascuna)',
    it: ' ({n} dedotte dal numero di piani, a 3 m ciascuno)',
    fr: ' ({n} déduites du nombre d’étages, à 3 m chacun)' },
  hz_obstacle_label: {
    en: 'Own obstacle', es: 'Obstáculo propio', ca: 'Obstacle propi',
    it: 'Ostacolo proprio', fr: 'Obstacle propre' },
  hz_obstacle_h: { en: 'height m', es: 'altura m', ca: 'altura m', it: 'altezza m', fr: 'hauteur m' },
  hz_obstacle_d: { en: 'distance m', es: 'distancia m', ca: 'distància m',
    it: 'distanza m', fr: 'distance m' },
  hz_obstacle_hint: {
    en: 'A building or a line of trees the model cannot see. It applies in every direction{alt}.',
    es: 'Un edificio o una arboleda que el modelo no ve. Se aplica en todas las direcciones{alt}.',
    ca: 'Un edifici o una arbreda que el model no veu. S’aplica en totes les direccions{alt}.',
    it: 'Un edificio o una fila di alberi che il modello non vede. Si applica in tutte le direzioni{alt}.',
    fr: 'Un bâtiment ou une rangée d’arbres que le modèle ne voit pas. S’applique dans toutes les directions{alt}.' },
  hz_obstacle_alt: { en: ': {a}° high', es: ': {a}° de altura', ca: ': {a}° d’altura',
    it: ': {a}° di altezza', fr: ' : {a}° de hauteur' },

  /* ---- intensity block ----------------------------------------------- */
  int_h: { en: 'Intensity.', es: 'Intensidad.', ca: 'Intensitat.',
    it: 'Intensità.', fr: 'Intensité.' },
  int_left: {
    en: '<b>{left}</b> of the disk area is left. Direct irradiance falls roughly in that proportion, a little less because limb darkening makes the edge contribute less than the centre.',
    es: 'Queda <b>{left}</b> del área del disco. La irradiancia directa cae aproximadamente en esa proporción, algo menos porque el oscurecimiento del limbo hace que el borde aporte menos que el centro.',
    ca: 'Queda <b>{left}</b> de l’àrea del disc. La irradiància directa cau aproximadament en aquesta proporció, una mica menys perquè l’enfosquiment del limbe fa que la vora aporti menys que el centre.',
    it: 'Resta <b>{left}</b> dell’area del disco. L’irradianza diretta cala all’incirca in quella proporzione, un po’ meno perché l’oscuramento al lembo fa sì che il bordo contribuisca meno del centro.',
    fr: 'Il reste <b>{left}</b> de l’aire du disque. L’éclairement énergétique direct baisse à peu près dans cette proportion, un peu moins car l’assombrissement centre-bord fait que le bord contribue moins que le centre.' },
  int_radiance: {
    en: '<b>What does not fall is the brightness.</b> Photospheric radiance is invariant under occultation: the Moon removes area, not surface brightness. That is why the ICNIRP retinal thermal limit is stated as a radiance, and why a 99% partial phase still projects the same luminance onto the retina as the whole Sun.',
    es: '<b>Lo que no cae es el brillo.</b> La radiancia de la fotosfera es invariante bajo ocultación: la Luna quita área, no brillo superficial. Por eso el límite térmico retiniano de ICNIRP se expresa como radiancia, y por eso una fase parcial del 99 % sigue proyectando sobre la retina la misma luminancia que el Sol entero.',
    ca: '<b>El que no cau és la lluminositat.</b> La radiància de la fotosfera és invariant sota ocultació: la Lluna treu àrea, no lluminositat superficial. Per això el límit tèrmic retinià d’ICNIRP s’expressa com a radiància, i per això una fase parcial del 99 % continua projectant sobre la retina la mateixa luminància que el Sol sencer.',
    it: '<b>Ciò che non cala è la luminosità.</b> La radianza della fotosfera è invariante sotto occultazione: la Luna toglie area, non luminosità superficiale. Per questo il limite termico retinico dell’ICNIRP si esprime come radianza, e per questo una fase parziale del 99% proietta ancora sulla retina la stessa luminanza del Sole intero.',
    fr: '<b>Ce qui ne baisse pas, c’est la brillance.</b> La luminance énergétique de la photosphère est invariante sous occultation : la Lune retire de l’aire, pas de la brillance surfacique. C’est pourquoi la limite thermique rétinienne de l’ICNIRP s’exprime en luminance, et pourquoi une phase partielle à 99 % projette encore sur la rétine la même luminance que le Soleil entier.' },
  int_compute: {
    en: '<b>Irradiance can be computed</b>, but it does not come precomputed: it depends on the atmospheric state of the point and the day, which this project has measured only over the Ebro. The button below solves the spectral model <b>on this machine</b>, under a declared atmosphere, so the number carries the hypothesis it comes from. The worked case from the manuscript is in <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.',
    es: '<b>La irradiancia sí se puede calcular</b>, pero no viene precalculada: depende del estado atmosférico del punto y del día, que este proyecto no tiene medido más que sobre el Ebro. Lo que hace el botón de abajo es resolver el modelo espectral <b>en este equipo</b>, con la atmósfera que se declare, para que el número lleve pegada la hipótesis de la que sale. El caso resuelto del manuscrito está en <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.',
    ca: '<b>La irradiància sí que es pot calcular</b>, però no ve precalculada: depèn de l’estat atmosfèric del punt i del dia, que aquest projecte només té mesurat sobre l’Ebre. El que fa el botó de sota és resoldre el model espectral <b>en aquest equip</b>, amb l’atmosfera que es declari, perquè la xifra dugui enganxada la hipòtesi de què surt. El cas resolt del manuscrit és a <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.',
    it: '<b>L’irradianza si può calcolare</b>, ma non arriva precalcolata: dipende dallo stato atmosferico del punto e del giorno, che questo progetto ha misurato soltanto sull’Ebro. Il pulsante qui sotto risolve il modello spettrale <b>su questa macchina</b>, con l’atmosfera dichiarata, perché la cifra porti con sé l’ipotesi da cui esce. Il caso risolto del manoscritto è in <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.',
    fr: '<b>L’éclairement énergétique, lui, se calcule</b>, mais il n’arrive pas précalculé : il dépend de l’état atmosphérique du point et du jour, que ce projet n’a mesuré qu’au-dessus de l’Èbre. Le bouton ci-dessous résout le modèle spectral <b>sur cette machine</b>, sous une atmosphère déclarée, pour que le chiffre porte l’hypothèse dont il sort. Le cas résolu du manuscrit se trouve dans <a href="../docs/FINDINGS.md">docs/FINDINGS.md</a>.' },

  /* ---- radiometry ---------------------------------------------------- */
  rad_button: {
    en: 'Compute irradiance and ocular exposure here',
    es: 'Calcular irradiancia y exposición ocular aquí',
    ca: 'Calcular irradiància i exposició ocular aquí',
    it: 'Calcolare irradianza ed esposizione oculare qui',
    fr: 'Calculer l’éclairement et l’exposition oculaire ici' },
  rad_button_busy: {
    en: 'Computing on this machine…', es: 'Calculando en este equipo…',
    ca: 'Calculant en aquest equip…', it: 'Calcolo su questa macchina…',
    fr: 'Calcul sur cette machine…' },
  rad_hint: {
    en: 'SPECTRL2 is solved over 122 wavelengths, together with limb darkening and the ICNIRP 2013 limits, on this machine. About two tenths of a second. Nothing is sent anywhere.',
    es: 'Se resuelve SPECTRL2 sobre 122 longitudes de onda, el oscurecimiento del limbo y los límites de ICNIRP 2013 en este equipo. Unas dos décimas de segundo. Nada se envía a ningún sitio.',
    ca: 'Es resol SPECTRL2 sobre 122 longituds d’ona, l’enfosquiment del limbe i els límits d’ICNIRP 2013 en aquest equip. Unes dues dècimes de segon. No s’envia res enlloc.',
    it: 'SPECTRL2 viene risolto su 122 lunghezze d’onda, insieme all’oscuramento al lembo e ai limiti ICNIRP 2013, su questa macchina. Circa due decimi di secondo. Nulla viene inviato da nessuna parte.',
    fr: 'SPECTRL2 est résolu sur 122 longueurs d’onde, avec l’assombrissement centre-bord et les limites ICNIRP 2013, sur cette machine. Environ deux dixièmes de seconde. Rien n’est envoyé nulle part.' },
  atm_h: { en: 'Assumed atmosphere', es: 'Atmósfera supuesta', ca: 'Atmosfera suposada',
    it: 'Atmosfera ipotizzata', fr: 'Atmosphère supposée' },
  atm_g173: {
    en: 'ASTM G173-03 — reference case', es: 'ASTM G173-03 — caso de referencia',
    ca: 'ASTM G173-03 — cas de referència', it: 'ASTM G173-03 — caso di riferimento',
    fr: 'ASTM G173-03 — cas de référence' },
  atm_ebro: {
    en: 'Ebro, 12 Aug 2026 — measured (CAMS + ECMWF + WOUDC)',
    es: 'Ebro, 12 ago 2026 — medida (CAMS + ECMWF + WOUDC)',
    ca: 'Ebre, 12 ago 2026 — mesurada (CAMS + ECMWF + WOUDC)',
    it: 'Ebro, 12 ago 2026 — misurata (CAMS + ECMWF + WOUDC)',
    fr: 'Èbre, 12 août 2026 — mesurée (CAMS + ECMWF + WOUDC)' },
  atm_custom: { en: 'Declared here', es: 'La declarada aquí', ca: 'La declarada aquí',
    it: 'Quella dichiarata qui', fr: 'Celle déclarée ici' },
  atm_aod: { en: 'Aerosol AOD', es: 'Aerosol AOD', ca: 'Aerosol AOD',
    it: 'Aerosol AOD', fr: 'AOD des aérosols' },
  atm_water: { en: 'Precipitable water', es: 'Agua precipitable', ca: 'Aigua precipitable',
    it: 'Acqua precipitabile', fr: 'Eau précipitable' },
  atm_ozone: { en: 'Ozone', es: 'Ozono', ca: 'Ozó', it: 'Ozono', fr: 'Ozone' },
  atm_pressure: { en: 'Pressure', es: 'Presión', ca: 'Pressió', it: 'Pressione', fr: 'Pression' },
  atm_hint: {
    en: 'This is <b>not a measurement of the marked point</b>: it is what has been declared here. The result holds under that hypothesis and not outside it.',
    es: 'Esto <b>no es una medida del punto marcado</b>: es lo que se declara aquí. El resultado vale bajo esa hipótesis y no fuera de ella.',
    ca: 'Això <b>no és una mesura del punt marcat</b>: és el que es declara aquí. El resultat val sota aquesta hipòtesi i no fora d’ella.',
    it: 'Questa <b>non è una misura del punto segnato</b>: è ciò che si dichiara qui. Il risultato vale sotto quell’ipotesi e non fuori di essa.',
    fr: 'Ceci <b>n’est pas une mesure du point marqué</b> : c’est ce qui est déclaré ici. Le résultat vaut sous cette hypothèse et pas en dehors.' },
  atm_recompute: {
    en: 'Recompute with this atmosphere', es: 'Recalcular con esta atmósfera',
    ca: 'Recalcular amb aquesta atmosfera', it: 'Ricalcolare con questa atmosfera',
    fr: 'Recalculer avec cette atmosphère' },

  rad_h_beam: { en: 'Direct-beam irradiance', es: 'Irradiancia del haz directo',
    ca: 'Irradiància del feix directe', it: 'Irradianza del fascio diretto',
    fr: 'Éclairement du faisceau direct' },
  rad_no_moon: { en: 'Without the Moon, at maximum', es: 'Sin la Luna, al máximo',
    ca: 'Sense la Lluna, al màxim', it: 'Senza la Luna, al massimo',
    fr: 'Sans la Lune, au maximum' },
  rad_with_moon: { en: 'With the Moon, at maximum', es: 'Con la Luna, al máximo',
    ca: 'Amb la Lluna, al màxim', it: 'Con la Luna, al massimo',
    fr: 'Avec la Lune, au maximum' },
  rad_flux_deficit: {
    en: 'Flux deficit (with limb darkening)', es: 'Déficit de flujo (con oscurecimiento del limbo)',
    ca: 'Dèficit de flux (amb enfosquiment del limbe)',
    it: 'Deficit di flusso (con oscuramento al lembo)',
    fr: 'Déficit de flux (avec assombrissement centre-bord)' },
  rad_area_deficit: { en: 'Geometric area deficit', es: 'Déficit geométrico de área',
    ca: 'Dèficit geomètric d’àrea', it: 'Deficit geometrico di area',
    fr: 'Déficit géométrique d’aire' },
  rad_lux: { en: 'Beam illuminance at maximum', es: 'Iluminancia del haz al máximo',
    ca: 'Il·luminància del feix al màxim', it: 'Illuminamento del fascio al massimo',
    fr: 'Éclairement lumineux du faisceau au maximum' },
  rad_airmass: { en: 'Air mass at maximum', es: 'Masa de aire al máximo',
    ca: 'Massa d’aire al màxim', it: 'Massa d’aria al massimo', fr: 'Masse d’air au maximum' },
  rad_totality_note: {
    en: 'During totality the direct beam is exactly zero, which is why the watts and lux above are too. What is visible then is the corona, which this model <b>does not include</b>: it is of order a million times fainter than the photosphere and calls for different physics.',
    es: 'Durante la totalidad el haz directo es exactamente cero, y por eso lo son también los vatios y los lux de arriba. Lo que se ve entonces es la corona, que este modelo <b>no incluye</b>: es del orden de un millón de veces más débil que la fotosfera y pide otra física.',
    ca: 'Durant la totalitat el feix directe és exactament zero, i per això també ho són els watts i els lux de dalt. El que es veu llavors és la corona, que aquest model <b>no inclou</b>: és de l’ordre d’un milió de vegades més feble que la fotosfera i demana una altra física.',
    it: 'Durante la totalità il fascio diretto è esattamente zero, e per questo lo sono anche i watt e i lux qui sopra. Quello che si vede allora è la corona, che questo modello <b>non include</b>: è dell’ordine di un milione di volte più debole della fotosfera e richiede un’altra fisica.',
    fr: 'Pendant la totalité, le faisceau direct est exactement nul, et c’est pourquoi les watts et les lux ci-dessus le sont aussi. Ce que l’on voit alors, c’est la couronne, que ce modèle <b>n’inclut pas</b> : elle est de l’ordre d’un million de fois plus faible que la photosphère et relève d’une autre physique.' },
  rad_h_icnirp: {
    en: 'ICNIRP 2013 ocular exposure limits', es: 'Límites de exposición ocular ICNIRP 2013',
    ca: 'Límits d’exposició ocular ICNIRP 2013', it: 'Limiti di esposizione oculare ICNIRP 2013',
    fr: 'Limites d’exposition oculaire ICNIRP 2013' },
  rad_thermal: {
    en: 'Retinal thermal limit, worst moment', es: 'Límite térmico retiniano, peor momento',
    ca: 'Límit tèrmic retinià, pitjor moment', it: 'Limite termico retinico, momento peggiore',
    fr: 'Limite thermique rétinienne, pire moment' },
  rad_stare3: {
    en: 'Fixation the photochemical limit allows, 3 mm pupil',
    es: 'Fijación que admite el límite fotoquímico, pupila 3 mm',
    ca: 'Fixació que admet el límit fotoquímic, pupil·la 3 mm',
    it: 'Fissazione ammessa dal limite fotochimico, pupilla 3 mm',
    fr: 'Fixation admise par la limite photochimique, pupille 3 mm' },
  rad_stare7: {
    en: 'The same with the pupil dilated to 7 mm',
    es: 'Lo mismo con pupila dilatada a 7 mm',
    ca: 'El mateix amb pupil·la dilatada a 7 mm',
    it: 'Lo stesso con pupilla dilatata a 7 mm',
    fr: 'Idem avec la pupille dilatée à 7 mm' },
  rad_filter: {
    en: 'Transmittance a filter would need', es: 'Transmitancia que tendría que tener un filtro',
    ca: 'Transmitància que hauria de tenir un filtre',
    it: 'Trasmittanza che dovrebbe avere un filtro',
    fr: 'Transmittance que devrait avoir un filtre' },
  rad_filter_which: {
    en: 'the {which} limit governs; the other asks for {other}',
    es: 'manda el límite {which}; el otro pide {other}',
    ca: 'mana el límit {which}; l’altre demana {other}',
    it: 'comanda il limite {which}; l’altro chiede {other}',
    fr: 'la limite {which} commande ; l’autre demande {other}' },
  rad_thermal_word: { en: 'thermal', es: 'térmico', ca: 'tèrmic', it: 'termico', fr: 'thermique' },
  rad_photo_word: { en: 'photochemical', es: 'fotoquímico', ca: 'fotoquímic',
    it: 'fotochimico', fr: 'photochimique' },
  rad_nofilter: {
    en: 'Under these hypotheses the model finds no attenuation factor <em>required by the two ICNIRP equations</em>, which happens with a very low Sun or a very loaded atmosphere. This is not an authorization: the standard bounds what it bounds, the ISO 12312-2 filter remains mandatory, and the model is extrapolating precisely there.',
    es: 'Bajo estas hipótesis el modelo no encuentra ningún factor de atenuación <em>exigido por las dos ecuaciones de ICNIRP</em>, cosa que ocurre con el Sol muy bajo o con una atmósfera muy cargada. No es una autorización: la norma acota lo que acota, el filtro ISO 12312-2 sigue siendo obligatorio y el modelo está extrapolando justamente ahí.',
    ca: 'Sota aquestes hipòtesis el model no troba cap factor d’atenuació <em>exigit per les dues equacions d’ICNIRP</em>, cosa que passa amb el Sol molt baix o amb una atmosfera molt carregada. No és una autorització: la norma acota el que acota, el filtre ISO 12312-2 continua sent obligatori i el model està extrapolant justament aquí.',
    it: 'Sotto queste ipotesi il modello non trova alcun fattore di attenuazione <em>richiesto dalle due equazioni ICNIRP</em>, cosa che accade con il Sole molto basso o con un’atmosfera molto carica. Non è un’autorizzazione: la norma delimita ciò che delimita, il filtro ISO 12312-2 resta obbligatorio e il modello sta estrapolando proprio lì.',
    fr: 'Sous ces hypothèses, le modèle ne trouve aucun facteur d’atténuation <em>exigé par les deux équations de l’ICNIRP</em>, ce qui arrive avec un Soleil très bas ou une atmosphère très chargée. Ce n’est pas une autorisation : la norme borne ce qu’elle borne, le filtre ISO 12312-2 reste obligatoire et le modèle extrapole justement là.' },
  rad_what_h: { en: 'What this is and what it is not.', es: 'Qué es esto y qué no.',
    ca: 'Què és això i què no.', it: 'Che cos’è e che cosa non è.',
    fr: 'Ce que c’est et ce que ce n’est pas.' },
  rad_what: {
    en: 'These are the ICNIRP 2013 equations evaluated under the hypotheses declared here, not a recommendation of how long to look. A limit marks where known risk begins, not how far it is prudent to go. It assumes a healthy eye, without refractive surgery or photosensitizing medication, and a pupil diameter nobody can measure in the field. The thermal ratio compares photospheric radiance against the table 4 limit; radiance <b>does not fall</b> with occultation — what falls is the crescent’s angular subtense, and that is what moves the limit.',
    es: 'Son las ecuaciones de ICNIRP 2013 evaluadas bajo las hipótesis declaradas aquí, no una recomendación de cuánto mirar. Un límite marca dónde empieza el riesgo conocido, no hasta dónde es prudente llegar. Supone un ojo sano, sin cirugía refractiva ni medicación fotosensibilizante, y un diámetro pupilar que nadie puede medir en el campo. La razón térmica compara la radiancia de la fotosfera con el límite de la tabla 4; la radiancia <b>no baja</b> con la ocultación, lo que baja es la subtensa del creciente, que es lo que mueve el límite.',
    ca: 'Són les equacions d’ICNIRP 2013 avaluades sota les hipòtesis declarades aquí, no una recomanació de quant mirar. Un límit marca on comença el risc conegut, no fins on és prudent arribar. Suposa un ull sa, sense cirurgia refractiva ni medicació fotosensibilitzant, i un diàmetre pupil·lar que ningú pot mesurar al camp. La raó tèrmica compara la radiància de la fotosfera amb el límit de la taula 4; la radiància <b>no baixa</b> amb l’ocultació, el que baixa és la subtensió del creixent, que és el que mou el límit.',
    it: 'Sono le equazioni ICNIRP 2013 valutate sotto le ipotesi dichiarate qui, non una raccomandazione su quanto guardare. Un limite segna dove comincia il rischio noto, non fin dove è prudente arrivare. Presuppone un occhio sano, senza chirurgia refrattiva né farmaci fotosensibilizzanti, e un diametro pupillare che nessuno può misurare sul campo. Il rapporto termico confronta la radianza della fotosfera con il limite della tabella 4; la radianza <b>non cala</b> con l’occultazione, ciò che cala è l’angolo sotteso dalla falce, ed è questo a spostare il limite.',
    fr: 'Ce sont les équations de l’ICNIRP 2013 évaluées sous les hypothèses déclarées ici, pas une recommandation sur la durée de l’observation. Une limite marque où commence le risque connu, pas jusqu’où il est prudent d’aller. Elle suppose un œil sain, sans chirurgie réfractive ni médicament photosensibilisant, et un diamètre pupillaire que personne ne peut mesurer sur le terrain. Le rapport thermique compare la luminance de la photosphère à la limite du tableau 4 ; la luminance <b>ne baisse pas</b> avec l’occultation, ce qui baisse est l’angle sous-tendu par le croissant, et c’est cela qui déplace la limite.' },
  rad_clamped: {
    en: '<b style="color:var(--hot)">Values corrected.</b> {n} of the values entered fell outside what is physically possible and were pulled to the edge of the range before computing.',
    es: '<b style="color:var(--hot)">Valores corregidos.</b> {n} de los introducidos caían fuera de lo físicamente posible y se han llevado al borde del rango antes de calcular.',
    ca: '<b style="color:var(--hot)">Valors corregits.</b> {n} dels introduïts queien fora del que és físicament possible i s’han portat a la vora del rang abans de calcular.',
    it: '<b style="color:var(--hot)">Valori corretti.</b> {n} di quelli inseriti cadevano fuori da ciò che è fisicamente possibile e sono stati portati al bordo dell’intervallo prima del calcolo.',
    fr: '<b style="color:var(--hot)">Valeurs corrigées.</b> {n} des valeurs saisies sortaient du physiquement possible et ont été ramenées au bord de la plage avant le calcul.' },
  rad_unc_h: { en: 'Uncertainty.', es: 'Incertidumbre.', ca: 'Incertesa.',
    it: 'Incertezza.', fr: 'Incertitude.' },
  rad_unc_am: { en: 'The air mass at maximum is {am}.', es: 'La masa de aire al máximo es {am}.',
    ca: 'La massa d’aire al màxim és {am}.', it: 'La massa d’aria al massimo è {am}.',
    fr: 'La masse d’air au maximum est {am}.' },
  rad_unc_far: {
    en: 'Past about six air masses the clear-sky empirical models are extrapolating a long way from where they were fitted: this work found that at air mass 10.7 three published models differ by a factor of three. Take the figure as the order of magnitude it is.',
    es: 'A partir de unas seis masas de aire los modelos empíricos de cielo claro están extrapolando muy lejos de donde se ajustaron: este trabajo encontró que a masa de aire 10,7 tres modelos publicados difieren en un factor tres. Conviene tomar la cifra como el orden de magnitud que es.',
    ca: 'A partir d’unes sis masses d’aire els models empírics de cel serè estan extrapolant molt lluny d’on es van ajustar: aquest treball va trobar que a massa d’aire 10,7 tres models publicats difereixen en un factor tres. Convé prendre la xifra com l’ordre de magnitud que és.',
    it: 'Oltre circa sei masse d’aria i modelli empirici di cielo sereno estrapolano molto lontano da dove sono stati calibrati: questo lavoro ha trovato che a massa d’aria 10,7 tre modelli pubblicati differiscono di un fattore tre. Conviene prendere la cifra per l’ordine di grandezza che è.',
    fr: 'Au-delà d’environ six masses d’air, les modèles empiriques de ciel clair extrapolent très loin de leur domaine d’ajustement : ce travail a trouvé qu’à la masse d’air 10,7 trois modèles publiés diffèrent d’un facteur trois. Il convient de prendre le chiffre pour l’ordre de grandeur qu’il est.' },
  rad_unc_near: {
    en: 'Inside the range where the model is fitted.', es: 'Dentro del rango donde el modelo está ajustado.',
    ca: 'Dins del rang on el model està ajustat.', it: 'Dentro l’intervallo in cui il modello è calibrato.',
    fr: 'Dans la plage où le modèle est ajusté.' },
  rad_bracket: {
    en: 'Aerosol sensitivity: with AOD between {lo} and {hi} (half and double the declared value), the beam irradiance without the Moon at its strongest goes from {dhi} to {dlo} W/m², and the thermal ratio from {rhi} to {rlo}. That is sensitivity to one parameter, not an uncertainty budget.',
    es: 'Sensibilidad al aerosol: con AOD entre {lo} y {hi} (la mitad y el doble del declarado), la irradiancia del haz sin la Luna en su momento más intenso va de {dhi} a {dlo} W/m² y la razón térmica de {rhi} a {rlo}. Es sensibilidad a un parámetro, no un presupuesto de incertidumbre.',
    ca: 'Sensibilitat a l’aerosol: amb AOD entre {lo} i {hi} (la meitat i el doble del declarat), la irradiància del feix sense la Lluna en el seu moment més intens va de {dhi} a {dlo} W/m² i la raó tèrmica de {rhi} a {rlo}. És sensibilitat a un paràmetre, no un pressupost d’incertesa.',
    it: 'Sensibilità all’aerosol: con AOD tra {lo} e {hi} (metà e doppio del dichiarato), l’irradianza del fascio senza la Luna nel suo momento più intenso va da {dhi} a {dlo} W/m² e il rapporto termico da {rhi} a {rlo}. È sensibilità a un parametro, non un bilancio d’incertezza.',
    fr: 'Sensibilité à l’aérosol : avec un AOD entre {lo} et {hi} (moitié et double du déclaré), l’éclairement du faisceau sans la Lune à son maximum va de {dhi} à {dlo} W/m² et le rapport thermique de {rhi} à {rlo}. C’est une sensibilité à un paramètre, pas un budget d’incertitude.' },
  rad_chart_label: {
    en: 'W/m² (direct beam) — grey: without the Moon',
    es: 'W/m² (haz directo) — gris: sin Luna',
    ca: 'W/m² (feix directe) — gris: sense Lluna',
    it: 'W/m² (fascio diretto) — grigio: senza Luna',
    fr: 'W/m² (faisceau direct) — gris : sans la Lune' },
  rad_no_bound: {
    en: 'the standard does not bound beyond {h} h', es: 'la norma no acota más allá de {h} h',
    ca: 'la norma no acota més enllà de {h} h', it: 'la norma non delimita oltre {h} h',
    fr: 'la norme ne borne pas au-delà de {h} h' },

  /* ---- errors and notices -------------------------------------------- */
  err_coords_h: { en: 'Invalid coordinates', es: 'Coordenadas no válidas',
    ca: 'Coordenades no vàlides', it: 'Coordinate non valide', fr: 'Coordonnées non valides' },
  err_coords_p: {
    en: 'Latitude runs from −90 to 90 and longitude has to be a number. Longitudes outside ±180 wrap on their own.',
    es: 'La latitud va de −90 a 90 y la longitud tiene que ser un número. Las longitudes fuera de ±180 se envuelven solas.',
    ca: 'La latitud va de −90 a 90 i la longitud ha de ser un número. Les longituds fora de ±180 s’emboliquen soles.',
    it: 'La latitudine va da −90 a 90 e la longitudine deve essere un numero. Le longitudini fuori da ±180 si riavvolgono da sole.',
    fr: 'La latitude va de −90 à 90 et la longitude doit être un nombre. Les longitudes hors de ±180 se replient d’elles-mêmes.' },
  rad_no_eclipse: {
    en: 'No eclipse above the horizon here.', es: 'Aquí no hay eclipse sobre el horizonte.',
    ca: 'Aquí no hi ha eclipsi sobre l’horitzó.', it: 'Qui non c’è eclissi sopra l’orizzonte.',
    fr: 'Pas d’éclipse au-dessus de l’horizon ici.' },
  err_geo: {
    en: 'The browser did not give a location.', es: 'El navegador no dio la ubicación.',
    ca: 'El navegador no ha donat la ubicació.', it: 'Il browser non ha fornito la posizione.',
    fr: 'Le navigateur n’a pas fourni de position.' },
  offline_note: {
    en: 'Base map unavailable ({why}). Natural Earth coastlines are drawn instead, and they ship inside the page. The eclipse circumstances are computed the same: they do not depend on the background.',
    es: 'Mapa de fondo no disponible ({why}). Se dibujan las costas de Natural Earth, que van en la propia página. Las circunstancias del eclipse se calculan igual: no dependen del fondo.',
    ca: 'Mapa de fons no disponible ({why}). Es dibuixen les costes de Natural Earth, que van dins la mateixa pàgina. Les circumstàncies de l’eclipsi es calculen igual: no depenen del fons.',
    it: 'Mappa di sfondo non disponibile ({why}). Si disegnano le coste di Natural Earth, che viaggiano dentro la pagina stessa. Le circostanze dell’eclissi si calcolano lo stesso: non dipendono dallo sfondo.',
    fr: 'Fond de carte indisponible ({why}). Les côtes de Natural Earth sont tracées à la place, et elles voyagent dans la page elle-même. Les circonstances de l’éclipse se calculent de la même façon : elles ne dépendent pas du fond.' },
  offline_retry: { en: 'Retry', es: 'Reintentar', ca: 'Torna-ho a provar',
    it: 'Riprovare', fr: 'Réessayer' },
  why_noanswer: { en: 'no answer', es: 'no responde', ca: 'no respon',
    it: 'non risponde', fr: 'pas de réponse' },
  why_offline: { en: 'offline', es: 'sin conexión', ca: 'sense connexió',
    it: 'senza connessione', fr: 'hors connexion' },

  /* ---- footer -------------------------------------------------------- */
  footer_main: {
    en: 'JPL DE440s ephemerides · Besselian elements and spectrum by <code>src/eclipsecat.py</code> and <code>src/webdata.py</code> · map <a href="vendor/LICENSE-leaflet.txt">Leaflet</a> (BSD-2) · fallback coastlines Natural Earth 1:10 m simplified (public domain) · SPECTRL2 table via <a href="vendor/LICENSE-pvlib.txt">pvlib</a> (BSD-3) · <a href="../LICENSES.md">AGPL-3.0 / CC BY-SA 4.0</a>',
    es: 'Efemérides JPL DE440s · elementos besselianos y espectro por <code>src/eclipsecat.py</code> y <code>src/webdata.py</code> · mapa <a href="vendor/LICENSE-leaflet.txt">Leaflet</a> (BSD-2) · costas de respaldo Natural Earth 1:10 m simplificadas (dominio público) · tabla SPECTRL2 vía <a href="vendor/LICENSE-pvlib.txt">pvlib</a> (BSD-3) · <a href="../LICENSES.md">AGPL-3.0 / CC BY-SA 4.0</a>',
    ca: 'Efemèrides JPL DE440s · elements besselians i espectre per <code>src/eclipsecat.py</code> i <code>src/webdata.py</code> · mapa <a href="vendor/LICENSE-leaflet.txt">Leaflet</a> (BSD-2) · costes de reserva Natural Earth 1:10 m simplificades (domini públic) · taula SPECTRL2 via <a href="vendor/LICENSE-pvlib.txt">pvlib</a> (BSD-3) · <a href="../LICENSES.md">AGPL-3.0 / CC BY-SA 4.0</a>',
    it: 'Effemeridi JPL DE440s · elementi besseliani e spettro da <code>src/eclipsecat.py</code> e <code>src/webdata.py</code> · mappa <a href="vendor/LICENSE-leaflet.txt">Leaflet</a> (BSD-2) · coste di riserva Natural Earth 1:10 m semplificate (dominio pubblico) · tabella SPECTRL2 via <a href="vendor/LICENSE-pvlib.txt">pvlib</a> (BSD-3) · <a href="../LICENSES.md">AGPL-3.0 / CC BY-SA 4.0</a>',
    fr: 'Éphémérides JPL DE440s · éléments besséliens et spectre par <code>src/eclipsecat.py</code> et <code>src/webdata.py</code> · carte <a href="vendor/LICENSE-leaflet.txt">Leaflet</a> (BSD-2) · côtes de secours Natural Earth 1:10 m simplifiées (domaine public) · table SPECTRL2 via <a href="vendor/LICENSE-pvlib.txt">pvlib</a> (BSD-3) · <a href="../LICENSES.md">AGPL-3.0 / CC BY-SA 4.0</a>' },

  /* ---- stabiliser page ------------------------------------------------ */
  st_title: { en: 'Solar video stabiliser', es: 'Estabilizador solar',
    ca: 'Estabilitzador solar', it: 'Stabilizzatore solare', fr: 'Stabilisateur solaire' },
  st_tagline: {
    en: 'Pins the eclipsed Sun to a fixed point of the frame, in the browser, without uploading the video anywhere.',
    es: 'Fija el Sol eclipsado en un punto del encuadre, en el propio navegador y sin subir el vídeo a ningún sitio.',
    ca: 'Fixa el Sol eclipsat en un punt de l’enquadrament, en el mateix navegador i sense pujar el vídeo enlloc.',
    it: 'Fissa il Sole eclissato in un punto dell’inquadratura, nel browser stesso e senza caricare il video da nessuna parte.',
    fr: 'Fixe le Soleil éclipsé en un point du cadre, dans le navigateur même, sans téléverser la vidéo nulle part.' },
  st_why: {
    en: 'A generic stabiliser tracks the background, and an eclipse filmed against the sky has no background. The brightness centroid is no better: the centroid of a crescent sits inside the lit sliver and marches towards the uncovered limb as the Moon comes in, so the “stabilised” Sun would drift by most of a solar radius in step with the eclipse itself. What does not move is the limb, an arc of constant radius about the solar centre whatever happens to the coverage. This fits a circle to it and ignores everything inside.',
    es: 'Un estabilizador corriente sigue el fondo, y un eclipse filmado contra el cielo no tiene fondo. El centroide de brillo tampoco sirve: el de un creciente cae dentro de la uña iluminada y avanza hacia el limbo descubierto a medida que la Luna entra, así que el Sol «estabilizado» se iría casi un radio solar al ritmo del propio eclipse. Lo que no se mueve es el limbo, un arco de radio constante alrededor del centro del Sol pase lo que pase con la cobertura. Esto le ajusta una circunferencia y desprecia todo lo de dentro.',
    ca: 'Un estabilitzador corrent segueix el fons, i un eclipsi filmat contra el cel no té fons. El centroide de lluminositat tampoc no serveix: el d’un creixent cau dins de l’ungla il·luminada i avança cap al limbe descobert a mesura que la Lluna entra, de manera que el Sol «estabilitzat» se n’aniria gairebé un radi solar al ritme del mateix eclipsi. El que no es mou és el limbe, un arc de radi constant al voltant del centre del Sol passi el que passi amb la cobertura. Això li ajusta una circumferència i menysprea tot el que hi ha a dins.',
    it: 'Uno stabilizzatore generico segue lo sfondo, e un’eclissi ripresa contro il cielo non ha sfondo. Il centroide di luminosità non serve: quello di una falce cade dentro l’unghia illuminata e avanza verso il lembo scoperto man mano che la Luna entra, cosicché il Sole «stabilizzato» si sposterebbe di quasi un raggio solare al ritmo dell’eclissi stessa. Ciò che non si muove è il lembo, un arco di raggio costante attorno al centro del Sole qualunque cosa accada alla copertura. Questo gli adatta una circonferenza e ignora tutto il resto.',
    fr: 'Un stabilisateur générique suit l’arrière-plan, et une éclipse filmée contre le ciel n’en a pas. Le centroïde de brillance ne vaut pas mieux : celui d’un croissant tombe à l’intérieur du liseré éclairé et avance vers le limbe découvert à mesure que la Lune entre, de sorte que le Soleil « stabilisé » dériverait de presque un rayon solaire au rythme de l’éclipse elle-même. Ce qui ne bouge pas, c’est le limbe, un arc de rayon constant autour du centre du Soleil quoi qu’il advienne de la couverture. Ceci lui ajuste un cercle et ignore tout ce qui est à l’intérieur.' },
  st_privacy: {
    en: '<b>The video is not uploaded anywhere.</b> It is opened from disk, processed in this browser, and the result stays here. This page has no server to upload anything to.',
    es: '<b>El vídeo no se sube a ningún sitio.</b> Se abre desde el disco, se procesa en este navegador y el resultado se queda aquí. Esta página no tiene servidor al que subir nada.',
    ca: '<b>El vídeo no es puja enlloc.</b> S’obre des del disc, es processa en aquest navegador i el resultat es queda aquí. Aquesta pàgina no té servidor on pujar res.',
    it: '<b>Il video non viene caricato da nessuna parte.</b> Si apre dal disco, si elabora in questo browser e il risultato resta qui. Questa pagina non ha alcun server a cui caricare nulla.',
    fr: '<b>La vidéo n’est téléversée nulle part.</b> Elle est ouverte depuis le disque, traitée dans ce navigateur, et le résultat reste ici. Cette page n’a aucun serveur où téléverser quoi que ce soit.' },
  st_drop: { en: 'Drop a video here, or', es: 'Arrastra aquí un vídeo, o',
    ca: 'Arrossega aquí un vídeo, o', it: 'Trascina qui un video, oppure',
    fr: 'Déposez une vidéo ici, ou' },
  st_original: { en: 'Original', es: 'Original', ca: 'Original', it: 'Originale', fr: 'Original' },
  st_tracking: { en: 'Tracking', es: 'Seguimiento', ca: 'Seguiment',
    it: 'Inseguimento', fr: 'Suivi' },
  st_go: { en: 'Stabilise', es: 'Estabilizar', ca: 'Estabilitzar',
    it: 'Stabilizzare', fr: 'Stabiliser' },
  st_keep_frame: {
    en: 'Keep the whole frame', es: 'Conservar el encuadre entero',
    ca: 'Conservar l’enquadrament sencer', it: 'Conservare l’inquadratura intera',
    fr: 'Conserver le cadre entier' },
  st_another: { en: 'Another video', es: 'Otro vídeo', ca: 'Un altre vídeo',
    it: 'Un altro video', fr: 'Une autre vidéo' },
  st_crop_hint: {
    en: 'Unchecked, the result is cropped to the largest 16:9 window no frame runs off: shifting a frame leaves blank edges, and against a lit sky that reads as a fault. Checked, the whole frame is kept and the edges show black.',
    es: 'Sin marcar, el resultado se recorta a la mayor ventana 16:9 que ningún fotograma se salga: desplazar un fotograma deja bordes en blanco, y contra un cielo iluminado eso se lee como un fallo. Marcado, se conserva el encuadre completo y los bordes aparecen en negro.',
    ca: 'Sense marcar, el resultat es retalla a la finestra 16:9 més gran que cap fotograma no depassi: desplaçar un fotograma deixa vores en blanc, i contra un cel il·luminat això es llegeix com una errada. Marcat, es conserva l’enquadrament complet i les vores surten en negre.',
    it: 'Senza spuntare, il risultato viene ritagliato alla più ampia finestra 16:9 da cui nessun fotogramma esca: spostare un fotogramma lascia bordi vuoti, e contro un cielo illuminato quello si legge come un difetto. Spuntato, si conserva l’inquadratura intera e i bordi appaiono neri.',
    fr: 'Décoché, le résultat est recadré à la plus grande fenêtre 16:9 dont aucune image ne sort : décaler une image laisse des bords vides, et contre un ciel éclairé cela se lit comme un défaut. Coché, le cadre entier est conservé et les bords apparaissent en noir.' },
  st_result: { en: 'Result', es: 'Resultado', ca: 'Resultat', it: 'Risultato', fr: 'Résultat' },
  st_save: { en: 'Save the video', es: 'Guardar el vídeo', ca: 'Desar el vídeo',
    it: 'Salvare il video', fr: 'Enregistrer la vidéo' },
  st_ready: {
    en: 'Ready. None of this leaves this browser.', es: 'Listo. Nada de esto sale de este navegador.',
    ca: 'A punt. Res d’això no surt d’aquest navegador.',
    it: 'Pronto. Niente di tutto ciò esce da questo browser.',
    fr: 'Prêt. Rien de tout cela ne quitte ce navigateur.' },
  st_measuring: {
    en: 'Measuring: {n} frames tracked, {lost} unlocked',
    es: 'Midiendo: {n} fotogramas seguidos, {lost} sin fijar',
    ca: 'Mesurant: {n} fotogrames seguits, {lost} sense fixar',
    it: 'Misurazione: {n} fotogrammi inseguiti, {lost} senza aggancio',
    fr: 'Mesure : {n} images suivies, {lost} sans accrochage' },
  st_recording: {
    en: 'Recording the stabilised video…', es: 'Grabando el vídeo estabilizado…',
    ca: 'Enregistrant el vídeo estabilitzat…', it: 'Registrazione del video stabilizzato…',
    fr: 'Enregistrement de la vidéo stabilisée…' },
  st_done: {
    en: 'Done. {n} frames tracked, solar radius {r} px, window {w}×{h}, {mb} MB.',
    es: 'Hecho. {n} fotogramas seguidos, radio solar {r} px, ventana {w}×{h}, {mb} MB.',
    ca: 'Fet. {n} fotogrames seguits, radi solar {r} px, finestra {w}×{h}, {mb} MB.',
    it: 'Fatto. {n} fotogrammi inseguiti, raggio solare {r} px, finestra {w}×{h}, {mb} MB.',
    fr: 'Terminé. {n} images suivies, rayon solaire {r} px, fenêtre {w}×{h}, {mb} Mo.' },
  st_fail: { en: 'Could not: {why}', es: 'No se pudo: {why}', ca: 'No s’ha pogut: {why}',
    it: 'Non è stato possibile: {why}', fr: 'Impossible : {why}' },
  st_err_read: {
    en: 'the browser could not read the video', es: 'el navegador no pudo leer el vídeo',
    ca: 'el navegador no ha pogut llegir el vídeo', it: 'il browser non ha potuto leggere il video',
    fr: 'le navigateur n’a pas pu lire la vidéo' },
  st_err_rvfc: {
    en: 'this browser has no requestVideoFrameCallback',
    es: 'este navegador no tiene requestVideoFrameCallback',
    ca: 'aquest navegador no té requestVideoFrameCallback',
    it: 'questo browser non ha requestVideoFrameCallback',
    fr: 'ce navigateur n’a pas requestVideoFrameCallback' },
  st_err_rec: {
    en: 'this browser cannot record video (MediaRecorder)',
    es: 'este navegador no sabe grabar vídeo (MediaRecorder)',
    ca: 'aquest navegador no sap enregistrar vídeo (MediaRecorder)',
    it: 'questo browser non sa registrare video (MediaRecorder)',
    fr: 'ce navigateur ne sait pas enregistrer de vidéo (MediaRecorder)' },
  st_err_track: {
    en: 'the Sun could not be locked in enough frames',
    es: 'no se pudo fijar el Sol en suficientes fotogramas',
    ca: 'no s’ha pogut fixar el Sol en prou fotogrames',
    it: 'non è stato possibile agganciare il Sole in un numero sufficiente di fotogrammi',
    fr: 'le Soleil n’a pas pu être accroché sur assez d’images' },
  st_no_recorder: {
    en: 'This browser cannot record video from a canvas, so the result will not be saveable. Everything else works.',
    es: 'Este navegador no sabe grabar vídeo desde un lienzo, así que el resultado no se podrá guardar. Todo lo demás funciona.',
    ca: 'Aquest navegador no sap enregistrar vídeo des d’un llenç, així que el resultat no es podrà desar. La resta funciona.',
    it: 'Questo browser non sa registrare video da un canvas, quindi il risultato non sarà salvabile. Tutto il resto funziona.',
    fr: 'Ce navigateur ne sait pas enregistrer de vidéo depuis un canevas, le résultat ne pourra donc pas être enregistré. Tout le reste fonctionne.' },
  st_out_h: { en: 'What comes out and what does not.', es: 'Qué sale y qué no.',
    ca: 'Què surt i què no.', it: 'Che cosa esce e che cosa no.',
    fr: 'Ce qui sort et ce qui ne sort pas.' },
  st_out: {
    en: 'The video is re-encoded from the already-shifted frames, so it carries neither the audio track nor the camera metadata: not the date, not the model, not the coordinates if it had them. That is not a side effect worth undoing. The track is not smoothed beyond rejecting outlying fits: tripod shake is real motion and removing it is the whole point, whereas smoothing the measurement would subtract a smoothed position and leave the shake in.',
    es: 'El vídeo se vuelve a codificar a partir de los fotogramas ya desplazados, así que no lleva la pista de audio ni los metadatos de la cámara: ni la fecha, ni el modelo, ni las coordenadas si las llevaba. Eso no es un efecto secundario que convenga deshacer. El seguimiento no se suaviza más allá de rechazar ajustes atípicos: el temblor del trípode es movimiento real y quitarlo es justo el objetivo, mientras que suavizar la medida restaría una posición suavizada y dejaría el temblor dentro.',
    ca: 'El vídeo es torna a codificar a partir dels fotogrames ja desplaçats, de manera que no duu la pista d’àudio ni les metadades de la càmera: ni la data, ni el model, ni les coordenades si en duia. Això no és un efecte secundari que convingui desfer. El seguiment no se suavitza més enllà de rebutjar ajustos atípics: el tremolor del trípode és moviment real i treure’l és justament l’objectiu, mentre que suavitzar la mesura restaria una posició suavitzada i deixaria el tremolor a dins.',
    it: 'Il video viene ricodificato dai fotogrammi già traslati, quindi non porta né la traccia audio né i metadati della fotocamera: né la data, né il modello, né le coordinate se le aveva. Non è un effetto collaterale da annullare. L’inseguimento non viene levigato oltre il rifiuto degli adattamenti anomali: il tremolio del treppiede è movimento reale e toglierlo è proprio l’obiettivo, mentre levigare la misura sottrarrebbe una posizione levigata e lascerebbe dentro il tremolio.',
    fr: 'La vidéo est réencodée à partir des images déjà décalées, elle ne porte donc ni la piste audio ni les métadonnées de l’appareil : ni la date, ni le modèle, ni les coordonnées si elle en avait. Ce n’est pas un effet de bord qu’il conviendrait d’annuler. Le suivi n’est pas lissé au-delà du rejet des ajustements aberrants : le tremblement du trépied est un mouvement réel et l’enlever est justement le but, alors que lisser la mesure soustrairait une position lissée et laisserait le tremblement dedans.' },
  st_how_h: { en: 'How it works.', es: 'Cómo lo hace.', ca: 'Com ho fa.',
    it: 'Come lo fa.', fr: 'Comment il procède.' },
  st_how: {
    en: 'Three regimes, because what can be tracked changes as the eclipse goes on. With the Sun partly covered, a circle is fitted to the <b>photosphere limb</b>, which saturates while nothing else in frame comes close. During totality the photosphere is gone and what remains is a <b>hole</b> inside the corona: the Moon’s disk, found as the dark region the frame border cannot reach. Against a lit sky the photosphere blooms far past its own limb and a threshold would trace the flare, so the <b>Moon</b> is tracked by the signed radial gradient around a ring, which tells a dark-to-bright edge from a bright-to-dark one and discards the flare. Same code and same decisions as <code>tools/stab_solar.py</code>, checked against the same synthetic cases in <code>web/js/stabilise.test.js</code>.',
    es: 'Tres regímenes, porque lo que se puede seguir cambia a lo largo del eclipse. Con el Sol parcialmente cubierto se ajusta una circunferencia al <b>limbo de la fotosfera</b>, que satura mientras nada más en el encuadre se le acerca. En la totalidad la fotosfera desaparece y lo que queda es un <b>agujero</b> dentro de la corona: el disco de la Luna, que se localiza como la región oscura que el borde del fotograma no alcanza. Con el cielo iluminado la fotosfera florece muy por fuera de su propio limbo y un umbral trazaría el resplandor, así que se sigue la <b>Luna</b> por el gradiente radial con signo alrededor de un anillo, que distingue un borde oscuro-a-claro de uno claro-a-oscuro y descarta el resplandor. El mismo código y las mismas decisiones que <code>tools/stab_solar.py</code>, comprobados contra los mismos casos sintéticos en <code>web/js/stabilise.test.js</code>.',
    ca: 'Tres règims, perquè el que es pot seguir canvia al llarg de l’eclipsi. Amb el Sol parcialment cobert s’ajusta una circumferència al <b>limbe de la fotosfera</b>, que satura mentre res més a l’enquadrament no se li acosta. A la totalitat la fotosfera desapareix i el que queda és un <b>forat</b> dins de la corona: el disc de la Lluna, que es localitza com la regió fosca que la vora del fotograma no arriba a tocar. Amb el cel il·luminat la fotosfera floreix molt per fora del seu propi limbe i un llindar traçaria la resplendor, de manera que se segueix la <b>Lluna</b> pel gradient radial amb signe al voltant d’un anell, que distingeix una vora fosc-a-clar d’una clar-a-fosc i descarta la resplendor. El mateix codi i les mateixes decisions que <code>tools/stab_solar.py</code>, comprovats contra els mateixos casos sintètics a <code>web/js/stabilise.test.js</code>.',
    it: 'Tre regimi, perché ciò che si può inseguire cambia nel corso dell’eclissi. Con il Sole parzialmente coperto si adatta una circonferenza al <b>lembo della fotosfera</b>, che satura mentre nient’altro nell’inquadratura vi si avvicina. Nella totalità la fotosfera scompare e resta un <b>buco</b> dentro la corona: il disco della Luna, individuato come la regione scura che il bordo del fotogramma non raggiunge. Con il cielo illuminato la fotosfera fiorisce molto oltre il proprio lembo e una soglia traccerebbe il bagliore, perciò si insegue la <b>Luna</b> con il gradiente radiale dotato di segno attorno a un anello, che distingue un bordo scuro-chiaro da uno chiaro-scuro e scarta il bagliore. Stesso codice e stesse decisioni di <code>tools/stab_solar.py</code>, verificati sugli stessi casi sintetici in <code>web/js/stabilise.test.js</code>.',
    fr: 'Trois régimes, car ce qui peut être suivi change au fil de l’éclipse. Le Soleil partiellement couvert, un cercle est ajusté au <b>limbe de la photosphère</b>, qui sature alors que rien d’autre dans le cadre n’en approche. Pendant la totalité la photosphère disparaît et il reste un <b>trou</b> dans la couronne : le disque de la Lune, repéré comme la région sombre que le bord de l’image n’atteint pas. Sous un ciel éclairé la photosphère déborde très au-delà de son propre limbe et un seuil tracerait le halo, alors la <b>Lune</b> est suivie par le gradient radial signé autour d’un anneau, qui distingue un bord sombre-vers-clair d’un bord clair-vers-sombre et écarte le halo. Même code et mêmes décisions que <code>tools/stab_solar.py</code>, vérifiés sur les mêmes cas synthétiques dans <code>web/js/stabilise.test.js</code>.' },
  st_footer: {
    en: 'Same computation as <code>tools/stab_solar.py</code>',
    es: 'Mismo cálculo que <code>tools/stab_solar.py</code>',
    ca: 'Mateix càlcul que <code>tools/stab_solar.py</code>',
    it: 'Stesso calcolo di <code>tools/stab_solar.py</code>',
    fr: 'Même calcul que <code>tools/stab_solar.py</code>' }

  };

  /* ---- runtime -------------------------------------------------------- */

  const LOCALES = { en: 'en-GB', es: 'es-ES', ca: 'ca-ES', it: 'it-IT', fr: 'fr-FR' };
  const NAMES = { en: 'English', es: 'Español', ca: 'Català', it: 'Italiano', fr: 'Français' };
  // Italian writes 99,9% closed up; Spanish, Catalan and French put a space
  // before the sign, English none. This is not a style choice in any of them.
  const PCT_SPACE = { en: '', es: ' ', ca: ' ', it: '', fr: ' ' };

  let lang = 'en';

  const pick = () => {
    let saved = null;
    try { saved = localStorage.getItem('lang'); } catch (e) { /* nada */ }
    if (saved && S.app_title[saved]) return saved;
    for (const want of (navigator.languages || [navigator.language || 'en'])) {
      const two = String(want).slice(0, 2).toLowerCase();
      if (S.app_title[two]) return two;
    }
    return 'en';
  };

  const t = (key, vars) => {
    const row = S[key];
    if (!row) return key;
    let s = row[lang] || row.en;
    if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };

  const nf = (v, d) => Number(v).toLocaleString(LOCALES[lang],
    { minimumFractionDigits: d === undefined ? 1 : d, maximumFractionDigits: d === undefined ? 1 : d });
  const pct = v => nf(v, v > 0.999 && v < 1 ? 3 : 1) + PCT_SPACE[lang] + '%';
  const pctRaw = (v, d) => nf(v, d) + PCT_SPACE[lang] + '%';

  const set = l => {
    if (!S.app_title[l]) l = 'en';
    lang = l;
    try { localStorage.setItem('lang', l); } catch (e) { /* nada */ }
    document.documentElement.lang = l;
  };

  // Hydrate the static markup. Elements carry the key in data-i18n; an element
  // that also needs an attribute translated names it in data-i18n-attr.
  const apply = (root) => {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr;
      if (attr) el.setAttribute(attr, t(key));
      else el.innerHTML = t(key);
    });
  };

  return { t, set, apply, nf, pct, pctRaw, get lang() { return lang; },
           locale: () => LOCALES[lang], names: NAMES, pick, keys: () => Object.keys(S),
           _table: S };
})();

if (typeof module !== 'undefined') module.exports = Lang;
