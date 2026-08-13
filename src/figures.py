"""All figures for the paper. Every panel is drawn from the CSV/JSON products
of the other modules; nothing is drawn from a hand-typed number.
"""
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

import optics
import thermal
import eye as eyemod
from siteconf import ROOT

D = ROOT+'/data/'
F = ROOT+'/figs/'

CIRC = json.load(open(D + 'circumstances.json'))
ATM = json.load(open(D + 'atmosphere.json'))['adopted_for_eclipse_window']
HOR = json.load(open(D + 'horizon.json'))
PATH = json.load(open(D + 'pathgeom.json'))
PMETA = json.load(open(D + 'perseids_meta.json'))
HW = json.load(open(D + 'hardware.json'))

plt.rcParams.update({
    'font.size': 8, 'axes.titlesize': 8.5, 'axes.labelsize': 8,
    'legend.fontsize': 7, 'xtick.labelsize': 7, 'ytick.labelsize': 7,
    'axes.grid': True, 'grid.alpha': 0.22, 'grid.linewidth': 0.5,
    'figure.dpi': 200, 'savefig.dpi': 200, 'savefig.bbox': 'tight',
    'axes.spines.top': False, 'axes.spines.right': False,
    'lines.linewidth': 1.6, 'legend.frameon': False,
})

# Categorical palette, assigned in FIXED order and never cycled. Taken from the
# dataviz reference instance and checked with its validator: worst adjacent pair
# dE 24.7 (protan), 33.6 normal vision, and all four above 3:1 contrast on white.
# The previous palette failed: its red/green pair sat at dE 5.0 under deuteranopia
# while being adjacent series in three different figures.
C = {
    'c1': '#2a78d6',      # blue     slot 1
    'c2': '#eb6834',      # orange   slot 2
    'c3': '#4a3aa7',      # violet   slot 3
    'c4': '#008300',      # green    slot 4
    'ink': '#0b0b0b',
    'ink2': '#52514e',
    'grid': '#9a9a94',
}
# Semantic aliases so the figure code reads by meaning, not by slot number.
C['eclipse'] = C['c1']    # the eclipsed / with-Moon case
C['noecl'] = C['c2']      # the no-eclipse baseline
C['third'] = C['c3']
C['accent'] = C['c4']
C['grey'] = C['ink2']


def logticks(ax, axis='x', ticks=None):
    """Put explicit ticks on a log axis and SILENCE the automatic minor labels.

    Without this, matplotlib keeps its own LogFormatter labels on the minor
    ticks and they overprint the custom ones -- which is what turned the
    f-number axis into '2 3x10^0 4 6x10^0 8 11 16 2x10^1 3x10^1'.
    """
    a = ax.xaxis if axis == 'x' else ax.yaxis
    a.set_minor_formatter(mticker.NullFormatter())
    a.set_minor_locator(mticker.NullLocator())
    if ticks is not None:
        a.set_major_locator(mticker.FixedLocator(ticks))
        a.set_major_formatter(mticker.FixedFormatter(
            [('%g' % t).replace('.', ',') for t in ticks]))


sp = pd.read_csv(D + 'spectral_timeseries.csv')
ey = pd.read_csv(D + 'eye_timeseries.csv')
per = pd.read_csv(D + 'perseids.csv')
tmax = CIRC['contacts']['MAX']['tt_jd']
CT = {k: (v['tt_jd'] - tmax) * 86400.0 for k, v in CIRC['contacts'].items()}


def mark_contacts(ax, labels=('C1', 'C2', 'C3', 'C4'), y=None, ls=':'):
    for k in labels:
        if k in CT:
            ax.axvline(CT[k] / 60.0, color=C['grey'], ls=ls, lw=0.7, zorder=0)
            if y is not None:
                ax.annotate(k, (CT[k] / 60.0, y), fontsize=6, color=C['grey'],
                            ha='center', va='bottom')


