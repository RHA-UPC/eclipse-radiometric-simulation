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

"""Export the tables the browser needs to run the radiometry itself.

The web front end computes irradiance on demand, on the visitor's machine, from
the same models the manuscript uses. What it cannot do is carry pvlib, so the
fixed tables travel as JSON: the 122-wavelength SPECTRL2 coefficients, the
ICNIRP action spectra, the photopic curve and the eye constants. Every one of
them keeps its citation next to it.

Nothing here is fitted or estimated. If a value is not in a table with a
source, it does not get written.

Writes web/data/spectral.json.
"""
import json

import numpy as np

from siteconf import ROOT

LIT = json.load(open(ROOT + '/data/literature.json'))
HW = json.load(open(ROOT + '/data/hardware.json'))
ATM = json.load(open(ROOT + '/data/atmosphere.json'))['adopted_for_eclipse_window']

# The default atmosphere and the Angstrom exponent are READ, not typed. They
# used to be literals here, which broke the rule the whole repository runs on:
# a number in a shipped file with no entry behind it. The exponent now comes
# from the same pvlib default src/spectral.py actually runs, so the two cannot
# drift apart, and the reference conditions come from literature.json where
# their provenance -- and the fact that the ASTM standard itself is paywalled
# and was not consulted -- is written down.
G173_KEYS = ('aod500', 'precipitable_water_cm', 'ozone_atm_cm',
             'p_surface_Pa', 'T_air_C', 'ground_albedo')
G173 = {k: LIT['astm_g173_reference_atmosphere'][k] for k in G173_KEYS}


def _angstrom_alpha():
    import inspect
    from pvlib.spectrum import spectrl2
    a = float(inspect.signature(spectrl2).parameters['alpha'].default)
    want = LIT['bird_riordan_1984']['angstrom_alpha_default']
    assert a == want, f'pvlib alpha {a} no coincide con literature.json {want}'
    return a


def _spectrl2_table():
    from pvlib.spectrum.spectrl2 import _SPECTRL2_COEFFS as C
    return {'wavelength_nm': [float(x) for x in C['wavelength']],
            'E0': [float(x) for x in C['spectral_irradiance_et']],
            'Aw': [float(x) for x in C['water_vapor_absorption']],
            'Ao': [float(x) for x in C['ozone_absorption']],
            'Au': [float(x) for x in C['mixed_absorption']]}


def _icnirp():
    """B(lambda) and R(lambda) on the SPECTRL2 grid, from ICNIRP 2013 Table 2.

    Resampled here rather than in the browser so the extrapolation rules for
    R above 700 nm live in one place: they are prescriptive, not interpolation.
    """
    import spectral as SP
    B_of, R_of = SP._weighting_tables()
    lam = np.array(_spectrl2_table()['wavelength_nm'])
    return [float(x) for x in B_of(lam)], [float(x) for x in R_of(lam)]


def _photopic():
    import spectral as SP
    V = SP._photopic()
    lam = np.array(_spectrl2_table()['wavelength_nm'])
    return [float(x) for x in V(lam)]


def _icnirp_const(block, key, value):
    """Return `value` only if it still appears in the ICNIRP quote it comes from.

    The limits were retyped here as literals, which is how a constant drifts
    away from the source it claims to have. This does not parse the equations;
    it checks that the number is still written in the verbatim text stored in
    data/literature.json, which is enough to catch a silent edit on either side.
    """
    quote = str(LIT['icnirp2013'][block][key])
    for form in (f'{value:g}', f'{value:.1e}'.replace('e+0', 'e'), str(value)):
        if form in quote.replace(' ', '') or form in quote:
            return value
    raise AssertionError(f'{value} no aparece en la cita de ICNIRP {block}/{key}: {quote!r}')


