"""How hot the solar image actually makes the sensor, and for how long you can
leave it there.

Two heat paths act on very different timescales and both have to be in the
model, because each one alone gives a wrong answer:

1. LOCAL CONSTRICTION. The solar image is a disc of radius a delivering flux q
   into the silicon. Carslaw & Jaeger's classical solution for a uniformly
   heated disc on a semi-infinite solid gives the centre temperature

       dT_c(t) = (2 q / k) sqrt(kappa t) [ 1/sqrt(pi) - ierfc( a / (2 sqrt(kappa t)) ) ]

   which rises as sqrt(t) at early times and SATURATES at dT_c(inf) = q a / k.
   The characteristic time is a^2/kappa, ~21 ms for a 1.4 mm solar image in
   silicon. The approach is not exponential: the tail goes as
   1 - a/(2 sqrt(pi kappa t)), so 63 % is reached at ~11 ms, 95 % at ~0.7 s and
   99 % only at ~17 s. Either way, for anything longer than about a second the
   local temperature is at its asymptote and does not care how long the shutter
   stays open.

2. GLOBAL DIE HEATING. The total absorbed power P warms the whole die/package
   through its thermal resistance to the camera body, dT_g(t) = P R_th
   (1 - exp(-t / (R_th C_th))), with a time constant of seconds to minutes.
   This is the term that actually grows with exposure time.

The spot-size dependence in (1) is why quoting a bare "damage threshold in
W/cm^2" from laser experiments and comparing it to a solar image is wrong by
orders of magnitude: published CW thresholds are measured with spots of tens of
micrometres, where q a / k is tiny for a given q, whereas a telephoto solar
image is a hundred times wider and reaches the same temperature at a hundred
times lower irradiance. The model below therefore converts every published
threshold to a TEMPERATURE and compares temperatures, not irradiances.
"""
import numpy as np
from scipy.special import erfc

# --- Silicon thermophysical properties at ~300 K ----------------------------
# k: Glassbrenner & Slack (1964), Phys. Rev. 134, A1058 -- 148 W m^-1 K^-1 at
#    300 K for pure Si. rho and c_p: standard handbook values.
K_SI = 148.0            # W m^-1 K^-1
RHO_SI = 2329.0         # kg m^-3
CP_SI = 700.0           # J kg^-1 K^-1
KAPPA_SI = K_SI / (RHO_SI * CP_SI)      # m^2 s^-1


def ierfc(x):
    """Integrated complementary error function, ierfc(x) = int_x^inf erfc."""
    x = np.asarray(x, float)
    return np.exp(-x * x) / np.sqrt(np.pi) - x * erfc(x)


def dT_spot(t, q, a, k=K_SI, kappa=KAPPA_SI):
    """Centre temperature rise of a uniformly heated disc of radius a (m)
    carrying absorbed flux q (W m^-2) on a semi-infinite solid. Carslaw &
    Jaeger, Conduction of Heat in Solids, 2nd ed., section 10.5."""
    t = np.asarray(t, float)
    s = np.sqrt(kappa * np.maximum(t, 0.0))
    with np.errstate(divide='ignore', invalid='ignore'):
        arg = np.where(s > 0, a / (2.0 * s), np.inf)
    return np.where(t > 0, (2.0 * q / k) * s * (1.0 / np.sqrt(np.pi) - ierfc(arg)), 0.0)


def dT_spot_steady(q, a, k=K_SI):
    """Asymptote of dT_spot: q a / k."""
    return q * a / k


def spot_time_constant(a, kappa=KAPPA_SI, frac=1.0 - 1.0 / np.e):
    """Time to reach `frac` of the steady-state spot rise (numerical).

    Default is 1-1/e. NOTE this is NOT a^2/kappa: the approach to the asymptote
    has a slow 1/sqrt(t) tail, so quoting a^2/kappa and the 1-1/e time as the
    same number (they differ by 2x) is wrong.
    """
    tt = np.logspace(-8, 3, 6001)
    y = dT_spot(tt, 1.0, a) / dT_spot_steady(1.0, a)
    j = int(np.argmax(y >= frac))
    return float(tt[j])


def spot_diffusion_time(a, kappa=KAPPA_SI):
    """a^2/kappa, the characteristic diffusion time across the spot."""
    return a * a / kappa


def dT_spot_thin_plate(P, a, b, e, k=K_SI):
    """Worst-case local rise: adiabatic backside, heat forced to spread
    laterally inside a plate of thickness e from the spot edge (radius a) to a
    sink at radius b. Radial spreading resistance ln(b/a)/(2 pi k e) plus the
    in-spot term P/(4 pi k e). Applies when a >> e, which is exactly where the
    semi-infinite solution stops being valid."""
    return P * (np.log(b / a) / (2.0 * np.pi * k * e) + 1.0 / (4.0 * np.pi * k * e))