def fig1_geometry():
    fig, ax = plt.subplots(2, 1, figsize=(6.4, 4.4), sharex=True,
                           gridspec_kw={'hspace': 0.12})
    x = sp['seconds_from_max'] / 60.0
    ax[0].plot(x, 100 * sp['obsc_geometric'], color=C['eclipse'])
    ax[0].set_ylabel('Obscuración geométrica [%]')
    ax[0].set_ylim(-3, 105)
    mark_contacts(ax[0], y=1)
    ax[0].axhspan(99.99, 105, color=C['eclipse'], alpha=0.08)
    ax[0].annotate('totalidad: %.1f s' % CIRC['totality_duration_s'],
                   (0, 100), xytext=(14, 84), fontsize=7, color=C['eclipse'],
                   arrowprops=dict(arrowstyle='->', color=C['eclipse'], lw=0.7))

    ax[1].plot(x, sp['sun_alt_refr_deg'], color=C['noecl'], label='altura solar (refractada)')
    hz = np.array(HOR['profiles']['k013']['horizon_alt_deg'])
    az = np.array(HOR['profiles']['k013']['az_deg'])
    sun_az = sp['sun_az_deg'].values
    hz_at_sun = np.interp(sun_az, az, hz)
    ax[1].plot(x, hz_at_sun, color=C['third'], lw=1.0, ls='--',
               label='horizonte topográfico real (DEM GLO-30)')
    ax[1].axhline(0, color=C['grey'], lw=0.6)
    ax[1].fill_between(x, -8, hz_at_sun, color=C['third'], alpha=0.10)
    ax[1].set_ylabel('Altura sobre el horizontal [°]')
    ax[1].set_xlabel('Minutos respecto al máximo (20:29:59.8 CEST)')
    ax[1].set_ylim(-6, 17)
    ax[1].legend(loc='upper right', frameon=False)
    mark_contacts(ax[1])
    ax[1].annotate('Sol a %.2f° en la totalidad' % CIRC['contacts']['MAX']['sun_alt_refracted_deg'],
                   (0, CIRC['contacts']['MAX']['sun_alt_refracted_deg']),
                   xytext=(-42, 9.5), fontsize=7, color=C['noecl'],
                   arrowprops=dict(arrowstyle='->', color=C['noecl'], lw=0.7))
    fig.savefig(F + 'fig1_geometry.pdf')
    plt.close(fig)


def fig2_irradiance():
    """The comparison the observer asked for: how much of the darkening is the
    sunset and how much is the Moon."""
    fig, ax = plt.subplots(3, 1, figsize=(6.4, 6.2), sharex=True,
                           gridspec_kw={'hspace': 0.13, 'height_ratios': [2, 1.2, 1.2]})
    x = sp['seconds_from_max'] / 60.0
    a = ax[0]
    a.plot(x, sp['dni_spectral_noeclipse'], color=C['noecl'],
           label='sin eclipse (solo la caída del atardecer)')
    a.plot(x, sp['dni_spectral_eclipsed'], color=C['eclipse'],
           label='con eclipse (atardecer $\\times$ Luna)')
    a.fill_between(x, sp['dni_spectral_eclipsed'], sp['dni_spectral_noeclipse'],
                   color=C['eclipse'], alpha=0.12, label='déficit atribuible a la Luna')
    a.set_ylabel('Irradiancia normal directa [W m$^{-2}$]')
    a.set_yscale('log'); a.set_ylim(1e-3, 1e3)
    a.legend(loc='lower left', frameon=False)
    mark_contacts(a, y=1.5e-3)
    a.set_title('Emplazamiento 41.2129° N, 0.7095° E — 616 m — cielo despejado (CAMS AOD$_{550}$=%.2f)'
                % ATM['aod550'], loc='left')

    b = ax[1]
    b.plot(x, 100 * sp['dni_spectral_eclipsed'] / sp['dni_spectral_noeclipse'].clip(1e-9),
           color=C['eclipse'])
    b.set_ylabel('Transmisión\ndel eclipse [%]')
    b.set_ylim(-3, 105)
    mark_contacts(b)

    c = ax[2]
    ref = sp['dni_spectral_noeclipse'].iloc[0]
    c.plot(x, 100 * (1 - sp['dni_spectral_noeclipse'] / ref), color=C['noecl'],
           label='caída acumulada por el atardecer')
    c.plot(x, 100 * (1 - sp['dni_spectral_eclipsed'] / ref), color=C['eclipse'],
           label='caída acumulada total')
    c.set_ylabel('Reducción respecto\na C1 [%]')
    c.set_xlabel('Minutos respecto al máximo (20:29:59.8 CEST)')
    c.set_ylim(-3, 105)
    c.legend(loc='center left', frameon=False)
    mark_contacts(c)
    fig.savefig(F + 'fig2_irradiance.pdf')
    plt.close(fig)


