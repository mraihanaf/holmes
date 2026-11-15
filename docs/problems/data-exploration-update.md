# Data exploration update — after disabling VPN/Cloudflare

**Date:** 2026-11-14, ~15:35 WIB
**Trigger:** The earlier data-access tests were run with a VPN/Cloudflare WARP profile enabled. The user disabled it. This document records what changed and what we explored afterwards.

---

## 1. Access status: what changed

Every host that previously returned **CloudFront 403** now returns **HTTP 200**:

| Host / endpoint | Before (VPN on) | After (VPN off) |
|---|---|---|
| `cmr.earthdata.nasa.gov` | 403 CloudFront | **200** |
| `appeears.earthdatacloud.nasa.gov/api/` | 403 CloudFront | **200** |
| `appeears.earthdatacloud.nasa.gov/api/product` | 403 CloudFront | **200** (193 products) |
| `opendap.earthdata.nasa.gov` | 403 CloudFront | **200** (Hyrax) |
| `www.earthdata.nasa.gov` | 403 CloudFront | **200** |
| `api.giovanni.earthdata.nasa.gov/configured-variables/` | 403 CloudFront | **200** (867 variables) |
| `data.gesdisc.earthdata.nasa.gov` | 403 / untested | **200** |
| `ladsweb.modaps.eosdis.nasa.gov/api/v2/...` | 200 metadata | **200** metadata |
| `power.larc.nasa.gov` | 200 | 200 |
| `climexp.knmi.nl` | timeout/SSL | **200**, but a one-time human-verification gate |
| `www.asc-csa.gc.ca` | timeout | still timeout from this network |

**Conclusion:** the 403s were the VPN/Cloudflare path, not a NASA outage or a Jakarta geoblock. The resources are reachable from this network now.

However, **actual data downloads still require Earthdata/LAADS authentication**:

| Attempt | Result |
|---|---|
| CMR granule metadata for MYD08_M3 | 200; includes direct `data.laadsdaac.earthdatacloud.nasa.gov/...hdf` link |
| That direct HDF link | **302 → `urs.earthdata.nasa.gov/oauth/authorize`** (login required) |
| LAADS OPeNDAP `.hdf.html` | **302 → LAADS OAuth login** |
| LAADS archive `.hdf` | **303 → `/profiles/licenses/...`** |
| GES DISC Cloud MERRA-2 `.nc4` | **302 → Earthdata login** |
| GES DISC Cloud GLDAS `.nc4` | **302 → Earthdata login** |
| Earthdata Cloud OPeNDAP collection | **302 → `/login/urs`** |
| AppEEARS `POST /api/task` (no token) | **403** "You don't have the permission..." |
| AppEEARS `GET /api/task` (no token) | **403** |
| Giovanni `proxy-timeseries` (no login) | **200 HTML = Earthdata Login page** |

**Bottom line:** the network is fixed, but the data-access model did not change. A user account/token is still required for MODIS/MERRA-2/GLDAS/AppEEARS downloads. The app should still use NASA POWER for live data and pre-fetched CSVs for the official MODIS example.

---

### 1.1 No-login data sources (after the VPN fix)

| Source | Data | Access | Speed | Use |
|---|---|---|---|---|
| **NASA POWER** | MERRA-2/CERES monthly point/regional | No login, CORS `*` | 0.4–1.3 s | **Live engine** |
| **ORNL DAAC MODIS REST** | MOD13Q1 NDVI/EVI, MOD11A2 LST, etc. | No login | Slow (~tens of s/request), ~10 tiles/request | **Build-time/cached MODIS values** |
| **MODIS L3 Timeseries** | Zonal-average MODIS AOD/cloud/water-vapor plots | No login (public images) | Fast | Narrative/visual reference |
| CMR / AppEEARS / GES DISC / Giovanni | Metadata and product lists | No login | Fast | Variable catalog, citations |
| AppEEARS tasks / GES DISC files / LAADS files / Giovanni proxy | Actual MODIS/MERRA-2/GLDAS data | **Earthdata/LAADS login** | — | Only if credentials are available |

## 2. New public data we could actually explore

### 2.1 MODIS L3 Timeseries (public, no login)

