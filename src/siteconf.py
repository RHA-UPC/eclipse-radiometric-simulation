"""Site + ephemeris constants. Single source of truth for every other module.

All values here are measured/adopted constants with a citable provenance.
Nothing in this file is estimated by the author.
"""
import os
from skyfield.api import load, load_file, wgs84

# Project root, resolved from this file so the tree is relocatable.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- Observation site -------------------------------------------------------
# User-supplied coordinates: republican observation post of the Battle of the
# Ebro, near La Figuera (Priorat, Tarragona).
LAT_DEG = 41.212878
LON_DEG = 0.709488
# Elevation. Three independent sources for the same point: Copernicus GLO-30
# gives 616.1 m, SRTM 30 m via OpenTopoData 605 m, Open-Elevation 614 m. We adopt
# GLO-30 because it is also the DEM used for the horizon profile, so a single
# number runs through the whole study. The 11 m spread shifts contact times by
# <0.05 s and the air mass by <0.2 %.
ELEV_M = 616.1
ELEV_M_SRTM30 = 605.0
ELEV_M_OPENELEV = 614.0

# --- Physical constants (IAU 2015 Resolution B3 nominal values) -------------
R_SUN_KM = 695_700.0        # IAU 2015 nominal solar radius
R_MOON_KM = 1_737.4         # IAU/IAG mean lunar radius (Archinal et al. 2018)
R_EARTH_KM = 6_378.1366     # IERS 2010 equatorial radius

# Total Solar Irradiance at 1 au, solar-cycle mean.
# Kopp & Lean (2011), GRL 38, L01706: 1360.8 +/- 0.5 W/m^2.
TSI_1AU = 1360.8
TSI_1AU_ERR = 0.5

AU_KM = 149_597_870.700     # IAU 2012 Resolution B2

EPH_PATH = ROOT+'/data/de440s.bsp'


def load_all():
    eph = load_file(EPH_PATH)
    ts = load.timescale()
    earth, sun, moon = eph['earth'], eph['sun'], eph['moon']
    topos = wgs84.latlon(LAT_DEG, LON_DEG, elevation_m=ELEV_M)
    place = earth + topos
    return ts, eph, earth, sun, moon, topos, place