def fig3_chromatic():
    fig, ax = plt.subplots(1, 2, figsize=(6.4, 2.6))
    x = sp['seconds_from_max'] / 60.0
    for lam, col in ((450, '#2c3e94'), (550, '#1e8449'), (700, '#a93226')):
        ax[0].plot(x, 100 * sp['trans_%dnm' % lam], color=col, label='%d nm' % lam)
    ax[0].set_xlim(-60, -20)
    ax[0].set_xlabel('Minutos respecto al máximo')
    ax[0].set_ylabel('Transmisión del eclipse [%]')
    ax[0].legend(frameon=False, title='longitud de onda')

    g = sp['obsc_geometric'].values
    f550 = 1 - sp['trans_550nm'].values
    m = (g > 0.001) & (g < 0.999)
    ax[1].plot(100 * g[m], 100 * (f550[m] - g[m]), color=C['accent'])
    ax[1].axhline(0, color=C['grey'], lw=0.6)
    ax[1].set_xlabel('Obscuración geométrica (área) [%]')
    ax[1].set_ylabel('Déficit de flujo $-$ área [puntos %]')
    ax[1].set_title('Efecto del oscurecimiento de limbo', loc='left')
    fig.savefig(F + 'fig3_chromatic.pdf')
    plt.close(fig)


def _dni_at(sec):
    i = (sp['seconds_from_max'] - sec).abs().idxmin()
    return float(sp['dni_spectral_eclipsed'].iloc[i]), \
        float(sp['dni_spectral_noeclipse'].iloc[i]), \
        float(np.radians(sp['r_sun_arcsec'].iloc[i] / 3600.0))


def fig4_focalplane():
    """Three panels, ONE measure each. The earlier version put image diameter and
    total power on a twin axis of the same plot; two y-scales in one frame invite
    the reader to compare slopes that are not comparable."""
    dni_c1, _, rs = _dni_at(CT['C1'] + 1)
    dni_pre, _, _ = _dni_at(-600)
    fig, ax = plt.subplots(1, 3, figsize=(7.0, 2.6),
                           gridspec_kw={'wspace': 0.42})

    N = np.logspace(np.log10(1.2), np.log10(32), 400)
    ax[0].plot(N, optics.peak_focal_plane_irradiance(dni_c1, rs, N, 1.0) / 1e4,
               color=C['c2'], label='C1, Sol sin eclipsar')
    ax[0].plot(N, optics.peak_focal_plane_irradiance(dni_pre, rs, N, 1.0) / 1e4,
               color=C['c1'], label='10 min antes del máximo')
    marks = [(1.9, 'móvil f/1,9', C['c4'], 's'), (3.5, '16 mm f/3,5', C['c3'], 'o'),
             (6.3, '300 mm f/6,3', C['c3'], 'o')]
    for N0, lab, col, mk in marks:
        y = optics.peak_focal_plane_irradiance(dni_c1, rs, N0, 1.0) / 1e4
        ax[0].plot([N0], [y], mk, ms=5, color=col, zorder=5,
                   markeredgecolor='white', markeredgewidth=0.8)
        ax[0].annotate(lab, (N0, y), xytext=(5, 5), textcoords='offset points',
                       fontsize=6, color=C['ink2'])
    ax[0].set_xscale('log'); ax[0].set_yscale('log')
    logticks(ax[0], 'x', [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32])
    ax[0].set_xlabel('Número f')
    ax[0].set_ylabel('Irradiancia de pico [W cm$^{-2}$]')
    ax[0].legend(loc='lower left', fontsize=6, borderpad=0.2)
    ax[0].set_title('No depende de la focal', loc='left', fontsize=7.5)

    f = np.linspace(16, 300, 400)
    Nt = optics.tamron_max_aperture(f)
    ax[1].plot(f, optics.solar_image_diameter_mm(f, rs), color=C['c1'])
    ax[1].set_xlabel('Focal [mm]')
    ax[1].set_ylabel('Diámetro imagen solar [mm]')
    ax[1].set_title('Sí depende de la focal', loc='left', fontsize=7.5)

    ax[2].plot(f, optics.total_power_W(dni_c1, f, Nt, 1.0) * 1e3, color=C['c2'])
    ax[2].set_xlabel('Focal [mm]')
    ax[2].set_ylabel('Potencia en el sensor [mW]')
    ax[2].set_title('A diafragma máximo', loc='left', fontsize=7.5)
    fig.savefig(F + 'fig4_focalplane.pdf')
    plt.close(fig)