The NASA MODIS Atmosphere team publishes a public **L3 Timeseries** page:

- Index: https://modis-images.gsfc.nasa.gov/trend_web/Timeseries1.html
- Aerosol Optical Depth: https://modis-images.gsfc.nasa.gov/trend_web/Timeseries4.html

It provides **zonal-average MODIS-Aqua/Terra time series** (not point/region) for cloud optical thickness, cloud effective radius, cloud fraction, aerosol optical depth, Deep Blue AOD, cloud top properties, cloud retrieval fraction, cloud phase, and water vapor.

We downloaded the Aqua AOD zonal plots:

| File | Band | What it shows |
|---|---|---|
| `assets/modis_l3/aod_25N_60N.jpg` | 25°N–60°N (includes Wisconsin) | Seasonal cycle; no clear long-term upward trend; a large 2020 spike; C61 land and ocean series |
| `assets/modis_l3/aod_25S_25N.jpg` | 25°S–25°N | Seasonal cycle; relatively flat |
| `assets/modis_l3/aod_60S_25S.jpg` | 60°S–25°S | Southern-band seasonal cycle |
| `assets/modis_l3/aod_60S_60N.jpg` | 60°S–60°N | Global-band average |

**Use in the demo:** a public, official MODIS visual that shows why zonal averages hide regional trends and why seasonal cycles dominate. It supports the "global average vs local story" narrative. It is **not** the Wisconsin regional time series from the video; for that, use Giovanni or pre-fetch MYD08_M3.

**Important observation:** the 25°N–60°N zonal AOD plot does **not** show a clear upward trend, and the video's orange arrow is illustrative rather than a fitted trend. Our CERES AOD for Wisconsin shows a slight decrease (method-dependent), while the Jakarta AOD shows a strong significant increase. The "same variable, different region" story is real.

### 2.2 NASA POWER multi-parameter trend scan

We downloaded 14 monthly parameters for Jakarta and Wisconsin (2001–2025) and computed, for each:

- monthly climatology removal;
- Sen's slope per decade;
- Mann–Kendall p on monthly anomalies;
- OLS slope and HAC (Newey–West) p;
- annual-mean Mann–Kendall p;
- Benjamini–Hochberg FDR across the 14 parameters.

Files:
- `assets/power_multivar_analysis.py`
- `assets/power_multivar_jakarta.csv`, `assets/power_multivar_wisconsin.csv`
- `assets/power_multivar_trends.csv`
- `assets/power_radar_jakarta.png`, `assets/power_radar_wisconsin.png`
- `assets/power_snr_jakarta.png`, `assets/power_snr_wisconsin.png`

#### Jakarta — 11 of 14 parameters are significant after FDR

| Variable | Meaning / units | Sen / decade | MK p | HAC p | FDR p | Significant? |
|---|---|---|---|---|---|---|
| QV2M | Specific humidity (g/kg) | +0.346 | 4.4e-16 | 2.7e-08 | 1.3e-07 | **YES** |
| GWETROOT | Root-zone soil wetness (1) | +0.055 | 1.3e-15 | 3.7e-04 | 8.7e-04 | **YES** |
| AOD_55 | Aerosol optical depth (dimensionless) | +0.038 | 2.2e-16 | 3.0e-15 | 4.2e-14 | **YES** |
| GWETTOP | Surface soil wetness (1) | +0.035 | 2.4e-15 | 5.8e-04 | 0.001 | **YES** |
| T2M | 2 m temperature (°C) | +0.215 | 3.1e-11 | 0.003 | 0.004 | **YES** |
| T2M_MIN | 2 m minimum temperature (°C) | +0.304 | 1.0e-09 | 7.9e-10 | 5.5e-09 | **YES** |
| CLRSKY_SFC_SW_DWN | Clear-sky shortwave (MJ/m²/day) | −0.156 | 2.3e-09 | 5.3e-06 | 1.9e-05 | **YES** |
| ALLSKY_SFC_SW_DWN | All-sky shortwave (MJ/m²/day) | −0.427 | 5.5e-06 | 0.002 | 0.003 | **YES** |
| WS2M | 2 m wind speed (m/s) | −0.116 | 9.4e-06 | 1.3e-05 | 3.5e-05 | **YES** |
| EVLAND | Land evaporation (mm/day) | +0.123 | 1.5e-04 | 0.004 | 0.005 | **YES** |
| PRECTOTCORR | Precipitation (mm/day) | +0.701 | 3.1e-04 | 0.011 | 0.014 | **YES** |
| EVPTRNS | Evapotranspiration energy flux (MJ/m²/day) | −0.325 | 5.2e-05 | 0.059 | 0.069 | no |
| T2M_MAX | 2 m maximum temperature (°C) | +0.118 | 0.019 | 0.383 | 0.383 | no |
| RH2M | Relative humidity (%) | +0.338 | 0.054 | 0.231 | 0.249 | no |

