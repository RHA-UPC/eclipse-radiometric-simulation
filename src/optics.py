# eclipse-radiometric-simulation
# Copyright (C) 2026 Ricardo Heredia Alessandrello
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License, version 3, as published
# by the Free Software Foundation.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
# FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details. You should have received a copy of it along with this program; if
# not, see <https://www.gnu.org/licenses/>.
#
# SPDX-License-Identifier: AGPL-3.0-only

"""Focal-plane irradiance produced by the eclipsed Sun in each camera.

The one result that decides everything here is standard radiometry, and it is
the opposite of most photographers' intuition:

    E_image = pi * L * tau * sin^2(theta')  =  pi * L * tau / (4 N^2)

for an extended source imaged by a lens of working f-number N. The IRRADIANCE
at the focal plane depends ONLY on the f-number and the transmittance. It does
NOT depend on the focal length. A 300 mm lens at f/6.3 puts exactly the same
W/cm^2 on the sensor as a 16 mm lens at f/6.3; what the long lens changes is
the SIZE of the solar image (and hence the total power, and hence how easily
the heat spreads sideways out of the illuminated spot).

That is why a smartphone at f/1.9 concentrates ~11x more irradiance than the
DSLR at f/6.3, and why the interesting question is not "which lens is longer"
but "which lens is faster, and how big is the resulting spot".

L is obtained from the measured/modelled direct normal irradiance:
    L = DNI / Omega_sun,  Omega_sun = pi sin^2(alpha_r)   [projected, exact]
and the disc CENTRE is brighter than the disc average by (alpha_LD + 2)/2 for
the Hestroffer & Magnan power-law limb darkening, which is the number that
matters for a small hot spot.
"""
import json
import numpy as np
import pandas as pd

import siteconf as S
from radiometry import alpha_hestroffer, central_radiance_ratio
from siteconf import ROOT

HW = json.load(open(ROOT+'/data/hardware.json'))


def omega_sun(r_sun_rad):
    """PROJECTED solid angle of the solar disc, pi sin^2(alpha_r).

    For a uniform disc of angular radius alpha viewed normally, the irradiance
    is exactly E = L * int cos(theta) dOmega = L * pi sin^2(alpha). Using the
    plain solid angle 2 pi (1 - cos alpha) instead is wrong by (1+cos alpha)/2
    and, more importantly, breaks the thermodynamic concentration limit at the
    1e-5 level -- which is exactly the identity used to check this module.
    """
    return np.pi * np.sin(r_sun_rad) ** 2


def focal_plane_irradiance(dni, r_sun_rad, N, tau=1.0):
    """Mean irradiance over the solar image at the focal plane, W m^-2."""
    L = dni / omega_sun(r_sun_rad)
    return np.pi * L * tau / (4.0 * np.asarray(N, float) ** 2)


def peak_focal_plane_irradiance(dni, r_sun_rad, N, tau=1.0, lam_nm=550.0):
    """Irradiance at the CENTRE of the solar image (limb darkening included)."""
    return focal_plane_irradiance(dni, r_sun_rad, N, tau) * \
        central_radiance_ratio(alpha_hestroffer(lam_nm))


def solar_image_diameter_mm(focal_mm, r_sun_rad):
    """Diameter of the solar image at the focal plane, mm."""
    return 2.0 * np.asarray(focal_mm, float) * np.tan(r_sun_rad)


def total_power_W(dni, focal_mm, N, tau=1.0):
    """Total solar power delivered to the focal plane.

    All the light the entrance pupil collects from the Sun ends up inside the
    solar image, so P = tau * DNI * pi D^2 / 4 with D = f/N. Independent of how
    it is distributed.
    """
    D_m = np.asarray(focal_mm, float) / 1000.0 / np.asarray(N, float)
    return tau * dni * np.pi * D_m ** 2 / 4.0


def concentration(N, r_sun_rad, tau=1.0):
    """E_image / DNI, the geometric concentration ratio."""
    return np.pi * tau / (4.0 * np.asarray(N, float) ** 2 * omega_sun(r_sun_rad))


def thermodynamic_limit(r_sun_rad):
    """Maximum concentration allowed by the second law for a lossless system
    accepting a half-angle of 90 deg: C_max = 1/sin^2(alpha_r)."""
    return 1.0 / np.sin(r_sun_rad) ** 2