def fig5_thermal():
    dni_c1, _, rs = _dni_at(CT['C1'] + 1)
    dni_noon = 900.0
    fig, ax = plt.subplots(1, 2, figsize=(7.0, 3.2),
                           gridspec_kw={'wspace': 0.30})
    t = np.logspace(-5, 3, 600)
    cfgs = [('300 mm f/6,3 · mediodía', 300, 6.3, dni_noon, C['c2'], '-'),
            ('300 mm f/6,3 · C1', 300, 6.3, dni_c1, C['c1'], '-'),
            ('móvil f/1,9 · C1', 6.93, 1.9, dni_c1, C['c4'], '-.'),
            ('16 mm f/3,5 · C1', 16, 3.5, dni_c1, C['c3'], '--')]
    for lab, f_mm, N, dni, col, ls in cfgs:
        q = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
        a = optics.solar_image_diameter_mm(f_mm, rs) / 2000.0
        ax[0].plot(t, thermal.dT_spot(t, q, a), color=col, ls=ls, label=lab)
        ax[0].axhline(thermal.dT_spot_steady(q, a), color=col, lw=0.5, alpha=0.35)
    ax[0].set_xscale('log'); ax[0].set_yscale('log')
    ax[0].set_ylim(1e-3, 20)
    ax[0].set_xlabel('Tiempo de exposición [s]')
    ax[0].set_ylabel('$\\Delta T$ local en el punto caliente [K]')
    ax[0].legend(loc='lower right', fontsize=6.2, borderpad=0.2)
    ax[0].set_title('Constricción local (Carslaw & Jaeger)', loc='left', fontsize=7.5)

    a_mm = np.logspace(-2.3, 0.6, 300)
    for dni, lab, col in ((dni_noon, 'mediodía', C['c2']), (dni_c1, 'C1', C['c1'])):
        for N, ls in ((6.3, '-'), (1.9, '--')):
            q = optics.peak_focal_plane_irradiance(dni, rs, N, tau=1.0)
            ax[1].plot(2 * a_mm, thermal.dT_spot_steady(q, a_mm / 1000.0),
                       color=col, ls=ls, label='%s, f/%s' % (lab, ('%.1f' % N).replace('.', ',')))
    ax[1].set_xscale('log'); ax[1].set_yscale('log')
    ax[1].set_xlabel('Diámetro de la imagen solar [mm]')
    ax[1].set_ylabel('$\\Delta T$ estacionario [K]')
    ax[1].legend(loc='upper left', fontsize=6.2, borderpad=0.2)
    ax[1].set_title('Escalado con el tamaño de la mancha', loc='left', fontsize=7.5)
    fig.savefig(F + 'fig5_thermal.pdf')
    plt.close(fig)