def dT_one_dimensional(q, e, k=K_SI):
    """Best case: perfect backside sink, 1-D conduction through thickness e."""
    return q * e / k


def dT_die(t, P, R_th, C_th):
    """Whole-die rise through a single-pole thermal network."""
    t = np.asarray(t, float)
    return P * R_th * (1.0 - np.exp(-t / (R_th * C_th)))


def die_heat_capacity(width_mm, height_mm, thickness_um,
                      rho=RHO_SI, cp=CP_SI):
    v = (width_mm / 1000.0) * (height_mm / 1000.0) * (thickness_um / 1e6)
    return v * rho * cp        # J/K


def temperature(t, q, a, P, R_th, C_th, T_amb):
    """Total sensor temperature at the centre of the solar image."""
    return T_amb + dT_spot(t, q, a) + dT_die(t, P, R_th, C_th)


def time_to_threshold(T_limit, q, a, P, R_th, C_th, T_amb, t_max=3600.0):
    """Exposure time at which the hot spot first reaches T_limit.

    Returns np.inf when the asymptotic temperature never reaches the limit --
    which, physically, means the configuration is safe for arbitrarily long
    exposures, not that it is 'safe for an hour'.
    """
    T_inf = T_amb + dT_spot_steady(q, a) + P * R_th
    if T_inf <= T_limit:
        return np.inf
    from scipy.optimize import brentq
    f = lambda x: temperature(x, q, a, P, R_th, C_th, T_amb) - T_limit
    lo = 1e-9
    if f(lo) > 0:
        return 0.0
    hi = t_max
    while f(hi) < 0 and hi < 1e7:
        hi *= 4.0
    return float(brentq(f, lo, hi, xtol=1e-9, rtol=1e-12))


def equivalent_irradiance(q_lab, a_lab, a_real, k=K_SI):
    """Translate a damage threshold measured with a laboratory spot of radius
    a_lab into the irradiance that produces the SAME peak temperature with a
    solar image of radius a_real. Steady state: q a / k is invariant, so
    q_real = q_lab * a_lab / a_real."""
    return q_lab * a_lab / a_real


def _selftest():
    # 1. Early-time limit must match the 1-D semi-infinite solution.
    a, q = 1e-3, 1e5
    t = 1e-9
    one_d = 2.0 * q * np.sqrt(KAPPA_SI * t / np.pi) / K_SI
    assert abs(dT_spot(t, q, a) / one_d - 1.0) < 1e-6, dT_spot(t, q, a) / one_d

    # 2. Late-time limit must match q a / k.
    assert abs(dT_spot(1e4, q, a) / dT_spot_steady(q, a) - 1.0) < 1e-3

    # 3. Monotonic in t, in q, and in a.
    tt = np.logspace(-9, 3, 400)
    y = dT_spot(tt, q, a)
    assert np.all(np.diff(y) >= -1e-12)
    assert dT_spot(1.0, 2 * q, a) > dT_spot(1.0, q, a)
    assert dT_spot_steady(q, 2 * a) > dT_spot_steady(q, a)

    # 4. Spot time constant must scale as a^2/kappa.
    t1, t2 = spot_time_constant(1e-3), spot_time_constant(2e-3)
    assert 3.0 < t2 / t1 < 5.0, (t1, t2)

    # 5. Threshold search: unreachable limit -> inf; reachable -> finite and
    #    consistent with temperature().
    inf = time_to_threshold(1e9, q, a, 0.1, 10.0, 0.01, 300.0)
    assert np.isinf(inf)
    Tl = 300.0 + 0.5 * (dT_spot_steady(q, a) + 0.1 * 10.0)
    tt_ = time_to_threshold(Tl, q, a, 0.1, 10.0, 0.01, 300.0)
    assert np.isfinite(tt_)
    assert abs(temperature(tt_, q, a, 0.1, 10.0, 0.01, 300.0) - Tl) < 1e-6

    # 6. Spot-size scaling of a published threshold.
    assert abs(equivalent_irradiance(100.0, 25e-6, 1.39e-3) -
               100.0 * 25e-6 / 1.39e-3) < 1e-12

    print('thermal selftest OK  (kappa_Si=%.3e m2/s, tau_spot(1.4mm)=%.1f ms)'
          % (KAPPA_SI, 1e3 * spot_time_constant(1.39e-3)))


if __name__ == '__main__':
    _selftest()