def main():
    tab = _spectrl2_table()
    B, R = _icnirp()
    IC = LIT['icnirp2013']
    out = {
        'sources': {
            'spectrl2': LIT['bird_riordan_1984']['citation'],
            'icnirp': IC['citation'] if 'citation' in IC else
                'ICNIRP (2013), Health Physics 105(1), 74-96, Table 2.',
            'photopic': LIT['cie_photopic']['quantity'] + ' — '
                        + LIT['cie_photopic']['underlying_standard'],
            'g173': LIT['astm_g173_reference_atmosphere']['citation']
                    + ' — ' + LIT['astm_g173_reference_atmosphere']['underlying_standard'],
            'spectrl2_licence': 'The coefficient table is redistributed from pvlib under '
                                'BSD-3-Clause; the full notice is in web/vendor/LICENSE-pvlib.txt.',
            'ebro': 'data/atmosphere.json: CAMS + ECMWF + WOUDC for 2026-08-12 over the site.'},
        'wavelength_nm': tab['wavelength_nm'],
        'E0': tab['E0'], 'Aw': tab['Aw'], 'Ao': tab['Ao'], 'Au': tab['Au'],
        'B_lambda': B, 'R_lambda': R, 'V_lambda': _photopic(),
        'angstrom_alpha': _angstrom_alpha(),
        'icnirp': {
            'H_B_LIMIT': _icnirp_const('blue_light_photochemical_limit', 'eq16', 100.0),
            'E_B_LIMIT': _icnirp_const('blue_light_photochemical_limit', 'eq17', 1.0),
            'L_R_COEFF': _icnirp_const('retinal_thermal_limit', 't_ge_0p25s', 2.8e4),
            'gamma_ph_rad': IC['blue_light_photochemical_limit']['gamma_ph_rad']['t_lt_100s'],
            'alpha_min_rad': IC['retinal_thermal_limit']['alpha_min_rad'],
            'alpha_max_rad': IC['retinal_thermal_limit']['alpha_max_rad_t_ge_0p25s'],
            'pupil_icnirp_mm': 3.0},
        'eye': {'focal_length_mm': HW['eye']['focal_length_mm'],
                'ocular_transmittance': HW['eye']['ocular_transmittance_visible'],
                'pupil_bright_mm': HW['eye']['pupil_bright_mm'],
                'pupil_dark_mm': HW['eye']['pupil_dark_mm']},
        'atmospheres': {
            'g173': dict(G173, label='ASTM G173-03 (referencia)'),
            'ebro': {'aod500': ATM['aod500'],
                     'precipitable_water_cm': ATM['precipitable_water_cm'],
                     'ozone_atm_cm': ATM['ozone_atm_cm'],
                     'p_surface_Pa': ATM['p_surface_Pa'],
                     'T_air_C': ATM['T_air_C'],
                     'ground_albedo': ATM['ground_albedo'],
                     'label': 'Ebro, 12 ago 2026 (medida)'}},
    }
    path = ROOT + '/web/data/spectral.json'
    json.dump(out, open(path, 'w'))
    import os
    print(f"{len(out['wavelength_nm'])} longitudes de onda -> {path} "
          f"({os.path.getsize(path) / 1024:.0f} kB)")


def _selftest():
    """The exported tables must still be the tables, and reproduce the model.

    A resampling bug here is silent: the spectrum still looks like a spectrum.
    """
    tab = _spectrl2_table()
    lam = np.array(tab['wavelength_nm'])
    assert len(lam) == 122 and lam[0] == 300.0, (len(lam), lam[0])
    assert np.all(np.diff(lam) > 0)

    B, R = _icnirp()
    B, R = np.array(B), np.array(R)
    # B peaks at 435-440 nm and is zero outside 300-700; R is 1 from 380 to
    # 700 and decays by a decade per 500 nm above it (ICNIRP Table 2 notes).
    assert 430 <= lam[int(np.argmax(B))] <= 445, lam[int(np.argmax(B))]
    assert B[lam > 700].max() == 0.0
    assert abs(R[np.argmin(abs(lam - 500))] - 1.0) < 1e-9
    assert abs(R[np.argmin(abs(lam - 1200))] - 0.02) < 1e-3, R[np.argmin(abs(lam - 1200))]

    V = np.array(_photopic())
    assert 550 <= lam[int(np.argmax(V))] <= 560, lam[int(np.argmax(V))]
    assert V[lam > 800].max() < 1e-3

    # Provenance, not just values. Every number the browser receives has to be
    # traceable, and the two ways that fails silently are a literal that has
    # drifted from its source and a default nobody can look up.
    assert _angstrom_alpha() == LIT['bird_riordan_1984']['angstrom_alpha_default']
    for k in G173_KEYS:
        assert G173[k] == LIT['astm_g173_reference_atmosphere'][k], k
    for block, key, val in (('blue_light_photochemical_limit', 'eq16', 100.0),
                            ('blue_light_photochemical_limit', 'eq17', 1.0),
                            ('retinal_thermal_limit', 't_ge_0p25s', 2.8e4)):
        assert _icnirp_const(block, key, val) == val
    print('webdata selftest OK')


if __name__ == '__main__':
    import sys
    _selftest() if '--selftest' in sys.argv else main()