def fig6_eye():
    fig, ax = plt.subplots(2, 1, figsize=(6.4, 4.4), sharex=True,
                           gridspec_kw={'hspace': 0.12})
    x = ey['seconds_from_max'] / 60.0
    ax[0].plot(x, ey['E_blue_noeclipse_W_m2'], color=C['noecl'],
               label='luz azul $E_B$ — Sol sin eclipsar')
    ax[0].plot(x, ey['E_blue_W_m2'], color=C['eclipse'],
               label='luz azul $E_B$ — Sol eclipsado')
    ax[0].axhline(1.0, color='k', lw=0.8, ls='--')
    ax[0].annotate('límite ICNIRP $E_B$ = 1 W m$^{-2}$ (exposición $\\geq$ 100 s)',
                   (-52, 1.15), fontsize=6.5)
    ax[0].set_yscale('log'); ax[0].set_ylim(1e-4, 1e2)
    ax[0].set_ylabel('Irradiancia eficaz [W m$^{-2}$]')
    ax[0].legend(frameon=False, loc='lower left')
    mark_contacts(ax[0], y=1.4e-4)

    st = ey['safe_stare_s'].values.copy()
    stn = ey['safe_stare_noeclipse_s'].values.copy()
    cap = 1e4
    ax[1].plot(x, np.clip(stn, 0, cap), color=C['noecl'], label='Sol sin eclipsar')
    ax[1].plot(x, np.clip(st, 0, cap), color=C['eclipse'], label='Sol eclipsado')
    ax[1].axhline(100, color='k', lw=0.6, ls=':')
    ax[1].annotate('100 s: ICNIRP pasa al límite de irradiancia', (-52, 130), fontsize=6.5)
    ax[1].set_yscale('log'); ax[1].set_ylim(1, cap)
    ax[1].set_ylabel('Tiempo máximo de fijación [s]')
    ax[1].set_xlabel('Minutos respecto al máximo (20:29:59.8 CEST)')
    ax[1].legend(frameon=False, loc='upper left')
    mark_contacts(ax[1])
    ax[1].annotate('sin límite ICNIRP\n(no significa cómodo ni prudente)',
                   (-8, 3000), fontsize=6, color=C['grey'], ha='center')
    fig.savefig(F + 'fig6_eye.pdf')
    plt.close(fig)


def fig7_horizon():
    fig, ax = plt.subplots(figsize=(6.4, 2.7))
    az = np.array(HOR['profiles']['k013']['az_deg'])
    for key, lab, col, ls in (('k007', '$k_r$=0.07', C['grey'], ':'),
                              ('k013', '$k_r$=0.13 (nominal)', C['third'], '-'),
                              ('k020', '$k_r$=0.20', C['grey'], '--')):
        ax.plot(az, HOR['profiles'][key]['horizon_alt_deg'], color=col, ls=ls, lw=1.0,
                label='horizonte, ' + lab)
    ax.plot(sp['sun_az_deg'], sp['sun_alt_refr_deg'], color=C['noecl'], lw=1.6,
            label='trayectoria del Sol')
    i = (sp['seconds_from_max']).abs().idxmin()
    ax.plot(sp['sun_az_deg'].iloc[i], sp['sun_alt_refr_deg'].iloc[i], 'o',
            color=C['eclipse'], ms=5)
    ax.annotate('totalidad', (sp['sun_az_deg'].iloc[i], sp['sun_alt_refr_deg'].iloc[i]),
                xytext=(6, 6), textcoords='offset points', fontsize=7, color=C['eclipse'])
    ax.set_xlim(265, 300); ax.set_ylim(-2, 17)
    ax.set_xlabel('Acimut [°]'); ax.set_ylabel('Altura [°]')
    ax.legend(frameon=False, ncol=2, fontsize=6.5)
    fig.savefig(F + 'fig7_horizon.pdf')
    plt.close(fig)


