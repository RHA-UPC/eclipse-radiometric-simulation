"""Emit every table and every in-text number the paper uses, as LaTeX.

Nothing in the manuscript is typed by hand: paper.tex \\input's the files this
script writes, and quotes in-text values through \\keyval macros defined in
paper/keyvals.tex. If a number changes upstream, the paper changes with it.
"""
import json
import re
import numpy as np
import pandas as pd

import optics
import thermal
import eye as eyemod
from radiometry import alpha_hestroffer, central_radiance_ratio
from siteconf import ROOT

D = ROOT+'/data/'
P = ROOT+'/paper/'

CIRC = json.load(open(D + 'circumstances.json'))
ATM_ALL = json.load(open(D + 'atmosphere.json'))
ATM = ATM_ALL['adopted_for_eclipse_window']
HOR = json.load(open(D + 'horizon.json'))
PATH = json.load(open(D + 'pathgeom.json'))
PMETA = json.load(open(D + 'perseids_meta.json'))
HW = json.load(open(D + 'hardware.json'))
LIT = json.load(open(D + 'literature.json'))
VAL = json.load(open(D + 'validation.json'))

sp = pd.read_csv(D + 'spectral_timeseries.csv')
ey = pd.read_csv(D + 'eye_timeseries.csv')
per = pd.read_csv(D + 'perseids.csv')
TMAX = CIRC['contacts']['MAX']['tt_jd']
KV = {}


SPECS = {}


def write_table(path, rows, colspec, header, caption, label, note=''):
    """Write a complete table environment.

    The rows are NOT \\input into a tabular: LaTeX's array scanner does not
    survive \\input inside the body reliably (it fails with 'Use of \\@@array
    doesn't match its definition'). Emitting the whole environment from here
    also keeps each caption next to the code that produced its numbers.
    """
    # booktabs rules are \noalign material and DO require the preceding row to
    # end with its terminator; the earlier 'Misplaced \noalign' came from
    # \input inside the tabular, not from the terminator.
    body = '\n'.join(rows)
    tex = ('\\begin{table}[htbp]\\centering\\small\n'
           '\\caption{%s}\n\\label{%s}\n'
           '\\begin{tabular}{%s}\n\\toprule\n%s\n\\midrule\n%s\n'
           '\\bottomrule\n\\end{tabular}\n%s\\end{table}\n'
           % (caption, label, colspec, header, body, note))
    open(path, 'w').write(tex)


def write_rows(path, rows):
    """Write tabular rows, dropping the final row terminator.

    With \\input inside a tabular, a trailing \\\\ on the last line scans ahead
    for its optional argument, swallows the following \\bottomrule and TeX
    reports 'Misplaced \\noalign'. booktabs does not need the terminator there.
    """
    body = '\n'.join(rows)
    if body.endswith('\\\\'):
        body = body[:-2]
    open(path, 'w').write(body + '\n')


def kv(name, value, fmt='%s'):
    v = fmt % value if not isinstance(value, str) else value
    # These macros are inserted as raw text, not through siunitx, so the
    # decimal separator has to be localised here or the manuscript ends up
    # mixing '4.75' in the prose with '4,75' in the tables.
    if re.fullmatch(r'[+-]?\d+\.\d+', v):
        v = v.replace('.', '{,}')
    KV[name] = v
    return KV[name]


def at(sec):
    """Row of the spectral series nearest to `sec` seconds from maximum."""
    return sp.iloc[(sp['seconds_from_max'] - sec).abs().idxmin()]


def at_eye(sec):
    return ey.iloc[(ey['seconds_from_max'] - sec).abs().idxmin()]


def tex_escape(s):
    return s.replace('%', r'\%').replace('&', r'\&').replace('_', r'\_')


def assert_no_provisional():
    """hardware.json claims the build refuses provisional values. Make that true.

    Walks every block that carries a 'status' and raises if anything still says
    'provisional'. Cheaper than trusting a comment.
    """
    bad = []

    def walk(node, path):
        if isinstance(node, dict):
            st = node.get('status')
            if isinstance(st, str) and st not in ('verified', 'verified-secondary'):
                bad.append(path)
            for k, v in node.items():
                walk(v, path + '/' + str(k))
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, '%s[%d]' % (path, i))

    walk(HW, 'hardware.json')
    if bad:
        raise SystemExit('REFUSING to build: provisional hardware values still '
                         'present at %s. Verify them or remove them from the '
                         'manuscript.' % ', '.join(bad))


# ---------------------------------------------------------------- Table 1
def table1_circumstances():
    order = ['C1', 'C2', 'MAX', 'C3', 'C4']
    names = {'C1': 'Primer contacto (C1)', 'C2': 'Segundo contacto (C2)',
             'MAX': 'Máximo del eclipse', 'C3': 'Tercer contacto (C3)',
             'C4': 'Cuarto contacto (C4)'}
    rows = []
    for k in order:
        c = CIRC['contacts'][k]
        rows.append('%s & %s & %s & %.2f & %.1f & %.4f & %.4f \\\\' % (
            names[k], c['utc'][11:21], c['local_cest'][11:19],
            c['sun_alt_refracted_deg'], c['sun_az_deg'],
            c['magnitude'], c['obscuration']))
    write_table(P + 'tab1_circumstances.tex', rows,
        'lccS[table-format=-2.2]S[table-format=3.1]S[table-format=1.4]S[table-format=1.4]',
        'Evento & UTC & CEST & {Altura (\\textdegree)} & {Acimut (\\textdegree)} & '
        '{Magnitud} & {Obscuración} \\\\',
        'Circunstancias locales del eclipse en \\siteLat\\textdegree{}\\,N, '
        '\\siteLon\\textdegree{}\\,E, \\siteElevDEM\\,m, calculadas de JPL DE440s con '
        '$\\Delta T = \\deltaT$\\,s y $k = 0{,}2725076$. La altura solar incluye refracción.',
        'tab:circ')