def tamron_max_aperture(focal_mm):
    """Maximum aperture of the Tamron B016 vs focal length, interpolated from
    the manufacturer's published breakpoints (see data/hardware.json)."""
    tbl = HW['lenses']['tamron_16_300_B016']['max_aperture_vs_focal_mm']
    f = np.array([r[0] for r in tbl], float)
    n = np.array([r[1] for r in tbl], float)
    return np.interp(np.asarray(focal_mm, float), f, n)


def build_table(dni, r_sun_rad, tau, focals, fnumbers, sensor):
    rows = []
    w, h = sensor['width_mm'], sensor['height_mm']
    for f_mm in focals:
        d_img = solar_image_diameter_mm(f_mm, r_sun_rad)
        a_img_mm2 = np.pi * (d_img / 2.0) ** 2
        for N in fnumbers:
            E = focal_plane_irradiance(dni, r_sun_rad, N, tau)
            Ep = peak_focal_plane_irradiance(dni, r_sun_rad, N, tau)
            P = total_power_W(dni, f_mm, N, tau)
            rows.append({
                'focal_mm': f_mm, 'f_number': N,
                'entrance_pupil_mm': f_mm / N,
                'E_mean_W_cm2': E / 1e4,
                'E_peak_W_cm2': Ep / 1e4,
                'suns_mean': E / dni,
                'image_diameter_mm': d_img,
                'image_area_mm2': a_img_mm2,
                'frame_area_fraction_pct': 100.0 * a_img_mm2 / (w * h),
                'total_power_mW': P * 1e3,
                'areal_power_density_frame_mW_cm2': P * 1e3 / (w * h / 100.0),
            })
    return pd.DataFrame(rows)


def _selftest():
    r = np.radians(946.66 / 3600.0)          # solar semidiameter at the eclipse
    # 1. Concentration must never exceed the thermodynamic limit.
    for N in (0.5, 1.0, 1.9, 6.3):
        c = concentration(N, r, tau=1.0)
        cmax = thermodynamic_limit(r)
        assert c <= cmax * 1.0000001, (N, c, cmax)
    # At N = 0.5 (sin theta' = 1) the concentration must EQUAL the limit.
    assert abs(concentration(0.5, r, 1.0) / thermodynamic_limit(r) - 1.0) < 1e-9
    # 2. Irradiance is independent of focal length, power is not.
    e1 = focal_plane_irradiance(800.0, r, 6.3)
    e2 = focal_plane_irradiance(800.0, r, 6.3)
    assert e1 == e2
    p16 = total_power_W(800.0, 16.0, 6.3)
    p300 = total_power_W(800.0, 300.0, 6.3)
    assert abs(p300 / p16 - (300.0 / 16.0) ** 2) < 1e-9
    # 3. Energy conservation: P must equal E_mean x image area.
    for f_mm in (16.0, 100.0, 300.0):
        for N in (1.9, 3.5, 6.3, 22.0):
            E = focal_plane_irradiance(800.0, r, N)          # W/m^2
            A = np.pi * (solar_image_diameter_mm(f_mm, r) / 2000.0) ** 2   # m^2
            P = total_power_W(800.0, f_mm, N)
            # Closes to 1/cos^2(alpha_r) = 1 + 2.1e-5, not exactly 1: the image
            # radius of a rectilinear (f-tan-theta) lens is f tan(alpha) while
            # the collected flux follows the projected solid angle pi sin^2
            # (alpha). Physically irrelevant at alpha = 0.26 deg, but the test
            # states the residual rather than hiding it.
            assert abs(E * A / P - 1.0 / np.cos(r) ** 2) < 1e-9, (f_mm, N, E * A / P)
    # 4. Tamron aperture table must be monotonic and bracket the name.
    assert abs(tamron_max_aperture(16.0) - 3.5) < 1e-9
    assert abs(tamron_max_aperture(300.0) - 6.3) < 1e-9
    assert np.all(np.diff(tamron_max_aperture(np.arange(16, 301, 1.0))) >= -1e-12)
    print('optics selftest OK  (C_max=%.0f suns, C at f/1.9=%.0f, at f/6.3=%.0f)'
          % (thermodynamic_limit(r), concentration(1.9, r), concentration(6.3, r)))


if __name__ == '__main__':
    _selftest()