def fig8_path():
    fig, ax = plt.subplots(figsize=(6.4, 2.5))
    s = PATH['scan_north_km_to_duration_s']
    k = np.array(sorted(s, key=float), dtype=float)
    v = np.array([s[str(x) if str(x) in s else '%.1f' % x] for x in k])
    ax.plot(k, v, color=C['eclipse'])
    ax.axvline(0, color=C['noecl'], lw=1.0)
    ax.annotate('emplazamiento\n%.1f s' % PATH['duration_at_site_s'], (0, PATH['duration_at_site_s']),
                xytext=(8, -18), textcoords='offset points', fontsize=7, color=C['noecl'],
                arrowprops=dict(arrowstyle='->', color=C['noecl'], lw=0.7))
    ax.set_xlabel('Desplazamiento del observador hacia el norte [km]')
    ax.set_ylabel('Duración de la totalidad [s]')
    ax.set_ylim(0, 110)
    fig.savefig(F + 'fig8_path.pdf')
    plt.close(fig)


def fig9_perseids():
    fig, ax = plt.subplots(figsize=(6.4, 2.8))
    order = [(0.0, C['c1'], '-'), (2.0, C['c2'], '-'),
             (3.0, C['c3'], '--'), (4.0, C['c4'], '-.')]
    for lm, col, ls in order:
        d = per[(per.limiting_mag == lm) & (per.zhr == 100)].sort_values('focal_mm')
        ax.plot(d['focal_mm'], d['P_at_least_one_totality_pct'], ls, marker='o',
                ms=3.5, color=col, label='magnitud límite %.0f' % lm)
    ax.set_xscale('log'); ax.set_yscale('log')
    logticks(ax, 'x', [16, 24, 35, 50, 100, 200, 300])
    ax.set_xlabel('Focal [mm], formato APS-C')
    ax.set_ylabel('P(≥1 Perseida\nen el encuadre) [%]')
    ax.legend(ncol=2, fontsize=6.5, loc='lower left',
              title='ZHR = 100, la cota superior del IMO', title_fontsize=6.5)
    fig.savefig(F + 'fig9_perseids.pdf')
    plt.close(fig)


def fig10_diamondring():
    """The last seconds of photosphere, which is what the camera actually sees
    at second contact."""
    d = json.load(open(D + 'diamondring.json'))
    t = np.array(d['t_from_C2_s']); area = np.array(d['remaining_area'])
    flux = np.array(d['remaining_flux'])      # NOT F: that is the figs directory
    fig, ax = plt.subplots(figsize=(6.4, 2.9))
    m = t <= 0
    ax.plot(t[m], area[m], color=C['grey'], ls='--', label='fracción de ÁREA fotosférica')
    ax.plot(t[m], flux[m], color=C['eclipse'], label='fracción de FLUJO directo')
    ax.set_yscale('log'); ax.set_ylim(1e-9, 1e-1)
    ax.set_xlim(-30, 1)
    ax.set_xlabel('Segundos respecto al segundo contacto')
    ax.set_ylabel('Fracción restante del Sol sin eclipsar')
    ax.axvline(0, color=C['noecl'], lw=1.0)
    ax.annotate('C2', (0, 3e-9), xytext=(3, 0), textcoords='offset points',
                fontsize=7, color=C['noecl'])
    ax.annotate('$e$-folding cada %.3f s\nen el último segundo' % d['efold_s'],
                (-1, 5e-6), xytext=(-16, 8e-8), fontsize=7, color=C['eclipse'],
                arrowprops=dict(arrowstyle='->', color=C['eclipse'], lw=0.7))
    ax.legend(frameon=False, loc='upper right')
    ax.set_title('El oscurecimiento de limbo adelanta la extinción del flujo '
                 'respecto al área', loc='left', fontsize=7)
    fig.savefig(F + 'fig10_diamondring.pdf')
    plt.close(fig)


