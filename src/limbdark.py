"""Flux-weighted solar obscuration including photospheric limb darkening.

Why this matters: the Moon eats the solar disc from the LIMB inwards, and the
limb is fainter than the centre. So the fraction of *flux* removed is not the
fraction of *area* removed. Near first/fourth contact limb darkening makes the
eclipse dimmer-than-geometric... no: it makes it BRIGHTER than the geometric
area fraction would suggest, because the first thing hidden is the faint limb.
Reporting geometric obscuration as if it were a flux deficit is a real and
common error; this module avoids it.

Method: reduce the 2-D overlap integral to a 1-D radial quadrature. For a
circle of radius rho concentric with the solar disc, the Moon (centre at
separation s, radius R) hides an arc of half-angle phi(rho):

    phi = pi                                     if rho <= R - s
    phi = 0                                      if rho >= s + R or rho <= s - R
    phi = arccos((rho^2 + s^2 - R^2)/(2 rho s))  otherwise

so the hidden flux is  \\int_0^{Rs} I(mu(rho)) * 2 phi(rho) * rho d(rho)
and the total is       \\int_0^{Rs} I(mu(rho)) * 2 pi   * rho d(rho),
with mu = sqrt(1 - (rho/Rs)^2). Exact up to quadrature error.

Limb-darkening laws are supplied by the caller from published coefficients;
nothing here is fitted or assumed.
"""
import numpy as np

# --- Published limb-darkening laws -----------------------------------------
# Hestroffer & Magnan (1998), A&A 333, 338: I(mu)/I(1) = mu^alpha, with alpha
# given as a function of wavelength. Filled from the verified literature values
# in ld_coefficients.json; see src/ld_coefficients.json for provenance.


def I_power(mu, alpha):
    """Hestroffer & Magnan (1998) power law."""
    return np.power(np.clip(mu, 0.0, 1.0), alpha)


def I_poly(mu, coeffs):
    """Neckel (2005) / Neckel & Labs (1994) polynomial: I/I(1) = sum a_k mu^k."""
    mu = np.clip(mu, 0.0, 1.0)
    return sum(c * mu ** k for k, c in enumerate(coeffs))


def I_quadratic(mu, u1, u2):
    """Classical quadratic law I(mu)/I(1) = 1 - u1(1-mu) - u2(1-mu)^2."""
    mu = np.clip(mu, 0.0, 1.0)
    return 1.0 - u1 * (1.0 - mu) - u2 * (1.0 - mu) ** 2


def flux_obscuration(sep, r_sun, r_moon, intensity, n=4000):
    """Fraction of the solar RADIANT FLUX blocked.

    sep, r_sun, r_moon : angular separation and radii, same units, array-like.
    intensity          : callable mu -> relative specific intensity.
    Returns array of the same shape as sep.
    """
    sep = np.atleast_1d(np.asarray(sep, float))
    r_sun = np.broadcast_to(np.asarray(r_sun, float), sep.shape)
    r_moon = np.broadcast_to(np.asarray(r_moon, float), sep.shape)

    # Gauss-Legendre nodes on rho/Rs in (0,1); avoids the mu->0 endpoint.
    x, w = np.polynomial.legendre.leggauss(n)
    u = 0.5 * (x + 1.0)                       # (0,1)
    wu = 0.5 * w
    mu = np.sqrt(np.clip(1.0 - u ** 2, 0.0, 1.0))
    Iu = intensity(mu)                        # (n,)
    denom = np.sum(wu * Iu * 2.0 * np.pi * u)  # total, in units of Rs^2 I(1)

    S = sep[:, None]
    Rs = r_sun[:, None]
    Rm = r_moon[:, None]
    rho = u[None, :] * Rs                     # (t, n)

    with np.errstate(invalid='ignore', divide='ignore'):
        c = (rho ** 2 + S ** 2 - Rm ** 2) / (2.0 * rho * S)
    phi = np.arccos(np.clip(c, -1.0, 1.0))
    phi = np.where(rho <= Rm - S, np.pi, phi)
    phi = np.where((rho >= S + Rm) | (rho <= S - Rm), 0.0, phi)
    phi = np.where(S == 0.0, np.where(rho <= Rm, np.pi, 0.0), phi)

    num = np.sum(wu[None, :] * Iu[None, :] * 2.0 * phi * u[None, :], axis=1)
    out = np.clip(num / denom, 0.0, 1.0)

    # Concentric case. phi(rho) is then a step function and Gauss-Legendre
    # converges only as O(1/n) across the jump, which costs ~6e-4 for an
    # annular geometry. The integral is analytic there, so use it.
    cen = sep == 0.0
    if np.any(cen):
        kk = np.minimum(r_moon[cen] / r_sun[cen], 1.0)
        # Re-map the nodes onto (0, k) instead of masking them: masking leaves a
        # step inside the quadrature interval, remapping integrates a smooth
        # function over its actual support and is exact to machine precision.
        uc = kk[:, None] * u[None, :]                     # (m, n)
        muc = np.sqrt(np.clip(1.0 - uc ** 2, 0.0, 1.0))
        num_c = np.sum(wu[None, :] * intensity(muc) * 2.0 * np.pi * uc, axis=1) * kk
        out[cen] = np.clip(num_c / denom, 0.0, 1.0)
        out[cen & (r_moon >= r_sun)] = 1.0
    return out