**Interpretation:** Jakarta is not just warming. It is getting more humid (+0.35 g/kg/decade), wetter (+0.70 mm/day/decade), less windy (−0.12 m/s/decade), and less sunny at the surface (−0.43 MJ/m²/day all-sky; −0.16 clear-sky), with increasing soil wetness and evaporation and a strong AOD increase. The surface dimming and increased humidity/precipitation are physically consistent with a cloudier, wetter urban/regional environment, but this analysis does not establish causation.

#### Wisconsin — 0 of 14 survive FDR

| Variable | Meaning / units | Sen / decade | MK p | HAC p | FDR p | Significant? |
|---|---|---|---|---|---|---|
| QV2M | Specific humidity (g/kg) | +0.173 | 0.004 | 0.008 | 0.116 | no |
| AOD_55 | Aerosol optical depth (dimensionless) | −0.010 | 0.003 | 0.128 | 0.551 | no |
| T2M | 2 m temperature (°C) | +0.258 | 0.091 | 0.393 | 0.794 | no |
| CLRSKY_SFC_SW_DWN | Clear-sky shortwave (MJ/m²/day) | −0.037 | 0.139 | 0.157 | 0.551 | no |
| EVLAND | Land evaporation (mm/day) | +0.042 | 0.078 | 0.296 | 0.794 | no |
| GWETTOP | Surface soil wetness (1) | +0.008 | 0.232 | 0.537 | 0.794 | no |
| GWETROOT | Root-zone soil wetness (1) | +0.007 | 0.247 | 0.491 | 0.794 | no |
| RH2M | Relative humidity (%) | +0.383 | 0.375 | 0.684 | 0.794 | no |
| WS2M | 2 m wind speed (m/s) | −0.019 | 0.401 | 0.625 | 0.794 | no |
| PRECTOTCORR | Precipitation (mm/day) | +0.083 | 0.364 | 0.627 | 0.794 | no |
| ALLSKY_SFC_SW_DWN | All-sky shortwave (MJ/m²/day) | −0.070 | 0.485 | 0.524 | 0.794 | no |
| T2M_MIN | 2 m minimum temperature (°C) | +0.170 | 0.509 | 0.738 | 0.794 | no |
| EVPTRNS | Evapotranspiration energy flux (MJ/m²/day) | +0.012 | 0.078 | 0.141 | 0.551 | no |
| T2M_MAX | 2 m maximum temperature (°C) | −0.032 | 0.874 | 0.801 | 0.801 | no |

**Interpretation:** Wisconsin is the honesty case. Several variables have visually interesting slopes (T2M +0.26 °C/decade, QV2M +0.17 g/kg/decade), but after accounting for autocorrelation and testing 14 variables, none is statistically significant. The AOD result is method-dependent: MK p = 0.003, HAC p = 0.128, FDR p = 0.551. That is exactly the kind of nuance a good trend tool should show.

**Caveat:** the 14 variables are physically correlated; BH FDR treats them as separate tests and is conservative. The "11 of 14 significant" headline is exploratory, not a causal claim.

### 2.3 Jakarta 5×5 grid — where is it changing?

We sampled a 5×5 grid around Jakarta (lat −6.8 to −6.0, lon 106.4 to 107.2, 0.2° spacing) and computed the same Sen + MK trend for AOD_55, T2M, and PRECTOTCORR.