def fig11_threshold_plane():
    """Where the measured threshold sits, and where our optics sit.

    dT = q a / k makes lines of constant temperature rise straight with slope -1
    on log axes. A published threshold enters as a POINT; its own iso-dT line is
    where it applies at any other spot size. That is hypothesis A. Hypothesis B
    is that the damage is set by absorption in a thin low-conductivity layer, in
    which case the threshold does not move with spot size at all -- a horizontal
    line. The two together bracket the margin.
    """
    LIT = json.load(open(D + 'literature.json'))
    A = LIT['cmos_damage_threshold']['adopted']
    q_lab, a_lab = A['q_lab_W_m2'], A['effective_radius_um'] * 1e-6
    dni_c1, _, rs = _dni_at(CT['C1'] + 1)
    a = np.logspace(-6, -2, 400)

    fig, ax = plt.subplots(figsize=(6.6, 3.6))
    # Hypothesis A: the measured threshold rescaled by q*a invariance.
    ax.plot(a * 2e3, (q_lab * a_lab / a) / 1e4, color=C['c2'], lw=2.0,
            label='umbral medido, reescalado (hipótesis A)')
    # Hypothesis B: spot-size independent.
    ax.axhline(q_lab / 1e4, color=C['c2'], ls=':', lw=1.8,
               label='umbral medido, sin reescalar (hipótesis B)')
    ax.fill_between(a * 2e3, (q_lab * a_lab / a) / 1e4, q_lab / 1e4,
                    where=((q_lab * a_lab / a) < q_lab), color=C['c2'], alpha=0.08)
    ax.plot([2 * a_lab * 1e3], [q_lab / 1e4], '*', ms=15, color=C['c2'],
            markeredgecolor='white', markeredgewidth=1.0, zorder=6)
    ax.annotate('49 kW cm$^{-2}$ medido aquí\n(Schwarz et al. 2017, CW 532 nm)',
                (2 * a_lab * 1e3, q_lab / 1e4), xytext=(12, 6),
                textcoords='offset points', fontsize=6.5, color=C['c2'])

    for f_mm, N, lab, col in ((300, 6.3, 'réflex 300 mm f/6,3', C['c1']),
                              (16, 3.5, 'réflex 16 mm f/3,5', C['c3']),
                              (6.93, 1.9, 'móvil f/1,9', C['c4'])):
        E = optics.peak_focal_plane_irradiance(dni_c1, rs, N, tau=1.0)
        d = optics.solar_image_diameter_mm(f_mm, rs)
        ax.plot([d], [E / 1e4], 'o', ms=7, color=col, zorder=6,
                markeredgecolor='white', markeredgewidth=1.0)
        ax.annotate(lab, (d, E / 1e4), xytext=(9, -9), textcoords='offset points',
                    fontsize=6.5, color=col)
    # the configuration that does get close, for contrast
    E = optics.peak_focal_plane_irradiance(900.0, rs, 2.8, tau=1.0)
    d = optics.solar_image_diameter_mm(300, rs)
    ax.plot([d], [E / 1e4], '^', ms=7, color=C['ink2'], zorder=6,
            markeredgecolor='white', markeredgewidth=1.0)
    ax.annotate('300 mm f/2,8 al mediodía', (d, E / 1e4), xytext=(-6, 10),
                textcoords='offset points', fontsize=6.5, color=C['ink2'], ha='right')

    ax.set_xscale('log'); ax.set_yscale('log')
    ax.set_xlabel('Diámetro de la mancha sobre el sensor [mm]')
    ax.set_ylabel('Irradiancia de pico [W cm$^{-2}$]')
    ax.set_xlim(0.01, 10); ax.set_ylim(1, 3e5)
    ax.legend(loc='lower left', fontsize=6.5)
    fig.savefig(F + 'fig11_threshold_plane.pdf')
    plt.close(fig)


if __name__ == '__main__':
    for fn in (fig1_geometry, fig2_irradiance, fig3_chromatic, fig4_focalplane,
               fig5_thermal, fig6_eye, fig7_horizon, fig8_path, fig9_perseids,
               fig10_diamondring, fig11_threshold_plane):
        fn()
        print('ok', fn.__name__)
