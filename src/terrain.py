"""Topographic horizon at the observing site.

At 4.6 deg solar elevation the question "is the Sun even above the local
skyline?" is not rhetorical: the site sits in the Serra del Montsant / Priorat
massif and totality happens toward azimuth ~285.7 deg (WNW). This module builds
the real skyline from the Copernicus GLO-30 DEM and compares it with the Sun's
apparent track through the eclipse.

DEM: Copernicus DEM GLO-30 (COG), ESA/Airbus, 1 arcsec (~30 m) posting,
heights referred to EGM2008. Public, no authentication.
Refraction: apparent elevation of a terrain point is depressed by Earth
curvature and raised by terrestrial refraction; both folded into an effective
Earth radius R_eff = R / (1 - k_r) with k_r the coefficient of refraction.
"""
import json
import numpy as np
import rasterio
from rasterio.windows import from_bounds

import siteconf as S
from siteconf import ROOT

R_EARTH_M = 6_371_008.8            # IUGG mean radius
K_REFR = 0.13                      # visible-light terrestrial refraction coeff.
K_REFR_LO, K_REFR_HI = 0.07, 0.20  # sensitivity band

TILES = [
    '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/'
    'Copernicus_DSM_COG_10_N41_00_E000_00_DEM/Copernicus_DSM_COG_10_N41_00_E000_00_DEM.tif',
    '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/'
    'Copernicus_DSM_COG_10_N41_00_W001_00_DEM/Copernicus_DSM_COG_10_N41_00_W001_00_DEM.tif',
]

AZ_MIN, AZ_MAX, AZ_STEP = 265.0, 300.0, 0.25
D_MAX_KM = 100.0


def dest_point(lat0, lon0, az_deg, d_m):
    """Great-circle destination on a sphere. Vectorised over d_m."""
    lat1 = np.radians(lat0); lon1 = np.radians(lon0); th = np.radians(az_deg)
    dr = d_m / R_EARTH_M
    lat2 = np.arcsin(np.sin(lat1) * np.cos(dr) + np.cos(lat1) * np.sin(dr) * np.cos(th))
    lon2 = lon1 + np.arctan2(np.sin(th) * np.sin(dr) * np.cos(lat1),
                             np.cos(dr) - np.sin(lat1) * np.sin(lat2))
    return np.degrees(lat2), np.degrees(lon2)


class Mosaic:
    """Two adjacent 1-degree COG tiles, read once into memory over the needed bbox."""

    def __init__(self, tiles, bounds):
        self.parts = []
        for t in tiles:
            with rasterio.open(t) as ds:
                w, s, e, n = bounds
                w2, s2 = max(w, ds.bounds.left), max(s, ds.bounds.bottom)
                e2, n2 = min(e, ds.bounds.right), min(n, ds.bounds.top)
                if w2 >= e2 or s2 >= n2:
                    continue
                win = from_bounds(w2, s2, e2, n2, ds.transform).round_offsets().round_lengths()
                arr = ds.read(1, window=win)
                tr = ds.window_transform(win)
                self.parts.append((arr, ~tr, ds.nodata))

    def sample(self, lat, lon):
        out = np.full(lat.shape, np.nan)
        for arr, inv, nodata in self.parts:
            col, row = inv * (lon, lat)
            r = np.rint(row).astype(int); c = np.rint(col).astype(int)
            ok = (r >= 0) & (r < arr.shape[0]) & (c >= 0) & (c < arr.shape[1]) & np.isnan(out)
            if ok.any():
                v = arr[r[ok], c[ok]].astype(float)
                if nodata is not None:
                    v[v == nodata] = np.nan
                out[ok] = v
        return out


def apparent_elevation(h_m, h0_m, d_m, k_r=K_REFR):
    """Apparent elevation angle (deg) of a terrain point above the astronomical
    horizontal at the observer, including curvature and refraction."""
    r_eff = R_EARTH_M / (1.0 - k_r)
    return np.degrees(np.arctan2(h_m - h0_m, d_m) - d_m / (2.0 * r_eff))


def main():
    # Sampling grid: fine near the observer, coarser far away.
    d = np.unique(np.concatenate([
        np.arange(30.0, 2000.0, 30.0),
        np.arange(2000.0, 20000.0, 90.0),
        np.arange(20000.0, D_MAX_KM * 1000.0 + 1, 250.0)]))
    az = np.arange(AZ_MIN, AZ_MAX + 1e-9, AZ_STEP)

    LAT, LON = [], []
    for a in az:
        la, lo = dest_point(S.LAT_DEG, S.LON_DEG, a, d)
        LAT.append(la); LON.append(lo)
    LAT = np.array(LAT); LON = np.array(LON)

    pad = 0.02
    bounds = (LON.min() - pad, LAT.min() - pad, LON.max() + pad, LAT.max() + pad)
    mos = Mosaic(TILES, bounds)

    h0_dem = float(mos.sample(np.array([S.LAT_DEG]), np.array([S.LON_DEG]))[0])
    H = mos.sample(LAT, LON)

    prof = {}
    for name, k in (('k013', K_REFR), ('k007', K_REFR_LO), ('k020', K_REFR_HI)):
        el = apparent_elevation(H, h0_dem, d[None, :], k)
        el = np.where(np.isnan(el), -90.0, el)
        j = np.nanargmax(el, axis=1)
        prof[name] = {
            'az_deg': az.tolist(),
            'horizon_alt_deg': el[np.arange(len(az)), j].tolist(),
            'dist_km': (d[j] / 1000.0).tolist(),
            'height_m': H[np.arange(len(az)), j].tolist(),
        }

    doc = {
        'dem': 'Copernicus DEM GLO-30 (ESA/Airbus), 1 arcsec, EGM2008',
        'observer_height_dem_m': h0_dem,
        'observer_height_srtm30m_m': S.ELEV_M,
        'refraction_coefficient': {'nominal': K_REFR, 'low': K_REFR_LO, 'high': K_REFR_HI},
        'max_range_km': D_MAX_KM,
        'profiles': prof,
    }
    with open(ROOT+'/data/horizon.json', 'w') as fh:
        json.dump(doc, fh)

    a = np.array(prof['k013']['az_deg']); e = np.array(prof['k013']['horizon_alt_deg'])
    print(f'DEM height at observer: {h0_dem:.1f} m (SRTM30m says {S.ELEV_M:.0f} m)')
    for target in (277.0, 283.4, 285.6, 285.8, 290.0, 294.1):
        i = int(np.argmin(abs(a - target)))
        print(f'  az {a[i]:7.2f} deg -> horizon {e[i]:+6.3f} deg  '
              f'(ridge {prof["k013"]["height_m"][i]:.0f} m at {prof["k013"]["dist_km"][i]:.1f} km)')
    m = (a >= 275) & (a <= 296)
    print(f'  max horizon in az 275-296 deg: {e[m].max():+.3f} deg at az {a[m][np.argmax(e[m])]:.2f}')


if __name__ == '__main__':
    main()