Files:
- `assets/jakarta_grid_trends.py`
- `assets/jakarta_grid/jakarta_grid_trends.csv`
- `assets/jakarta_grid/jakarta_grid_maps.png`
- `assets/jakarta_grid/jakarta_grid_significance_count.png`

**Findings:**

- **All 25 points** show a significant (MK p < 0.05) trend in all three variables. The "number of significant variables" map is uniformly 3/3.
- **T2M** Sen slope ranges roughly **+0.18 to +0.25 °C/decade**.
- **Precipitation** ranges roughly **+0.45 to +1.33 mm/day/decade**, with the strongest increases in the west/southwest of the sampled box.
- **AOD_55** is nearly constant across the grid (mostly +0.0378/decade; a southern row +0.0074/decade) because the native MERRA-2/CERES grid is ~0.5° × 0.625° and our 0.2° sampling falls inside the same cells. This is a good example of why the app must show the native resolution.

**Use in the demo:** a "where is it changing?" map. It shows that even a small region can have spatial structure in precipitation and temperature, while a coarse atmospheric product like AOD is blocky. It also shows that "significant everywhere" can be a valid result for a rapidly changing city.

### 2.4 Seasonal fingerprints — which months are changing?

We computed per-calendar-month Sen slopes and Mann–Kendall tests for Jakarta T2M, PRECTOTCORR, and AOD_55, with BH FDR across 12 months per variable.

File: `assets/seasonal_jakarta_trends.csv`, `assets/seasonal_jakarta_trends.png`

**Findings (Jakarta):**

- **T2M:** March and May–August are significant after FDR; June/July are the fastest-warming months (~+0.28 to +0.29 °C/decade). September–February are not significant. This is a seasonal fingerprint: the mid-year months warm faster.
- **AOD_55:** February–August are significant; June is the fastest (~+0.079/decade). September–October show no trend; December is marginal. The annual AOD increase is concentrated in the first eight months, not in the autumn peak season.
- **PRECTOTCORR:** no individual calendar month is significant after FDR, even though the annual total is significant. The annual trend is a broad increase across months, not a single-season change.

**Findings (Wisconsin):** 0 of 36 month-parameter tests are significant after FDR. The monthly T2M slopes are large and noisy (April about −0.5 °C/decade; August–October about +0.8 °C/decade) but not significant; AOD is negative in most months but not significant; precipitation is mixed. This is a useful teaching contrast: big-looking monthly slopes can be noise, and an annual mean can hide offsetting months.

Files: `assets/seasonal_jakarta_trends.csv/.png`, `assets/seasonal_wisconsin_trends.csv/.png`.

**Use in the demo:** "The annual average hides the story. Jakarta's aerosol increase is a February–August story; September–October show no trend." This is a strong "Season Sleuth" signature view and a natural follow-up to the annual verdict.

---

## 2.5 Metadata exploration (now reachable)

Even when the data files are login-walled, the metadata is useful for the app's variable catalog and citations.

### CMR — MODIS collections

CMR collection search is now fully accessible. Verified key products:

| Product | Entry ID | Provider | Temporal coverage | Grid / resolution | Notes |
|---|---|---|---|---|---|
| **MYD08_M3** (MODIS-Aqua atmosphere monthly) | MYD08_M3_6.1 | LAADS | 2002-07-01–present | 1° global CMG | The video's product family. ~739 parameters, HDF-EOS, ~349 KB per monthly granule. |
| **MOD08_M3** (MODIS-Terra atmosphere monthly) | MOD08_M3_6.1 | LAADS | 2000-02-01–present | 1° global CMG | Terra predecessor. |
| GPM_3IMERGM | GPM_3IMERGM_07 | GES_DISC | 1998-01-01–2025-09-30 (operational continues) | 0.1° global | Monthly IMERG precipitation. |
| GLDAS_NOAH025_M | GLDAS_NOAH025_M_2.1 | GES_DISC | 2000-01-01–present | 0.25° | Monthly land surface model. |
| M2TMNXSLV | M2TMNXSLV_5.12.4 | GES_DISC | 1980-01-01–present | 0.5° × 0.625° | MERRA-2 monthly single-level diagnostics. |
| M2TMNXAER | M2TMNXAER_5.12.4 | GES_DISC | 1980-01-01–present | 0.5° × 0.625° | MERRA-2 monthly aerosol diagnostics. |
| OMAERUVd | OMAERUVd_003 | GES_DISC | 2004-10-01–present | 1° | OMI UV aerosol product; includes AOD at 354/388/500 nm. |
| MOD13A3 | MOD13A3_061 | LPCLOUD | 2000-02-01–present | 1 km monthly | MODIS NDVI/EVI; available in AppEEARS. |