def _selftest():
    """Sanity checks that fail loudly if the quadrature or masking breaks."""
    # 1. Uniform disc (no limb darkening) must reproduce the geometric area
    #    fraction computed independently by the circle-circle lens formula.
    def lens(d, r, R):
        if d >= r + R:
            return 0.0
        if d <= abs(R - r):
            return 1.0 if R >= r else (R / r) ** 2
        a1 = r * r * np.arccos((d * d + r * r - R * R) / (2 * d * r))
        a2 = R * R * np.arccos((d * d + R * R - r * r) / (2 * d * R))
        a3 = 0.5 * np.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R))
        return (a1 + a2 - a3) / (np.pi * r * r)

    flat = lambda mu: np.ones_like(mu)
    for d in [0.0, 0.3, 0.7, 1.0, 1.4, 1.9, 2.05]:
        got = flux_obscuration([d], [1.0], [1.03], flat)[0]
        exp = lens(d, 1.0, 1.03)
        assert abs(got - exp) < 2e-4, f'uniform disc: sep={d} got {got} want {exp}'

    # 2. Total eclipse (Moon fully covering) must give exactly 1 for any law.
    for law in (flat, lambda mu: I_power(mu, 0.6), lambda mu: I_quadratic(mu, 0.9, -0.2)):
        assert abs(flux_obscuration([0.0], [1.0], [1.03], law)[0] - 1.0) < 1e-9

    # 3. No eclipse gives exactly 0.
    assert flux_obscuration([3.0], [1.0], [1.03], flat)[0] == 0.0

    # 3b. ANNULAR, concentric: the Moon smaller than the Sun and centred. The
    #     uniform-disc answer is exactly (Rm/Rs)^2 and the power-law answer is
    #     1 - (1 - k^2)^(alpha/2 + 1). This is the case the naive step-function
    #     quadrature got wrong by 6e-4.
    for k in (0.5, 0.9, 0.97):
        got = flux_obscuration([0.0], [1.0], [k], flat)[0]
        assert abs(got - k ** 2) < 1e-9, ('annular uniform', k, got, k ** 2)
        for al in (0.3, 0.5, 0.8):
            got = flux_obscuration([0.0], [1.0], [k], lambda mu: I_power(mu, al))[0]
            exp = 1.0 - (1.0 - k ** 2) ** (al / 2.0 + 1.0)
            assert abs(got - exp) < 1e-6, ('annular LD', k, al, got, exp)

    # 4. With limb darkening, a partial eclipse must remove LESS flux than area
    #    while the Moon is only over the limb, and MORE once it covers the core.
    ld = lambda mu: I_quadratic(mu, 0.9, -0.2)
    d_limb = 1.9
    assert flux_obscuration([d_limb], [1.0], [1.03], ld)[0] < lens(d_limb, 1.0, 1.03)
    d_core = 0.4
    assert flux_obscuration([d_core], [1.0], [1.03], ld)[0] > lens(d_core, 1.0, 1.03)

    # 5. Quadrature convergence: doubling n must not move the answer.
    a = flux_obscuration([1.2], [1.0], [1.03], ld, n=2000)[0]
    b = flux_obscuration([1.2], [1.0], [1.03], ld, n=8000)[0]
    assert abs(a - b) < 1e-5, (a, b)
    print('limbdark selftest OK')


if __name__ == '__main__':
    _selftest()