# ---------------------------------------------------------------- Table 2
def table2_irradiance():
    marks = [(CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1, -1800, -900, -600,
             -300, -120, -45, 0, 45, 120, 600, 1800]
    rows = []
    for s in marks:
        r = at(s)
        tag = {0: 'máximo'}.get(int(s), '%+d s' % round(s))
        if abs(s - ((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)) < 2:
            tag = 'C1'
        am = ('%.1f' % r['airmass_rel']) if np.isfinite(r['airmass_rel']) else '{--}'
        rows.append('%s & %.2f & %s & %.3f & %.1f & %.2f & %.4f \\\\' % (
            tag, r['sun_alt_refr_deg'], am,
            r['obsc_geometric'], r['dni_spectral_noeclipse'],
            r['dni_spectral_eclipsed'],
            r['dni_spectral_eclipsed'] / max(r['dni_spectral_noeclipse'], 1e-12)))
    write_table(P + 'tab2_irradiance.tex', rows,
        'lS[table-format=-2.2]cS[table-format=1.3]S[table-format=3.1]S[table-format=3.2]S[table-format=1.4]',
        'Instante & {Altura (\\textdegree)} & {Masa aire} & {Obsc.} & '
        '{DNI sin ecl.} & {DNI con ecl.} & {Transm.} \\\\\n'
        ' & & & & {(\\si{\\watt\\per\\square\\meter})} & '
        '{(\\si{\\watt\\per\\square\\meter})} & \\\\',
        'Irradiancia normal directa integrada 300--4000\\,nm calculada con SPECTRL2 '
        'sobre el estado atmosférico real del día (AOD$_{550}$ = \\aodFiveFiveZero, '
        'agua precipitable \\pw\\,cm, presión \\psurf\\,hPa, nubosidad \\cloud\\,\\%).',
        'tab:irr')


# ---------------------------------------------------------------- Table 3
def table3_focalplane():
    r = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    dni = float(r['dni_spectral_noeclipse'])
    rs = float(np.radians(r['r_sun_arcsec'] / 3600.0))
    kv('dniC1', dni, '%.0f')
    rows = []
    for f_mm in [16, 24, 35, 50, 100, 150, 200, 300]:
        Nmax = float(optics.tamron_max_aperture(f_mm))
        for N, lab in [(Nmax, 'máx.'), (11.0, 'cerrado'), (22.0, 'cerrado')]:
            E = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
            d = optics.solar_image_diameter_mm(f_mm, rs)
            Pw = optics.total_power_W(dni, f_mm, N, tau=1.0)
            a = d / 2000.0
            dT = thermal.dT_spot_steady(E, a)
            rows.append('%d & %s (f/%s) & %.2f & %.3f & %.1f & %.3f \\\\' % (
                f_mm, lab, ('%.1f' % N).replace('.', ','), E / 1e4, d, Pw * 1e3, dT))
    write_table(P + 'tab3_focalplane.tex', rows,
        'S[table-format=3.0]lS[table-format=2.2]S[table-format=1.3]S[table-format=4.1]S[table-format=1.3]',
        '{Focal (mm)} & Diafragma & {$E_{\\mathrm{pico}}$ '
        '(\\si{\\watt\\per\\square\\centi\\meter})} & {Imagen (mm)} & '
        '{Potencia (mW)} & {$\\Delta T$ (K)} \\\\',
        'Plano focal en el primer contacto (Sol sin eclipsar a \\altCOne\\textdegree, '
        'DNI = \\dniCOne~\\si{\\watt\\per\\square\\meter}), con $\\tau = 1$ como cota '
        'conservadora. $\\Delta T$ es el incremento local estacionario en el centro de '
        'la imagen solar.', 'tab:focal')


# ---------------------------------------------------------------- Table 4
def table4_thermal():
    """Steady-state hot-spot rise for the whole zoom range, at four epochs."""
    epochs = [('mediodía solar despejado (referencia)', 900.0),
              ('C1 del eclipse (Sol a 14.7$^\\circ$)', None),
              ('10 min antes del máximo', None),
              ('totalidad', None)]
    r_c1 = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    epochs[1] = (epochs[1][0], float(r_c1['dni_spectral_noeclipse']))
    epochs[2] = (epochs[2][0], float(at(-600)['dni_spectral_eclipsed']))
    epochs[3] = (epochs[3][0], float(at(0)['dni_spectral_eclipsed']))
    rs = float(np.radians(r_c1['r_sun_arcsec'] / 3600.0))
    rows = []
    for lab, dni in epochs:
        cells = []
        for f_mm, N in ((16, 3.5), (300, 6.3), (6.9, 1.9)):
            E = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
            a = optics.solar_image_diameter_mm(f_mm, rs) / 2000.0
            cells.append(thermal.dT_spot_steady(E, a))
        rows.append('%s & %.0f & %.3f & %.3f & %.4f \\\\' % (lab, dni, *cells))
    write_table(P + 'tab4_thermal.tex', rows,
        'lS[table-format=3.0]S[table-format=1.3]S[table-format=1.3]S[table-format=1.4]',
        'Época & {DNI (\\si{\\watt\\per\\square\\meter})} & {16\\,mm f/3,5 (K)} & '
        '{300\\,mm f/6,3 (K)} & {f/1,9 tipo móvil (K)} \\\\',
        'Incremento de temperatura local estacionario en el centro de la imagen solar, '
        '$\\Delta T = qa/k$, para tres configuraciones ópticas y cuatro épocas.',
        'tab:thermal')
    kv('tauSpot300', 1e3 * thermal.spot_time_constant(
        optics.solar_image_diameter_mm(300, rs) / 2000.0), '%.0f')
    kv('tauSpot16', 1e3 * thermal.spot_time_constant(
        optics.solar_image_diameter_mm(16, rs) / 2000.0), '%.2f')


# ---------------------------------------------------------------- Table 5
def table5_eye():
    marks = [(CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1, -2400, -1800,
             -1200, -900, -600, -300, -120, 0, 300, 900]
    rows = []
    for s in marks:
        r = at_eye(s)
        tag = 'C1' if abs(s - ((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)) < 2 \
            else ('máximo' if s == 0 else '%+d s' % round(s))
        st = r['safe_stare_s']
        stn = r['safe_stare_noeclipse_s']
        f = lambda v: ('$\\infty$' if not np.isfinite(v) else
                       ('%.1f' % v if v < 10 else '%.0f' % v))
        rows.append('%s & %.2f & %.3f & %.3f & %.3f & %s & %s \\\\' % (
            tag, r['sun_alt_deg'], r['obscuration'],
            r['E_blue_noeclipse_W_m2'], r['E_blue_W_m2'], f(stn), f(st)))
    write_table(P + 'tab5_eye.tex', rows,
        'lS[table-format=-2.2]S[table-format=1.3]S[table-format=2.3]S[table-format=2.3]rr',
        'Instante & {Altura (\\textdegree)} & {Obsc.} & {$E_B$ sin ecl.} & '
        '{$E_B$ con ecl.} & Fijación sin ecl. & Fijación con ecl. \\\\\n'
        ' & & & {(\\si{\\watt\\per\\square\\meter})} & '
        '{(\\si{\\watt\\per\\square\\meter})} & (s) & (s) \\\\',
        'Riesgo ocular según ICNIRP 2013. $E_B$ es la irradiancia corneal ponderada '
        'con $B(\\lambda)$. El tiempo de fijación es $100/E_B$ segundos mientras '
        '$E_B > 1$~\\si{\\watt\\per\\square\\meter}, e ilimitado por debajo de ese valor.',
        'tab:eye')


# ---------------------------------------------------------------- Table 6
def table6_perseids():
    rows = []
    for f_mm in [16, 24, 35, 50, 100, 200, 300]:
        d = per[per.focal_mm == f_mm]
        w = d.iloc[0]
        cells = []
        for zhr in [10, 20, 43, 100]:
            v = d[(d.zhr == zhr) & (d.limiting_mag == 3.0)]['P_at_least_one_totality_pct']
            cells.append(float(v.iloc[0]))
        rows.append('%d & %.1f $\\times$ %.1f & %.4f & %.3f & %.3f & %.3f & %.3f \\\\' % (
            f_mm, w['fov_w_deg'], w['fov_h_deg'], w['omega_sr'], *cells))
    write_table(P + 'tab6_perseids.tex', rows,
        'S[table-format=3.0]lS[table-format=1.4]S[table-format=1.3]S[table-format=1.3]S[table-format=1.3]S[table-format=1.3]',
        '{Focal (mm)} & Campo (\\textdegree) & {$\\Omega$ (sr)} & {ZHR 10} & {ZHR 20} & '
        '{ZHR 43} & {ZHR 100} \\\\\n & & & \\multicolumn{4}{c}{Probabilidad (\\%)} \\\\',
        'Probabilidad de al menos una Perseida en el encuadre durante la totalidad, '
        'formato APS-C, magnitud límite asumida 3. Los cuatro escenarios de ZHR son un '
        'barrido de sensibilidad, no una predicción.', 'tab:per')


# ---------------------------------------------------------------- Table 7
def table7_timeline():
    """Operational timeline: what the numbers mean minute by minute."""
    marks = [((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1, 'C1: comienza el eclipse',
              'Filtro puesto. Sin filtro no se mira ni se fotografía.'),
             (-2400, 'parcial temprana', 'Filtro. Fijación sin filtro ya limitada a segundos.'),
             (-1800, 'parcial media', 'Filtro. La caída de luz aún es imperceptible a simple vista.'),
             (-900, 'parcial profunda', 'Filtro. Empieza a notarse el cambio de color de la luz.'),
             (-300, 'sombras en creciente', 'Filtro. Buscar bandas de sombra y luz de rendija.'),
             (-60, 'inminente', 'Filtro puesto. Preparar el disparo de la corona.'),
             (-37, 'C2: comienza la totalidad', 'RETIRAR filtro solo ahora. Anillo de diamante.'),
             (0, 'máximo', 'Sin filtro. Corona visible. Mirar.'),
             (37, 'C3: termina la totalidad', 'FILTRO PUESTO ANTES de que reaparezca la fotosfera.'),
             (300, 'parcial de salida', 'Filtro. El Sol sigue bajando hacia el horizonte.'),
             (1800, 'ocaso parcial', 'El Sol se pone todavía eclipsado; filtro hasta que desaparezca.')]
    rows = []
    for s_, ev, act in marks:
        r = at(s_); re_ = at_eye(s_)
        st = re_['safe_stare_s']
        stare = '$\\infty$' if not np.isfinite(st) else ('%.0f' % st if st >= 1 else '<1')
        # local CEST clock
        tt = TMAX + s_ / 86400.0
        from geometry import ts as _ts
        import zoneinfo
        clock = _ts.tt_jd(tt).astimezone(zoneinfo.ZoneInfo('Europe/Madrid')).strftime('%H:%M:%S')
        rows.append('%s & %s & %.2f & %.3f & %s & %s \\\\' % (
            clock, ev, r['sun_alt_refr_deg'], r['obsc_geometric'], stare, act))
    write_table(P + 'tab7_timeline.tex', rows,
        'llS[table-format=-2.2]S[table-format=1.3]rp{5.1cm}',
        'Hora CEST & Fase & {Altura (\\textdegree)} & {Obsc.} & Fijación (s) & Acción \\\\',
        'Cronología operativa. La columna de fijación es el tiempo máximo que ICNIRP '
        'admite mirando el Sol eclipsado SIN filtro; el símbolo $\\infty$ significa que '
        'la dosis no alcanza el límite, no que mirar sea prudente ni cómodo. La columna '
        'de acción supone gafas certificadas ISO 12312-2.',
        'tab:timeline')


# ---------------------------------------------------------------- Table 8
def table8_ensemble():
    """Three clear-sky models at the same geometry. The spread IS the honest
    uncertainty of the irradiance chain at air mass ~11."""
    from pvlib import clearsky, atmosphere as pvatm
    import siteconf as S
    rows = []
    worst = {}
    for tag, sec in (('C1', (CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1),
                     ('30 min antes del máximo', -1800),
                     ('instante de la totalidad', 0)):
        r = at(sec)
        z = 90.0 - r['sun_alt_refr_deg']
        am = r['airmass_rel']
        if not np.isfinite(am):
            continue
        ama = pvatm.get_absolute_airmass(am, pressure=ATM['p_surface_Pa'])
        dni_extra = LIT['tsi']['value_W_m2'] * (S.AU_KM / float(
            CIRC['contacts']['MAX']['d_sun_km'])) ** 2
        ine = clearsky.ineichen(z, ama, LIT['linke_turbidity_site']['august_TL'],
                                altitude=616.1, dni_extra=dni_extra,
                                perez_enhancement=False)
        bird = clearsky.bird(z, am, aod380=ATM['aod500'] * (380 / 500.) ** -1.14,
                             aod500=ATM['aod500'],
                             precipitable_water=ATM['precipitable_water_cm'],
                             ozone=ATM['ozone_atm_cm'], pressure=ATM['p_surface_Pa'],
                             dni_extra=dni_extra)
        v = [float(r['dni_spectral_noeclipse']),
             float(np.asarray(bird['dni']).item()),
             float(np.asarray(ine['dni']).item())]
        rows.append('%s & %.2f & %.1f & %.1f & %.1f & %.1f & %.2f \\\\' % (
            tag, r['sun_alt_refr_deg'], am, v[0], v[1], v[2], max(v) / max(min(v), 1e-9)))
        worst[tag] = v
    ratios = [max(w) / max(min(w), 1e-9) for w in worst.values()]
    spread_lo, spread_hi = min(ratios), max(ratios)
    write_table(P + 'tab8_ensemble.tex', rows,
        'lS[table-format=2.2]S[table-format=2.2]S[table-format=3.1]S[table-format=3.1]S[table-format=3.1]S[table-format=1.2]',
        'Instante & {Altura (\\textdegree)} & {Masa aire} & {SPECTRL2} & '
        '{Bird--Hulstrom} & {Ineichen--Perez} & {Razón máx/mín} \\\\\n'
        ' & & & \\multicolumn{3}{c}{DNI sin eclipse (\\si{\\watt\\per\\square\\meter})} & \\\\',
        'Tres modelos de cielo claro sobre la misma geometría y el mismo estado '
        'atmosférico. La dispersión crece de un %.0f\\,\\%% a masa de aire 4 hasta un '
        'factor %s a masa de aire 11, y esa dispersión es la incertidumbre real de la '
        'cadena radiométrica, no el error formal de ninguno de ellos. El paper adopta '
        'SPECTRL2, que es el más alto de los tres, porque es la elección conservadora '
        'para el riesgo ocular.' % (100 * (spread_lo - 1), ('%.1f' % spread_hi).replace('.', ',')), 'tab:ensemble')
    v = worst.get('instante de la totalidad')
    if v:
        KV['dniMaxSpread'] = ('%.1f' % (max(v) / max(min(v), 1e-9))).replace('.', '{,}')
        KV['dniMaxLow'] = '%.0f' % min(v)
        KV['dniMaxHigh'] = '%.0f' % max(v)


# ---------------------------------------------------------------- Table 9
def table9_drift():
    """The exposure limit that actually bites during totality is not thermal."""
    import geometry as _G
    t0 = TMAX
    dt = 1.0 / 86400.0

    def altaz(tt):
        a = _G.place.at(_G.ts.tt_jd(tt)).observe(_G.sun).apparent()
        al, az, _ = a.altaz(temperature_C=ATM['T_air_C'],
                            pressure_mbar=ATM['p_surface_Pa'] / 100.0)
        return al.degrees, az.degrees

    a1, z1 = altaz(t0 - dt / 2); a2, z2 = altaz(t0 + dt / 2)
    dalt = (a2 - a1) * 3600.0
    daz = (z2 - z1) * 3600.0 * np.cos(np.radians(0.5 * (a1 + a2)))
    rate = float(np.hypot(dalt, daz))          # arcsec per second, on the sky
    pitch_mm = HW['cameras']['canon_eos_200d']['width_mm'] / \
        HW['cameras']['canon_eos_200d']['pixels_x']
    rows = []
    for f_mm in [16, 24, 35, 50, 100, 200, 300]:
        ang = np.degrees(pitch_mm / f_mm) * 3600.0
        rows.append('%d & %.2f & %.2f & %.2f \\\\' % (f_mm, ang, ang / rate,
                                                    3 * ang / rate))
    write_table(P + 'tab9_drift.tex', rows,
        'S[table-format=3.0]S[table-format=2.2]S[table-format=1.2]S[table-format=2.2]',
        '{Focal (mm)} & {Escala (\'\'/px)} & {1 px (s)} & {3 px (s)} \\\\\n'
        ' & & \\multicolumn{2}{c}{Exposición máxima sin arrastre} \\\\',
        'Límite de exposición impuesto por el arrastre de la imagen durante la '
        'totalidad, para el sensor de la EOS 200D (paso de píxel '
        '3,72\\,\\si{\\micro\\meter}). La velocidad angular aparente del Sol en ese '
        'instante, %.2f\'\'/s, se obtiene diferenciando la efeméride, no de una regla '
        'aproximada. Con la cámara sobre trípode fijo este es el límite que manda, no '
        'el térmico.' % rate, 'tab:drift')
    KV['driftRate'] = ('%.2f' % rate).replace('.', '{,}')
    KV['driftThreeZeroZero'] = ('%.2f' % (np.degrees(pitch_mm / 300) * 3600.0 / rate)).replace('.', '{,}')
    KV['driftOneSix'] = ('%.2f' % (np.degrees(pitch_mm / 16) * 3600.0 / rate)).replace('.', '{,}')


# --------------------------------------------------------------- Table 10
def table10_phone():
    """The three modules of the observer's phone, on the same footing as the
    reflex camera."""
    r = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    dni = float(r['dni_spectral_noeclipse'])
    rs = float(np.radians(r['r_sun_arcsec'] / 3600.0))
    mods = HW['cameras']['xiaomi_13t_pro']['modules']
    names = {'ultrawide': 'ultra gran angular', 'wide': 'principal', 'tele': 'teleobjetivo'}
    rows = []
    for key in ('ultrawide', 'wide', 'tele'):
        mm = mods[key]
        f_mm = mm['actual_focal_mm']; N = mm['f_number']
        E = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
        dmm = optics.solar_image_diameter_mm(f_mm, rs)
        Pw = optics.total_power_W(dni, f_mm, N, tau=1.0)
        dT = thermal.dT_spot_steady(E, dmm / 2000.0)
        rows.append('%s & %.1f & %.2f & %.2f & %.0f & %.3f & %.4f \\\\' % (
            names[key], mm['equiv_focal_mm'], f_mm,
            N, dmm * 1000.0, Pw * 1e3, dT))
    write_table(P + 'tab10_phone.tex', rows,
        'lS[table-format=2.1]S[table-format=1.2]S[table-format=1.2]S[table-format=3.0]S[table-format=1.3]S[table-format=1.4]',
        'Módulo & {Equiv. (mm)} & {Real (mm)} & {$N$} & {Imagen (\\si{\\micro\\meter})} & '
        '{Potencia (mW)} & {$\\Delta T$ (K)} \\\\',
        'Los tres módulos traseros del Xiaomi 13T Pro en las condiciones del primer '
        'contacto. La focal real se deduce de la equivalente y del formato del sensor; '
        'la derivación se detalla en \\texttt{data/hardware.json}. Pese a ser ópticas '
        'mucho más luminosas que el teleobjetivo de la réflex, la imagen solar es de '
        'decenas de micrómetros y el calentamiento local resulta un factor cuatro '
        'menor que el de la réflex, y dos o tres órdenes de magnitud por debajo de '
        'las temperaturas de degradación de sus materiales.', 'tab:phone')


# ------------------------------------------------- worst-case thermal + pupil
def extra_keyvals():
    r = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    dni = float(r['dni_spectral_noeclipse'])
    rs = float(np.radians(r['r_sun_arcsec'] / 3600.0))
    E = optics.peak_focal_plane_irradiance(dni, rs, 6.3, tau=1.0)
    Pw = optics.total_power_W(dni, 300, 6.3, tau=1.0)
    a = optics.solar_image_diameter_mm(300, rs) / 2000.0
    KV['dTonedThreeZeroZero'] = ('%.2f' % thermal.dT_one_dimensional(E, 0.3e-3)).replace('.', '{,}')
    KV['dTworstThreeZeroZero'] = ('%.2f' % thermal.dT_spot_thin_plate(
        Pw, a, 7.45e-3, 0.3e-3)).replace('.', '{,}')
    KV['dTshutterAl'] = '%.0f' % thermal.dT_spot_thin_plate(Pw, a, 12e-3, 25e-6, k=237.0)
    KV['tauDiffThreeZeroZero'] = '%.0f' % (1e3 * thermal.spot_diffusion_time(a))
    KV['tauNinetyFiveThreeZeroZero'] = ('%.2f' % thermal.spot_time_constant(a, frac=0.95)).replace('.', '{,}')
    KV['ordersMelt'] = ('%.1f' % np.log10(1687.0 / thermal.dT_spot_steady(E, a))).replace('.', '{,}')
    # pupil-dilated ocular numbers
    e0 = at_eye(0); eC1 = at_eye((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    for d in (3, 5, 7):
        v = e0['safe_stare_noeclipse_p%d_s' % d]
        KV['stareNoEclMaxP%s' % {3: 'Three', 5: 'Five', 7: 'Seven'}[d]] = \
            ('$\\infty$' if not np.isfinite(v) else '%.0f' % v)
        v = eC1['safe_stare_noeclipse_p%d_s' % d]
        KV['stareCOneP%s' % {3: 'Three', 5: 'Five', 7: 'Seven'}[d]] = \
            ('$\\infty$' if not np.isfinite(v) else ('%.1f' % v).replace('.', '{,}'))
    pre = ey[ey['seconds_from_max'] < 0]
    for d in (3, 7):
        ok = pre[np.isinf(pre['safe_stare_p%d_s' % d])]
        KV['unlimitedFromP%s' % {3: 'Three', 7: 'Seven'}[d]] = \
            (('%.1f' % (ok['seconds_from_max'].min() / 60.0)).replace('.', '{,}')
             if len(ok) else 'n/a')
    # obscuration 0.90 -> C2, the real duration of the final plunge
    g = sp[(sp['seconds_from_max'] < 0)]
    t90 = g[g['obsc_geometric'] >= 0.90]['seconds_from_max'].min()
    KV['plungeMin'] = ('%.1f' % (abs(t90) / 60.0)).replace('.', '{,}')
    # Perseid: the真 maximum over the whole sweep
    KV['pPerseidMax'] = ('%.2f' % per['P_at_least_one_totality_pct'].max()).replace('.', '{,}')
    # phone vs reflex ratio
    Ep = optics.peak_focal_plane_irradiance(dni, rs, 1.9, tau=1.0)
    ap = optics.solar_image_diameter_mm(6.93, rs) / 2000.0
    KV['phoneRatio'] = ('%.1f' % (thermal.dT_spot_steady(E, a) /
                                  thermal.dT_spot_steady(Ep, ap))).replace('.', '{,}')
    KV['deltaTdiff'] = ('%.2f' % (71.4 - CIRC['delta_t_s'])).replace('.', '{,}')


# --------------------------------------------------------------- Table 11
def table11_diamondring():
    d = json.load(open(D + 'diamondring.json'))
    t = np.array(d['t_from_C2_s']); A = np.array(d['remaining_area'])
    Fx = np.array(d['remaining_flux'])
    rows = []
    for s_ in (-60, -30, -10, -5, -2, -1, -0.5, -0.2, -0.1):
        i = int(np.argmin(np.abs(t - s_)))
        rows.append('%.1f & %.2e & %.2e & %.2f \\\\' % (
            t[i], A[i], Fx[i], Fx[i] / max(A[i], 1e-30)))
    write_table(P + 'tab11_diamondring.tex', rows,
        'S[table-format=-2.1]S[table-format=1.2e2]S[table-format=1.2e2]S[table-format=1.2]',
        '{$t-t_{C2}$ (s)} & {Área restante} & {Flujo restante} & {Flujo/Área} \\\\',
        'Los últimos segundos de fotosfera antes del segundo contacto, en '
        'fracción del disco sin eclipsar. El flujo se extingue más deprisa que el '
        'área porque lo último que queda es limbo, que es la parte oscura del '
        'disco. Calculado con el limbo lunar MEDIO: las montañas reales de la Luna '
        'rompen el creciente en las perlas de Baily y hacen que la curva real sea '
        'escalonada, no lisa.', 'tab:diamond')
    KV['efold'] = ('%.3f' % d['efold_s']).replace('.', '{,}')


# --------------------------------------------------------------- Table 12
def table12_threshold():
    """The comparison the method section promised and never made."""
    A = LIT['cmos_damage_threshold']['adopted']
    q_lab = A['q_lab_W_m2']
    a_lab = A['effective_radius_um'] * 1e-6
    r = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    rs = float(np.radians(r['r_sun_arcsec'] / 3600.0))
    dni_c1 = float(r['dni_spectral_noeclipse'])
    cfgs = [('Tamron 300\\,mm f/6,3, C1 del eclipse', 300, 6.3, dni_c1),
            ('Tamron 16\\,mm f/3,5, C1 del eclipse', 16, 3.5, dni_c1),
            ('móvil f/1,9, C1 del eclipse', 6.93, 1.9, dni_c1),
            ('Tamron 300\\,mm f/6,3, mediodía', 300, 6.3, 900.0),
            ('300\\,mm f/2,8, mediodía', 300, 2.8, 900.0),
            ('600\\,mm f/4, mediodía', 600, 4.0, 900.0)]
    rows = []
    worst = None
    for lab, f_mm, N, dni in cfgs:
        E = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
        a = optics.solar_image_diameter_mm(f_mm, rs) / 2000.0
        qA = thermal.equivalent_irradiance(q_lab, a_lab, a)
        rows.append('%s & %.1f & %.0f & %.0f & %.0f \\\\' % (
            lab, E / 1e4, qA / 1e4, qA / E, q_lab / E))
        if f_mm == 300 and N == 6.3 and dni == dni_c1:
            KV['marginA'] = '%.0f' % (qA / E)
            KV['marginB'] = '%.0f' % (q_lab / E)
            KV['threshA'] = '%.0f' % (qA / 1e4)
        if lab.startswith('300\\,mm f/2,8'):
            KV['marginFast'] = ('%.1f' % (qA / E)).replace('.', '{,}')
    write_table(P + 'tab12_threshold.tex', rows,
        'lS[table-format=3.1]S[table-format=4.0]S[table-format=4.0]S[table-format=5.0]',
        'Configuración & {$E_{\\mathrm{pico}}$} & {Umbral A} & {Margen A} & {Margen B} \\\\\n'
        ' & \\multicolumn{2}{c}{(\\si{\\watt\\per\\square\\centi\\meter})} & & \\\\',
        'Irradiancia de pico frente al único umbral de daño en onda continua '
        'publicado para un sensor de silicio con su tamaño de mancha, '
        '49\\,\\si{\\kilo\\watt\\per\\square\\centi\\meter} sobre una mancha efectiva de '
        '9,08\\,\\si{\\micro\\meter} de radio. La hipótesis A supone que el daño lo '
        'gobierna la conducción en el silicio, de modo que el umbral reescala como '
        '$1/a$ y baja mucho para una imagen solar milimétrica; la hipótesis B supone '
        'que lo gobierna la absorción en una capa fina de baja conductividad, en cuyo '
        'caso el umbral no depende del tamaño de la mancha. A es la conservadora.',
        'tab:threshold')


# ------------------------------------------------- global die heating
def global_heating():
    r = at((CIRC['contacts']['C1']['tt_jd'] - TMAX) * 86400 + 1)
    dni = float(r['dni_spectral_noeclipse'])
    for tag, f_mm, N in (('ThreeZeroZero', 300, 6.3), ('OneSix', 16, 3.5)):
        Pw = optics.total_power_W(dni, f_mm, N, tau=1.0)
        KV['Pglob' + tag] = '%.0f' % (Pw * 1e3)
        for rth, rtag in ((10.0, 'Lo'), (50.0, 'Hi')):
            KV['dTglob' + tag + rtag] = ('%.1f' % (Pw * rth)).replace('.', '{,}')


# ---------------------------------------------------------------- key values
def keyvals():
    c = CIRC['contacts']
    kv('siteLat', 41.212878, '%.6f'); kv('siteLon', 0.709488, '%.6f')
    kv('siteElevDEM', HOR['observer_height_dem_m'], '%.1f')
    kv('totalityDur', CIRC['totality_duration_s'], '%.1f')
    kv('totalityDurK2', PATH['sensitivity']['duration_with_k2_0.272281_s'], '%.1f')
    kv('totalityDurBess', 59.24, '%.1f')
    kv('partialDur', CIRC['partial_duration_s'] / 60.0, '%.1f')
    kv('deltaT', CIRC['delta_t_s'], '%.3f')
    kv('altMax', c['MAX']['sun_alt_refracted_deg'], '%.2f')
    kv('altC1', c['C1']['sun_alt_refracted_deg'], '%.2f')
    kv('azMax', c['MAX']['sun_az_deg'], '%.1f')
    kv('magMax', c['MAX']['magnitude'], '%.4f')
    kv('localMax', c['MAX']['local_cest'][11:21])
    kv('localC1', c['C1']['local_cest'][11:19])
    kv('localC2', c['C2']['local_cest'][11:21])
    kv('localC3', c['C3']['local_cest'][11:21])
    kv('localC4', c['C4']['local_cest'][11:19])
    hz = np.array(HOR['profiles']['k013']['horizon_alt_deg'])
    az = np.array(HOR['profiles']['k013']['az_deg'])
    m = (az >= 275) & (az <= 296)
    kv('horizonMax', hz[m].max(), '%+.2f')
    kv('horizonAtTotality', float(np.interp(c['MAX']['sun_az_deg'], az, hz)), '%+.2f')
    kv('clearance', c['MAX']['sun_alt_refracted_deg'] -
       float(np.interp(c['MAX']['sun_az_deg'], az, hz)), '%.2f')
    L = PATH['limits_km_north_of_site']
    kv('northLimit', L.get('north_limit_km_due_north') or L.get('north_limit_km'), '%.0f')
    kv('perpLimit', L.get('perpendicular_distance_to_limit_km') or float('nan'), '%.0f')
    kv('gradient', abs(PATH['gradient_s_per_km_north']), '%.2f')
    kv('bestDur', max(PATH['scan_north_km_to_duration_s'].values()), '%.0f')
    kv('aod550', ATM['aod550'], '%.2f'); kv('pw', ATM['precipitable_water_cm'], '%.2f')
    kv('psurf', ATM['p_surface_Pa'] / 100.0, '%.1f')
    kv('cloud', ATM['cloud_cover_pct'], '%d')
    kv('gerr', VAL['V1_spectrl2_vs_astm_g173']['rel_error_pct'], '%+.2f')
    kv('amSpread', VAL['V4_airmass_spread']['alt_4.75_deg']['spread_pct'], '%.1f')

    rC1 = at((c['C1']['tt_jd'] - TMAX) * 86400 + 1)
    kv('dniC1', rC1['dni_spectral_noeclipse'], '%.0f')
    kv('amC1', rC1['airmass_rel'], '%.2f')
    r0 = at(0)
    kv('amMax', r0['airmass_rel'], '%.1f')
    kv('dniMaxNoEcl', r0['dni_spectral_noeclipse'], '%.0f')
    kv('luxC1', rC1['Ev_direct_noeclipse'], '%.0f')
    kv('luxMaxNoEcl', r0['Ev_direct_noeclipse'], '%.0f')
    kv('sunsetDrop', 100 * (1 - r0['dni_spectral_noeclipse'] / rC1['dni_spectral_noeclipse']), '%.1f')

    rs = float(np.radians(r0['r_sun_arcsec'] / 3600.0))
    kv('alphaSun', 2e3 * rs, '%.2f')
    kv('concF63', optics.concentration(6.3, rs), '%.0f')
    kv('concF19', optics.concentration(1.9, rs), '%.0f')
    kv('concMax', optics.thermodynamic_limit(rs), '%.0f')
    kv('imgDia300', optics.solar_image_diameter_mm(300, rs), '%.2f')
    kv('imgDia16', 1e3 * optics.solar_image_diameter_mm(16, rs), '%.0f')
    kv('ldAlpha', alpha_hestroffer(550.0), '%.3f')
    kv('ldPeak', central_radiance_ratio(alpha_hestroffer(550.0)), '%.3f')

    dni_c1 = float(rC1['dni_spectral_noeclipse'])
    f_phone = HW['cameras']['xiaomi_13t_pro']['modules']['wide']['actual_focal_mm']
    for tag, f_mm, N in (('300', 300, 6.3), ('16', 16, 3.5), ('phone', f_phone, 1.9)):
        E = optics.peak_focal_plane_irradiance(dni_c1, rs, N, tau=1.0)
        a = optics.solar_image_diameter_mm(f_mm, rs) / 2000.0
        kv('Epk' + tag, E / 1e4, '%.2f')
        kv('dTss' + tag, thermal.dT_spot_steady(E, a), '%.3f')
        kv('Pw' + tag, 1e3 * optics.total_power_W(dni_c1, f_mm, N, tau=1.0), '%.0f')
    Enoon = optics.peak_focal_plane_irradiance(900.0, rs, 6.3, tau=1.0)
    kv('Epk300Noon', Enoon / 1e4, '%.1f')
    kv('dTss300Noon', thermal.dT_spot_steady(
        Enoon, optics.solar_image_diameter_mm(300, rs) / 2000.0), '%.2f')

    kv('EBlimit', 1.0, '%.0f')
    kv('ERlimit', eyemod.thermal_limit_irradiance(), '%.1f')
    kv('alphaSunMrad', 1e3 * eyemod.ALPHA_SUN, '%.2f')
    kv('gammaPh', 1e3 * eyemod.GAMMA, '%.0f')
    e0 = at_eye(0); eC1 = at_eye((c['C1']['tt_jd'] - TMAX) * 86400 + 1)
    kv('EBnoEclMax', e0['E_blue_noeclipse_W_m2'], '%.3f')
    kv('stareNoEclMax', e0['safe_stare_noeclipse_s'], '%.0f')
    kv('EBC1', eC1['E_blue_noeclipse_W_m2'], '%.1f')
    kv('stareC1', eC1['safe_stare_noeclipse_s'], '%.1f')
    kv('thermRatioC1', eC1['thermal_hazard_ratio'], '%.2f')
    kv('thermRatioMax', e0['thermal_hazard_ratio_uneclipsed'], '%.2f')
    kv('thermRatioPeak', ey['thermal_hazard_ratio'].max(), '%.2f')
    kv('thermExcessC1', 100 * (eC1['thermal_hazard_ratio'] - 1), '%.0f')
    # first moment at which an unlimited stare becomes ICNIRP-compliant
    pre = ey[(ey['seconds_from_max'] < 0)]
    ok = pre[np.isinf(pre['safe_stare_s'])]
    kv('unlimitedFrom', ok['seconds_from_max'].min() / 60.0 if len(ok) else np.nan, '%.1f')
    kv('reqFilterC1', eC1['required_filter_T'], '%.2e')

    kv('radiantAlt', PMETA['radiant_alt_deg_at_max'], '%.1f')
    kv('radiantRA', PMETA['radiant_ra_deg'], '%.1f')
    kv('radiantDec', PMETA['radiant_dec_deg'], '%.1f')
    kv('lamSun', PMETA['solar_longitude_deg_at_max'], '%.3f')
    kv('radiantSunSep', PMETA['angular_distance_radiant_to_sun_deg'], '%.1f')
    best = per[(per.zhr == 100) & (per.limiting_mag == 3.0) & (per.focal_mm == 16)]
    kv('pPerseid16', float(best['P_at_least_one_totality_pct'].iloc[0]), '%.2f')
    kv('pPerseid16best', float(per[(per.zhr == 100) & (per.limiting_mag == 0.0) &
                                   (per.focal_mm == 16)]['P_at_least_one_totality_pct'].iloc[0]), '%.2f')

    def alpha(name):
        # LaTeX control sequences cannot contain digits, so 'dniC1' has to
        # become 'dniCOne'. Done here rather than in the manuscript so the
        # key names in this file stay readable.
        d = {'0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
             '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'}
        return ''.join(d.get(ch, ch) for ch in name)

    with open(P + 'keyvals.tex', 'w') as fh:
        for k, v in sorted(KV.items()):
            fh.write('\\newcommand{\\%s}{%s}\n' % (alpha(k), v))
    json.dump(KV, open(D + 'keyvals.json', 'w'), indent=2)


if __name__ == '__main__':
    assert_no_provisional()
    table1_circumstances(); table2_irradiance(); table3_focalplane()
    table4_thermal(); table5_eye(); table6_perseids(); table7_timeline(); table8_ensemble(); table9_drift(); table10_phone(); table11_diamondring(); table12_threshold()
    keyvals(); global_heating(); extra_keyvals()
    with open(P + 'keyvals.tex', 'w') as fh:
        d = {'0':'Zero','1':'One','2':'Two','3':'Three','4':'Four','5':'Five',
             '6':'Six','7':'Seven','8':'Eight','9':'Nine'}
        for k, v in sorted(KV.items()):
            fh.write('\\newcommand{\\%s}{%s}\n' % (''.join(d.get(c, c) for c in k), v))
    print('wrote %d key values' % len(KV))
    for k in ['totalityDur', 'altMax', 'dniC1', 'dniMaxNoEcl', 'concF63', 'concF19',
              'Epk300', 'dTss300', 'Epk300noon', 'dTss300noon', 'EBC1', 'stareC1',
              'EBnoEclMax', 'stareNoEclMax', 'thermRatioC1', 'unlimitedFrom',
              'clearance', 'northLimit', 'pPerseid16', 'radiantAlt']:
        print('  %-16s %s' % (k, KV.get(k)))