**Granule access:** CMR returns a direct `data.laadsdaac.earthdatacloud.nasa.gov/...hdf` link for MYD08_M3, but it responds **302 → Earthdata Login**. The LAADS OPeNDAP and archive links also redirect to login. Metadata yes; files no.

### AppEEARS — 193 products

`GET /api/product` returns 193 products. Relevant verified products:

| Product | Description | Temporal | Resolution | Coverage |
|---|---|---|---|---|
| MOD13A3.061 | Vegetation Indices (NDVI & EVI) | Monthly | 1 km | 2000-02-01–present |
| MOD13Q1.061 | Vegetation Indices (NDVI & EVI) | 16 day | 250 m | 2000-02-18–present |
| MOD11A1.061 | Land Surface Temperature & Emissivity | Daily | 1 km | 2000-02-24–present |
| MOD11A2.061 | Land Surface Temperature & Emissivity | 8 day | 1 km | 2000-02-18–present |
| SPL4SMGP.008 | Surface and Root Zone Soil Moisture | Daily | 9 km | 2015-03-31–present |
| MCD43A4.061 | BRDF-corrected reflectance | Daily | 500 m | 2000–present |

**Task API:** `POST /api/task` and `GET /api/task` return **403** without a bearer token. The login flow is `POST /api/login` with Earthdata credentials; token lasts ~48 h. Build-time only.

### Giovanni — 867 configured variables

`https://api.giovanni.earthdata.nasa.gov/configured-variables/` returns **867 variables**. Aerosol-related entries include OMI `OMAERUVd_003_FinalAerosolOpticalDepth354/388/500` and `OMAERUVd_003_UVAerosolIndex`. The `proxy-timeseries` endpoint returns an **Earthdata Login HTML page** without credentials. The Giovanni UI offers "Continue with limited access," but full data/services require login.

### ORNL DAAC MODIS/VIIRS Web Service

A potentially useful no-login data source discovered during the prior-art research:

- `https://modis.ornl.gov/rst/api/v1/{product}/dates?latitude=...&longitude=...` returns available MODIS composite dates (HTTP 200, no login).
- `https://modis.ornl.gov/rst/api/v1/{product}/subset?...` returns actual pixel values. It enforces a **maximum of ~10 subset tiles per request** (so query in chunks), and was slow/timed out during our test.
- Products include MOD13Q1 NDVI/EVI, MOD11A2 LST, etc.

**Status:** **subset endpoint verified!** A request for Jakarta (lat −6.2, lon 106.85), MOD13Q1, 2024-01-01, band `250m_16_days_NDVI`, returned:

```
tile h28v09
data [2233]  × scale 0.0001  = NDVI 0.2233
```

This is a **real MODIS data value without Earthdata login** — the first no-login MODIS data path we found. A follow-up request for Jan–Apr 2024 returned eight composites:

| Date | NDVI |
|---|---|
| 2024-01-01 | 0.2233 |
| 2024-01-17 | 0.1017 |
| 2024-02-02 | 0.1766 |
| 2024-02-18 | 0.1810 |
| 2024-03-05 | 0.2802 |
| 2024-03-21 | 0.0778 |
| 2024-04-06 | 0.2561 |
| 2024-04-22 | 0.2894 |

Saved: `assets/ornl_modis/MOD13Q1_jakarta_2024_jan_apr.json` and `.png`.

Caveats:

- The values are noisy (clouds/quality flags); a real analysis must filter MOD13Q1 QA layers.
- The API limits a subset request to about **10 tiles/dates**. A full 25-year monthly/16-day series would need many requests.
- Each request was slow (tens of seconds), so it is **build-time/cached**, not live-demo, material.
- A practical use: pre-fetch one MODIS NDVI or LST composite per year for a handful of places, bundle the CSV, and cite ORNL DAAC. This gives the app a genuine MODIS vegetation/LST variable without a login wall.
- The `dates` endpoint is fast and useful for checking availability: `https://modis.ornl.gov/rst/api/v1/MOD13Q1/dates?latitude=...&longitude=...`.

## 3. What this changes for the product

1. **The network is no longer the blocker; authentication is.** Even with the VPN off, MODIS/MERRA-2/GLDAS/AppEEARS downloads redirect to Earthdata login. Do not design a live demo around them unless the team has credentials and pre-tests the flow.
2. **NASA POWER remains the live engine.** It works before and after the VPN change, needs no login, and supports 14+ parameters at any point.
3. **The multi-parameter scan is a strong differentiator.** Jakarta's 11/14 significant variables vs Wisconsin's 0/14 is a memorable "what is changing here?" demo. Use it as the Trend Radar screen.
4. **The seasonal fingerprint is a strong signature view.** It is cheap (POWER monthly data), scientifically honest, and visually surprising.
5. **The 5×5 grid shows spatial structure but also resolution limits.** Use it to teach "a grid cell is not a station" and to show where precipitation changes are strongest.
6. **MODIS L3 zonal plots are public and useful for narrative.** They show why zonal averages hide regional trends and why the video's example is not a global story.

---

## 4. Recommended demo cases after this update

| Case | Data | Why |
|---|---|---|
| **Jakarta annual scan** | NASA POWER 14 parameters, 2001–2025 | 11/14 significant; local, strong, surprising |
| **Jakarta seasonal fingerprint** | POWER monthly, per-month Sen/MK | "The annual average hides the story" |
| **Jakarta grid map** | POWER 5×5 point sample | "Where is it changing?"; shows spatial structure and resolution |
| **Wisconsin honesty case** | POWER AOD/T2M/precip | AOD method-dependent; no variable survives FDR; teaches caution |
| **Official MODIS L3 zonal AOD** | Public MODIS L3 Timeseries | Shows zonal average vs regional story; official MODIS visual |
| **Official Wisconsin AOD** | Giovanni/MYD08_M3 if credentials available | Reproduces the video; otherwise use the public zonal plot and label it |

---

## 5. Files added

| File | What |
|---|---|
| `assets/power_multivar_analysis.py` | Multi-parameter download + stats + radar/SNR plots |
| `assets/power_multivar_jakarta.csv` | Raw POWER monthly data, 14 parameters, 2001–2025 |
| `assets/power_multivar_wisconsin.csv` | Same for Wisconsin |
| `assets/power_multivar_trends.csv` | Full trend table (28 site-parameter rows) |
| `assets/power_radar_jakarta.png`, `power_radar_wisconsin.png` | Raw Sen slope bars |
| `assets/power_snr_jakarta.png`, `power_snr_wisconsin.png` | Normalized signal-to-noise bars |
| `assets/jakarta_grid_trends.py` | 5×5 grid sampler + maps |
| `assets/jakarta_grid/` | 25 raw CSVs, trend CSV, maps |
| `assets/seasonal_jakarta_trends.csv`, `.png` | Per-month trends, Jakarta |
| `assets/seasonal_wisconsin_trends.csv`, `.png` | Per-month trends, Wisconsin (0/36 significant) |
| `assets/modis_l3/` | Public MODIS L3 zonal AOD plots |

---

## 6. Honest limitations

- The multi-parameter FDR treats correlated variables as independent tests; it is conservative and exploratory.
- The 5×5 grid is only 25 points and uses the POWER point API, which returns a native grid-cell value, not a true 0.2° field. The AOD map is visibly blocky for this reason.
- The seasonal per-month tests use 25 annual values per month; power is limited. "Not significant" for a month does not mean "no change."
- The MODIS L3 plots are zonal averages, not regional time series. They do not reproduce the video's Wisconsin AOD plot.
- The actual MODIS/MERRA-2/GLDAS data still require Earthdata login; no credentials were used.
- The VPN/Cloudflare explanation is based on the observed change before/after the user disabled it; other network paths may behave differently.
