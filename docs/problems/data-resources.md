# Data resources — deep dive

**Challenge:** "Be an Earth System Trend Detective!" (NASA Space Apps 2026)
**Test date:** 2026-11-14 · **Network:** Jakarta, Indonesia · **No Earthdata account, no NOAA token used**

> **Update 2026-11-14 15:35 WIB:** the earlier CloudFront 403 responses were caused by a VPN/Cloudflare WARP profile. With the VPN disabled, CMR, AppEEARS, Earthdata Cloud, `earthdata.nasa.gov`, and the Giovanni API all return **HTTP 200**. Actual MODIS/MERRA-2/GLDAS/AppEEARS **data downloads still redirect to Earthdata Login and require an account/token**. See `data-exploration-update.md` for the new evidence and the multi-parameter/seasonal/grid exploration.
>
> **Update 2026-11-14 18:30 WIB:** added the Meteomatics Weather API (§9) with a working fetch script and bundled ERA5/CHIRPS/CAMS series. Meteomatics is an official **2026 NASA Space Apps Global Offer** (1,000 queries/day). It is not a NASA resource from the challenge Resources tab, so it does not by itself satisfy the global-award requirement.

This document maps every resource on the challenge Resources tab, plus the datasets named in the challenge text. It records what each one provides, how to access it, whether login is required, and how useful it is for a 48-hour build. Hands-on evidence is in `data-exploration.md`, `assets/probe_results.json`, and `assets/probe_log.txt`.

---

## 1. Executive summary

**The most reliable live no-login data path is the NASA POWER monthly API.** A second no-login path, **ORNL DAAC MODIS REST**, returns actual MODIS NDVI/LST values but is slow and limited to ~10 dates per request; see §8.7.

- `https://power.larc.nasa.gov/api/temporal/monthly/point` — point time series
- `https://power.larc.nasa.gov/api/temporal/monthly/regional` — box average
- Returns CSV/JSON in **0.4–1.3 s**; CORS `Access-Control-Allow-Origin: *`; no key/token.
- Parameters include `AOD_55` (CERES SYN1deg aerosol optical depth at 550 nm), `T2M` (MERRA-2 2 m temperature), `PRECTOTCORR` (MERRA-2 corrected precipitation), and many more.
- AOD starts in **2001**; temperature/precipitation go back to **1981/2000** depending on the parameter.

**The official resource portals are excellent build-time sources and citations, but most are not live-demo safe:**

- **Giovanni** (the tool in the challenge video) is reachable without login but takes **40–112 s per request** and uses an asynchronous workflow. Use it to export CSVs before the event; do not scrape it live.
- **GES DISC** file downloads require **Earthdata Login**. The old on-prem OPeNDAP service is **retired (HTTP 410)**.
- **AppEEARS**, **CMR**, **Earthdata Cloud OPeNDAP**, and **earthdata.nasa.gov** returned **CloudFront 403** from this Jakarta network (geo/WAF block, not an auth error).
- **NOAA Climate Data Online API** requires a free **token** (HTTP 400 without it). Signup page works.
- **LAADS DAAC** metadata is public, but MODIS downloads require a **LAADS token**; at test time the site said token generation was unavailable.

**An official Space Apps Global Offer is available: Meteomatics.** Meteomatics is one of the **2026 NASA Space Apps Global Offers**: free API access at **1,000 queries/day** for the duration of the hackathon. The account (credentials in `.env`) exposes ERA5 reanalysis from **1940 to present** (hourly, downscaled to ~90 m), CHIRPS v3 rainfall from **1981**, CAMS air quality from **2015**, forecasts, and climate scenarios. It is fast (1 year × 2 parameters in 0.8 s; 46 years × 8 parameters × 2 sites in 49 s). It is an official partner offer, but it is **not a NASA resource from the challenge Resources tab**, so it does not by itself satisfy the global-award rule; keep a NASA resource in the project and use Meteomatics as an independent cross-check / optional second reanalysis path. See §9.

**Recommended data architecture:** bundled CSV for the demo + live NASA POWER refresh, with Meteomatics as an optional second reanalysis path. Treat Giovanni/AppEEARS/GES DISC/NOAA as build-time tools and citations, not live dependencies.

---

## 2. Official Resources tab — resource by resource

### 2.1 NASA data & resources

#### Giovanni — https://giovanni.gsfc.nasa.gov/

- **What it is:** NASA GES DISC's web-based data exploration and visualization system ("The Bridge Between Data and Science"), version 4.40.
- **What it provides:** menus of hundreds of variables from NASA missions and models; map-based region selection (box, shape, country, watershed); plot types include time series, area-averaged time series, time-series differences, Hovmöller, correlation maps, and scatter plots.
- **Time series:** the "Area-Averaged Time Series" plot can add a best-fit trend line. Data can be downloaded as **CSV**; plots as PNG; most plot data as netCDF.
- **Auth:** the web UI and legacy workflow endpoint are reachable without Earthdata Login. Some data/products may still require it.
- **Performance (tested):** homepage 40–51 s; config endpoint 66 s; `service_manager.pl?service=ArAvTs` 112 s. A full time-series request did not return data within 150 s. It is an asynchronous job system.
- **Hackathon verdict:** **build-time only.** Use it to generate the official Wisconsin AOD example and export CSV. Do not depend on it during the demo.
- **UX lesson:** Giovanni is the strongest precedent for map-first region selection + one-click CSV. Its weakness is that it expects the user to know which dataset/variable to choose — exactly the problem the challenge names.

#### Hydrology Time Series — https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series

- **What it is:** a GES DISC tool for generating time series with hydrological data.
- **Access:** GES DISC Angular app; data access generally requires **Earthdata Login**. The page itself is a JS shell and returns little server-rendered text.
- **What it is good for:** streamflow/runoff/water-cycle variables if the team wants a hydrology case.
- **Hackathon verdict:** not a live path. Use only if a teammate already has Earthdata credentials and wants a hydrology case.

#### AppEEARS — https://appeears.earthdatacloud.nasa.gov/

- **What it is:** NASA's Application for Extracting and Exploring Analysis Ready Samples. Simple, efficient access to geospatial data from federal archives; includes time-series generation and area sampling.
- **Access:** **Earthdata Login** (HTTP Basic → bearer token). API workflow: `POST /api/login`, `POST /api/task`, poll `GET /api/task/{id}`, download `GET /api/bundle/{id}`.
- **Tested:** every URL (web UI and `/api/product`, `/api/login`) returned **CloudFront 403** from the Jakarta network. The host is blocked before auth.
- **Hackathon verdict:** **build-time only**, and only on a network where the host is reachable. Do not make it a live dependency.

#### NOAA Climate Data Online (CDO) — https://www.ncei.noaa.gov/cdo-web/

- **What it is:** free access to NCDC's archive of global historical weather and climate data, plus station history and a mapping tool.
- **API:** `https://www.ncei.noaa.gov/cdo-web/api/v2/`; token in the `token:` header. Without a token: HTTP 400 `{"message":"Token parameter is required."}`.
- **Signup:** https://www.ncdc.noaa.gov/cdo-web/token (email; token emailed). The signup page is reachable.
- **Limits (from NCEI docs):** 5 requests/second, 10,000 requests/day.
- **Hackathon verdict:** good fallback for **station** temperature/precipitation, but adds an email round trip and token management. Not needed for the AOD story.

#### SeaWiFS chlorophyll time-series article — NTRS PDF

- **What it is:** "Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions" — a research article demonstrating time-series creation and significance testing.
- **Access:** `https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf`. Direct request returned **403** from this network; the citation is still a valid methods reference.
- **Use:** cite it for ocean-color/chlorophyll trend methods; it is a good example of a regional time series with significance testing.

### 2.2 Space Agency Partner resources

#### KNMI Climate Explorer — https://climexp.knmi.nl/

- **What it is:** a web-based scientific analysis tool from the Royal Netherlands Meteorological Institute; >10 TB of climate data; station, precipitation, pressure, wind, reanalysis (ERA5 etc.), CMIP.
- **What it provides:** time series, anomaly calculations relative to a reference period, trend analysis with significance testing, maps and downloads.
- **Auth:** much of the site is usable without login; citation requested.
- **UX model:** dataset category → variable → area (map/coordinates) → period → analysis → figure/download. Expert-oriented and dense.
- **Hackathon verdict:** strong **UX precedent** and a possible manual cross-check; not a live API.

#### Statistical test methods to detect trends in time series data (Medium)

- **What it is:** an overview article on trend tests.
- **Use:** background reading for the team; not a data source; cite if used.

#### A Comprehensive Guide to Statistical Significance (Statsig)

- **What it is:** a guide to significance testing and interpretation.
- **Use:** background reading; good for the "statistical significance ≠ importance" explanation.

#### CSA — RADARSAT Constellation Mission (RCM) data — https://donnees-data.asc-csa.gc.ca/en/dataset/rcm

- **What it is:** Canada's trio of Earth-observation SAR satellites; maritime surveillance, disaster management, ecosystem monitoring (agriculture, wetlands, forestry, coastal change).
- **Access:** open data portal works (HTTP 200).
- **Hackathon verdict:** specialized SAR data; not a good first variable for a trend app unless the team has SAR experience.

#### Geo.ca — http://geo.ca/

- **What it is:** Canada's open geospatial information source.
- **Access:** works (HTTP 200).
- **Hackathon verdict:** a reference/context source, not a core trend dataset.

#### CSA — SWOT mission information — https://www.asc-csa.gc.ca/eng/satellites/swot/

- **What it is:** SWOT (Surface Water and Ocean Topography), led by NASA and CNES with CSA and UK Space Agency; surveys 90% of Earth's surface water, measuring changes in water surface elevation for lakes, rivers, reservoirs, and oceans over time.
- **Hackathon verdict:** a great **water** story, but the data products are specialized; use only if the team has a water scientist.

#### CSA — Monitoring and protecting our ecosystem from space

- **What it is:** an article on satellite data for monitoring changes and responsible land/natural-resource use.
- **Use:** background/context for land-cover and ecosystem cases.

#### CSA — Synthetic Aperture Radar Python tutorial — https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial

- **What it is:** a practical Python + QGIS tutorial for accessing and visualizing SAR imagery.
- **Access:** GitHub repo works (HTTP 200).
- **Hackathon verdict:** useful if the team wants a SAR angle; not a core data path for a 48-hour trend app.

---

## 3. Datasets named in the challenge text

| Dataset | Type | What it provides | Access / auth | Trend use | Hackathon fit |
|---|---|---|---|---|---|
| **MODIS** (Terra/Aqua) | Satellite imager | AOD, land surface temperature, NDVI/EVI, snow cover, cloud properties; daily/8-day/monthly; 2000–present | LAADS DAAC / AppEEARS / Giovanni; downloads need Earthdata/LAADS token | Strong for aerosol, vegetation, land-surface trends | **High** if pre-fetched; the official video uses MODIS-Aqua AOD |
| **OMI** (Aura) | Satellite spectrometer | Ozone, NO2, SO2, aerosol index, UV radiation | GES DISC; Earthdata Login | Atmospheric composition trends | Medium; specialized |
| **AIRS** (Aqua) | Satellite sounder | Temperature/humidity profiles, surface temperature, cloud properties, trace gases | GES DISC; Earthdata Login | Atmospheric temperature/humidity trends | Medium |
| **GPM** (Global Precipitation Measurement) | Satellite precipitation | Global precipitation, rain/snow, extremes; IMERG monthly | GPM/STORM / GES DISC; some products open, many need Earthdata | Precipitation trends | **High** for a water case, but check access |
| **MERRA-2** | Reanalysis model | Long, consistent global record of atmosphere, land, ocean, aerosol; 1980–present | GES DISC (Earthdata Login); **NASA POWER exposes monthly MERRA-2 without login** | Multi-decade trends | **Very high** via POWER |
| **GLDAS** | Land model/assimilation | Soil moisture, evapotranspiration, runoff, snow, groundwater, land surface temperature | GES DISC; Earthdata Login | Water/land trends | Medium; build-time only |

**Important distinction:** the challenge video uses **MODIS-Aqua MYD08_M3 monthly AOD** over Wisconsin. NASA POWER's `AOD_55` is **CERES SYN1deg**, not MODIS. Both are legitimate NASA aerosol products, but they can show different trends. Label the dataset correctly.

---

## 4. NASA POWER — the working path in detail

### 4.1 Endpoint and parameters

```
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=AOD_55,T2M,PRECTOTCORR
  &community=AG
  &longitude=106.85
  &latitude=-6.2
  &start=2000
  &end=2025
  &format=CSV
```

- `parameters`: comma-separated; up to 20 per point request.
- `community=AG` (agroclimatology); other communities may expose different parameter sets.
- `format=CSV` or `JSON`.
- Regional endpoint: `/api/temporal/monthly/regional?parameters=T2M&community=AG&latitude-min=...&latitude-max=...&longitude-min=...&longitude-max=...&start=...&end=...&format=CSV` — **one parameter per request**.

### 4.2 Response format and gotchas

```
-BEGIN HEADER-
...
Parameter(s):
AOD_55          CERES SYN1deg Aerosol Optical Depth 55 (dimensionless)
PRECTOTCORR     MERRA-2 Precipitation Corrected (mm/day)
T2M             MERRA-2 Temperature at 2 Meters (C)
-END HEADER-
PARAMETER,YEAR,JAN,FEB,...,DEC,ANN
AOD_55,2001,0.07,0.15,...,0.09,0.23
```

- `ANN` is a 13th column (annual mean). Drop it before melting, or you will duplicate months.
- Missing values are **`-999`**, not NaN.
- `AOD_55` starts in **2001**; 2000 is all `-999`.
- `T2M`/`PRECTOTCORR` are complete for 2000–2025 in our tests.
- A point is a MERRA-2 grid cell (0.5° × 0.625°), not an exact station.
- CORS: `Access-Control-Allow-Origin: *` on simple GET. Do not add custom headers; OPTIONS preflight returns 404.
- Undocumented rate limit; HTTP 429 exists. Our ~10 requests were fine.

### 4.3 Verified performance

| Request | Time |
|---|---|
| Point, 1 year, 2 parameters | 0.44 s |
| Point, 26 years, 3 parameters | 0.5–1.3 s |
| Regional, 1 year, 1 parameter | 0.39–0.72 s |

### 4.4 Which POWER parameters are useful?

Confirmed in our CSV headers:

- `AOD_55` — CERES SYN1deg Aerosol Optical Depth at 550 nm (dimensionless).
- `T2M` — MERRA-2 Temperature at 2 m (°C).
- `PRECTOTCORR` — MERRA-2 Corrected Precipitation (mm/day).

Other POWER parameters commonly available (check the CSV header for the exact definition/units before using): `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `WS10M`, `QV2M`, `ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `GWETROOT`, `GWETTOP`, `EVPTRNS`, `EVLAND`. The monthly docs say meteorological parameters come from MERRA-2 (1981–present) and solar parameters from CERES/SRB.

### 4.5 What POWER cannot do

- It does not provide the on-the-fly **MODIS** AOD product used in the video.
- It does not provide gridded maps directly; the regional endpoint returns a **box average**, not a grid.
- It does not provide ocean variables (sea surface temperature, ocean color, sea level) in the standard monthly point API.
- It does not replace a full reanalysis/subsetting service for advanced users.

---

## 5. Access decision matrix

| Need | Best path | Auth | Live-demo safe? | Notes |
|---|---|---|---|---|
| Temperature/precip/AOD at any point | **NASA POWER monthly point** | None | **Yes** | 0.4–1.3 s; CSV; CORS `*` |
| Box-average temperature/precip | **NASA POWER regional** | None | **Yes** | One parameter per request |
| Official Wisconsin MODIS AOD | **Giovanni** (build-time export) | None (UI) | No | 40–112 s/request; async |
| MODIS/land products at scale | **AppEEARS** | Earthdata | No (blocked here) | Build-time on a reachable network |
| MERRA-2/GLDAS raw files | **GES DISC** | Earthdata | No | OPeNDAP retired; file download 302→401 |
| Station temperature/precip | **NOAA CDO API** | Token | Maybe | 5 req/s; 10k/day |
| Climate indices / reanalysis | **KNMI Climate Explorer** | Mostly none | No | Manual web UI |
| Long-record temperature/precip/wind/humidity/soil moisture | **Meteomatics ERA5** | Basic (hackathon) | Yes (cache) | 1940–present; 1,000 req/day; 46 y × 8 params × 2 sites in 49 s |
| Rainfall cross-check | **Meteomatics CHIRPS v3** | Basic (hackathon) | Yes (cache) | 1981–present; 0.05°; ~6-week latency |
| Recent air quality (AOD, PM2.5) | **Meteomatics CAMS mix** | Basic (hackathon) | Maybe | Only 2015-11-21 onward |
| Forecast / nowcast | **Meteomatics mix / ecmwf-ifs** | Basic (hackathon) | Yes | 15-day forecast; 7-day 3-hourly query returns 2 KB |
| SAR/land change | **CSA RCM / Geo.ca** | Varies | No | Specialized |

---

## 6. What this means for the product

1. **Do not build the app around a login.** The demo network may block NASA CloudFront services, and judges should not need an account.
2. **Use NASA POWER as the live engine.** It is fast, open, and CORS-friendly. It is enough for the four-step challenge: variable → region → time series → trend + significance.
3. **Bundle the official example.** Export the Wisconsin MODIS AOD time series from Giovanni before the event and commit the CSV. Cite Giovanni + MODIS.
4. **Be precise about datasets.** `AOD_55` is CERES, not MODIS. Say so in the UI and the submission.
5. **Use the listed portals as citations and build-time tools**, not live dependencies. That satisfies the "use a NASA resource" rule while keeping the demo reliable.

---

## 7. References

- Challenge page: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
- Challenge Resources tab: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources
- NASA POWER API docs: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- Giovanni: https://giovanni.gsfc.nasa.gov/giovanni/
- GES DISC Hydrology Time Series: https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
- AppEEARS: https://appeears.earthdatacloud.nasa.gov/
- NOAA CDO: https://www.ncei.noaa.gov/cdo-web/
- KNMI Climate Explorer: https://climexp.knmi.nl/
- LAADS DAAC API: https://ladsweb.modaps.eosdis.nasa.gov/api/v2/
- Earthdata Login: https://urs.earthdata.nasa.gov/
- SeaWiFS article: https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf
- CSA RCM: https://donnees-data.asc-csa.gc.ca/en/dataset/rcm
- CSA SWOT: https://www.asc-csa.gc.ca/eng/satellites/swot/
- CSA SAR tutorial: https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial
- Meteomatics getting started: https://www.meteomatics.com/en/api/getting-started/
- Meteomatics available parameters: https://www.meteomatics.com/en/api/available-parameters/
- Meteomatics data sources: https://www.meteomatics.com/en/api/request/optional-parameters/data-source/
- Meteomatics date/time syntax: https://www.meteomatics.com/en/api/request/required-parameters/date-time-description/
- Space Apps Global Offers: https://www.spaceappschallenge.org/2026/global-offers/
- Meteomatics Space Apps signup: https://www.meteomatics.com/en/meteomatics-and-nasa-space-apps-challenge/


---

## 8. Deeper verification notes (added after the first pass)

The following details were verified with the official user guides/API docs and, where the local network blocked a host, through a reader proxy. They refine the recommendations above.

### 8.1 Giovanni requires Earthdata login for full functionality

The Giovanni user guide states that since early January 2019, **Earthdata Login is required to access full Giovanni functionality and data holdings**. There is a guest mode ("Continue with limited access"), but it is restricted.

Giovanni also has a cloud API:

- `https://api.giovanni.earthdata.nasa.gov/configured-variables/` — JSON list of configured variables (e.g., `AIRS3STD_7_0_SurfAirTemp_A`, `M2T1NXAER_5_12_4_DUCMASS`).
- `https://api.giovanni.earthdata.nasa.gov/proxy-timeseries?data=<PRODUCT_VERSION_VARIABLE>&version=<version>&location=[lat,lon]&time=START/END` — returns a time series, but redirects to **Earthdata Login**.
- Direct access to `api.giovanni.earthdata.nasa.gov` returned **403 CloudFront** from the Jakarta network; the proxy worked for metadata.

**Conclusion:** Giovanni is a build-time tool. Do not plan a live Giovanni call. Export the CSV before the event.

### 8.2 Hydrology Time Series is the "Data Rods" / Giovanni Time Series service

The GES DISC Hydrology Time Series tool:

- Was previously called the **Data Rods** service (Teng et al. 2016).
- Provides a **Time Series Viewer** tab: select a variable and point, plot interactively, export PNG and CSV.
- Is **point-only**; it returns a time series at a location, not a map.
- Masks grids over water; a point over water returns an error.
- Requires **Earthdata Login**.
- The underlying API is the **Giovanni Time Series Service API**.
- Supported product families include MERRA-2 (`M2I1NXLFO`, `M2T1NXFLX`, `M2T1NXLFO`, `M2T1NXSLV`), NLDAS, and GLDAS (`GLDAS_NOAH025_3H_2.0/2.1`); variables include `SoilMoi0_10cm_inst`, `RootMoist_inst`, `Evap_tavg`, `Rainf_f_tavg`, `Tair_f_inst`, `SoilM_0_100cm`, `T2M`, `QV2M`.
- No monthly GLDAS product in the service table; it is 3-hourly/point. Aggregate locally.

### 8.3 GES DISC migration: old URLs are dead

A GES DISC migration notice (published 11 May 2026, updated 1 Sep 2026) states:

- HTTPS access to on-premises `https://<server>.gesdisc.eosdis.nasa.gov/...` data **ended by 30 September 2026**. Use `https://data.gesdisc.earthdata.nasa.gov/...` instead.
- Recursive `wget`/`curl` directory downloads are no longer available; compile granule URLs via **CMR**.
- On-prem OPeNDAP services were turned off between 20 Aug and 30 Sep 2026; use `https://opendap.earthdata.nasa.gov/`.
- L34RS subsetter discontinued; replaced by **Harmony OPeNDAP Subsetting Service (HOSS)** / Harmony API.
- THREDDS Data Server discontinued 31 Jul 2026.
- The **Hydrology Data Rods** service is listed as previously discontinued (the Hydrology Time Series Viewer is the replacement).
- **Giovanni continues "in its current form until further notice,"** but users are encouraged to use Giovanni in the Cloud and the Hydrology Time Series Viewer.

**Action:** do not use old `*.gesdisc.eosdis.nasa.gov` data URLs or old OPeNDAP links. Use `earthaccess` + CMR or the CSV services.

### 8.4 MODIS product names and where they live

- **MOD08_M3** is the MODIS/Terra Atmosphere Monthly product and lives at **LAADS DAAC**, not GES DISC. **MYD08_M3** is the Aqua equivalent; global, monthly, 1° CMG, **2002-07-01 to present**.
- **AppEEARS** does **not** list MOD08_M3. Its product list (193 products) includes land products such as:
  - `MOD11A1.061` — daily 1 km land surface temperature, 2000-02-24–present.
  - `MOD13A3.061` — monthly 1 km NDVI/EVI, 2000-02-01–present.
  - `MOD13Q1.061` — 16-day 250 m NDVI/EVI.
  - `MCD43A4.061` — daily 500 m BRDF-corrected reflectance.
  - `SPL4SMGP.008` — daily 9 km soil moisture, 2015-03-31–present.
- AppEEARS API flow: `POST /api/login` (HTTP Basic Earthdata) → bearer token; `POST /api/task` with `task_type=point|area`, dates, layers; poll `GET /api/task/{id}`; `GET /api/bundle/{id}` → 302 to S3 (48 h). Point bundles return `*-results.csv`.
- **LAADS API-V2 metadata is public** (`/api/v2/measurements/products/MYD08_M3` returns 200 JSON), but downloads require a **LAADS token**. At test time the site displayed "We are currently unable to generate a LAADS DAAC token."

### 8.5 CMR metadata check (verified products)

Via proxy (direct CMR was CloudFront 403):

| Short name | Entry ID | Version | Provider | Time start | Time end |
|---|---|---|---|---|---|
| MOD08_M3 | MOD08_M3_6.1 | 6.1 | LAADS | 2000-02-01 | open |
| MYD08_M3 | MYD08_M3_6.1 | 6.1 | LAADS | 2002-07-01 | open |
| MOD11C3 | MOD11C3_061 | 061 | LPCLOUD | 2000-02-01 | open |
| MOD13C2 | MOD13C2_061 | 061 | LPCLOUD | 2000-02-01 | open |
| MOD13A3 | MOD13A3_061 | 061 | LPCLOUD | 2000-02-01 | open |
| OMAERUVd | OMAERUVd_003 | 003 | GES_DISC | 2004-10-01 | open |
| OMNO2d | OMNO2d_004 | 004 | GES_DISC | 2004-10-01 | open |
| OMSO2e | OMSO2e_004 | 004 | GES_DISC | 2004-10-01 | open |
| AIRX3STM | AIRX3STM_7.0 | 7.0 | GES_DISC | 2002-09-01 | 2016-10-01 |
| AIRX3STD | AIRX3STD_006 | 006 | GES_DISC | 2002-08-31 | 2016-09-25 |
| GPM_3IMERGDF | GPM_3IMERGDF_07 | 07 | GES_DISC | 1998-01-01 | 2025-09-30 |
| GPM_3IMERGM | GPM_3IMERGM_07 | 07 | GES_DISC | 1998-01-01 | 2025-09-30 |
| GPM_3IMERGHH | GPM_3IMERGHH_07 | 07 | GES_DISC | 1998-01-01 | 2025-09-30 |
| M2TMNXSLV | M2TMNXSLV_5.12.4 | 5.12.4 | GES_DISC | 1980-01-01 | open |
| M2T1NXSLV | M2T1NXSLV_5.12.4 | 5.12.4 | GES_DISC | 1980-01-01 | open |
| M2TMNXAER | M2TMNXAER_5.12.4 | 5.12.4 | GES_DISC | 1980-01-01 | open |
| M2T1NXAER | M2T1NXAER_5.12.4 | 5.12.4 | GES_DISC | 1980-01-01 | open |
| GLDAS_NOAH025_M | GLDAS_NOAH025_M_2.1 | 2.1 | GES_DISC | 2000-01-01 | open |
| GLDAS_NOAH025_3H | GLDAS_NOAH025_3H_2.1 | 2.1 | GES_DISC | 2000-01-01 | open |

**Caveat:** IMERG V07 `time_end` was 2025-09-30 on the query date; operational data continues with latency. AIRS `AIRX3STM` ends 2016-10; check `AIRS3STM` for AIRS-only post-2016 data.

### 8.6 Other resource checks

- **KNMI Climate Explorer:** direct connection timed out / SSL error from this machine; via proxy, the site now shows a **human-verification gate**. No public REST API found. It is an interactive web tool, not a live data source.
- **CSA RCM:** data are distributed through the **Earth Observation Data Management System (EODMS)**; some products are openly available, others require a vetted account. The SAR Python tutorial is a plotting tutorial (GDAL/rasterio/cartopy), not a trend workflow.
- **CSA SWOT:** data are per-pass NetCDF products at PO.DAAC; no regular monthly gridded product verified. Requires Earthdata/PO.DAAC access.
- **Geo.ca:** client-rendered portal with OGC API Records / CSW metadata; no single climate time-series API verified.
- **NOAA CDO:** token required; 5 req/s, 10,000/day; `/data` limited to a 10-year range for monthly/annual data and 1 year for other data; `limit` max 1000.

### 8.7 ORNL DAAC MODIS REST — a no-login MODIS data path

The ORNL DAAC MODIS/VIIRS Web Service is not listed on the challenge Resources tab, but it is a genuine NASA data service and it does **not require Earthdata Login** for point subsets.

- Dates: `https://modis.ornl.gov/rst/api/v1/{product}/dates?latitude=...&longitude=...` (fast).
- Subset: `https://modis.ornl.gov/rst/api/v1/{product}/subset?latitude=...&longitude=...&startDate=AYYYYDDD&endDate=AYYYYDDD&band=...&kmAboveBelow=...&kmLeftRight=...`
- **Verified:** MOD13Q1, Jakarta (−6.2, 106.85), 2024-01-01, band `250m_16_days_NDVI`, returned raw value `2233` with scale `0.0001` → **NDVI 0.2233**.
- **Limits:** about 10 subset tiles/dates per request; each request is slow (tens of seconds). Use at build time; cache the CSV.
- **Use:** a real MODIS NDVI/LST variable without an Earthdata account, or a cross-check against POWER.
- **Products:** MOD13Q1 (NDVI/EVI 16-day 250 m), MOD11A2 (LST 8-day 1 km), and other MODIS/VIIRS land products.

This is the best fallback if the team wants a MODIS-based variable but does not have Earthdata credentials.

---

## 9. Meteomatics Weather API (added 2026-11-14)

### 9.1 What it is and how to authenticate

Meteomatics is a commercial Swiss weather-data provider and an official **NASA Space Apps 2026 Global Offer**. Participants get free API access at **1,000 queries/day** and more than **1,800 parameters** for the duration of the hackathon, through the Space Apps Global Offers page. Its REST API serves historical reanalysis, observations, current conditions, forecasts, climate scenarios, air quality, marine, soil, and satellite-derived parameters.

It is **not** on the challenge Resources tab and is **not a NASA resource**; it is an official partner/participant offer, not a NASA dataset. That distinction matters for the global-award rule (see §9.9).

- Docs: https://www.meteomatics.com/en/api/getting-started/
- Space Apps Global Offers: https://www.spaceappschallenge.org/2026/global-offers/
- Meteomatics Space Apps signup: https://www.meteomatics.com/en/meteomatics-and-nasa-space-apps-challenge/
- Base URL: `https://api.meteomatics.com`
- Auth: HTTP Basic (`username`/`password`). Credentials are in `.env` as `METEOMATICS_USERNAME` / `METEOMATICS_PASSWORD`.
- URL shape: `/{valid_time}/{parameters}/{locations}/{format}?source={model}`
- Locations: `lat,lon` or `lat1,lon1_lat2,lon2`; areas: `lat_max,lon_min_lat_min,lon_max:res_lat,res_lon`.
- Formats: CSV, JSON, XML, PNG, NetCDF, GeoTIFF, HTML; WMS/WFS interfaces.
- The hackathon account is valid until **2026-11-22**.

Example: one year of daily temperature and precipitation for Jakarta.

```bash
curl -u "$METEOMATICS_USERNAME:$METEOMATICS_PASSWORD" \
  "https://api.meteomatics.com/2024-01-01T00:00:00Z--2024-12-31T00:00:00Z:P1D/t_mean_2m_24h:C,precip_24h:mm/-6.2,106.85/csv?source=ecmwf-era5"
```

### 9.2 Account limits (verified with `/user_stats_json`)

The limits match the Global Offer: free access to **1,000 queries/day** for the duration of the hackathon.

| Limit | Value |
|---|---|
| Requests per day | 1,000 hard |
| Requests per 60 s | 250 hard |
| Parallel requests | 10 hard |
| Historic range | 1900-01-01 to 2028-11-14 |
| Area requests | enabled |
| Model set | `model_select_plus_all_1k` |

`GET https://api.meteomatics.com/user_stats_json` returns the remaining quota; it uses the same HTTP Basic auth.

### 9.3 Useful model sources

| Identifier | What it is | History / lead time | Use for |
|---|---|---|---|
| `ecmwf-era5` | ERA5 reanalysis, downscaled to ~90 m | 1940-01-01 to ~6 days ago; hourly | Long-term trends in temperature, precipitation, humidity, wind, radiation, soil moisture |
| `chc-chirps3` | CHIRPS v3 gauge/satellite rainfall, 0.05° | 1981-01-02 to ~6 weeks ago; daily | Rainfall trend cross-check |
| `chc-chirps2` | older CHIRPS v2 | 1981 to present | backwards compatibility only |
| `mix` | blended best-available model | now + forecast | current conditions, forecast, recent air quality |
| `ecmwf-ifs` | ECMWF IFS, downscaled | 15-day forecast, hourly | live forecast layer |
| `ecmwf-ens` | 50-member ensemble | 15-day forecast, 3-hourly | uncertainty / spread |
| `ncep-gfs`, `dwd-icon-global`, `cmc-gem`, `ukmo-um10` | other global models | 7–16 days | model comparison |
| `mri-esm2-ssp126/245/370/460/585` | downscaled climate scenarios | 2015–2100, 3-hourly | future projection (optional) |
| `mix-obs`, `mm-mos` | station observations / MOS | present + history | station validation (format restrictions) |

Important: `mix` is a blend of radar, satellite, models, reanalysis, and climate data. It is excellent for “what is happening now”, but it can change source over time. **Do not use `mix` for a multi-decade trend**; choose one model.

### 9.4 Verified parameters

All of these returned data for Jakarta and Wisconsin:

| Parameter | Meaning | Notes |
|---|---|---|
| `t_mean_2m_24h:C` | 24-hour mean 2 m temperature | daily aggregate |
| `t_max_2m_24h:C` / `t_min_2m_24h:C` | daily max/min temperature | |
| `precip_24h:mm` | 24-hour precipitation total | right-bounded |
| `relative_humidity_mean_2m_24h:p` | 24-hour mean relative humidity | |
| `wind_speed_mean_10m_24h:ms` | 24-hour mean 10 m wind speed | |
| `global_rad_24h:J` | 24-hour global radiation | J/m²; divide by 86,400 for W/m² |
| `volumetric_soil_water_mean_-5cm_24h:m3m3` | 24-hour mean soil water at 5 cm | m³/m³ |
| `total_aod_550nm:idx` | total aerosol optical depth at 550 nm | CAMS; 2015-11-21 onward |
| `pm2p5:ugm3` | PM2.5 concentration | CAMS; 2015-11-21 onward |

Other parameter families in the docs: evapotranspiration (`evapotranspiration_24h:mm`), pressure, cloud cover, snow, radiation, marine, lightning, tropical cyclones, fire-risk indices, and climate scenarios. Parameter names follow `{quantity}_{level}_{interval}:{unit}`; the interval can be `5min` to `24h`. Full list: https://www.meteomatics.com/en/api/available-parameters/alphabetic-list/

### 9.5 Verified performance (2026-11-14, Jakarta network)

| Request | Time | Size | Rows |
|---|---|---|---|
| Current `t_2m:C`, one point | 1.1 s | 259 B | 1 |
| 2024 daily, 2 parameters, one point | 0.8 s | 11 KB | 366 |
| 1980–2025 daily, 8 parameters, 2 sites | 49 s | 2.6 MB | 33,604 |
| 1981–2025 daily precipitation, CHIRPS3, 2 sites | 27 s | 1.25 MB | 32,870 |
| 2016–2025 daily AOD + PM2.5, 2 sites | 13 s | 334 KB | 7,306 |
| 5×5 area grid at 0.25°, one timestamp | <1 s | 241 B | 25 |
| 7-day 3-hourly forecast, 3 parameters | <1 s | 2 KB | 57 |

A 46-year × 8-parameter × 2-site request fits comfortably in one call. For a live demo, cache the long series and use short current/forecast calls.

### 9.6 Data semantics and gotchas

- **Interval parameters are right-bounded.** `precip_24h:mm` at `2024-01-01T00:00Z` is the total for 2023-12-31 00Z → 2024-01-01 00Z. A request that starts exactly at the archive opening fails for interval parameters because the first interval crosses the boundary; start one step later (CHIRPS3 starts 1981-01-02 for this reason).
- **`P1M` is a sampling step, not a monthly aggregate.** `...:P1M` returns the value at the first of each month, not the monthly mean. Fetch daily values and aggregate locally: monthly mean for temperature/humidity/wind, monthly sum (or mean daily rate) for precipitation.
- **ERA5 latency is about 6 days.** On 2026-11-14 the API reported ERA5 available to 2026-11-08. Do not request `now` from `ecmwf-era5`.
- **CHIRPS3 latency is about 6 weeks.** It ended 2026-10-01 on 2026-11-14. Use `mix` or `ecmwf-ifs` for recent rainfall.
- **Air quality starts 2015-11-21.** `total_aod_550nm` and `pm2p5` are CAMS-derived and not available in ERA5. For the challenge’s multi-decadal AOD story, use NASA MODIS/Giovanni or POWER `AOD_55`; Meteomatics is only a recent cross-check.
- **Reserved values:** `-999` = not available, `-888`/`-777` = parameter-specific, `-666` = not applicable. Treat all as missing.
- **Point values are not station values.** The API downscales model/reanalysis data to ~90 m using terrain and land use. It does not return a weather-station observation unless you query `mix-obs`.
- **Area requests return a grid**, not a box average. Average the grid in code if you need a regional mean.
- **Browser calls:** the API returns CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers: Authorization`), so a browser request is technically possible. Do **not** ship Basic auth credentials in client-side JavaScript; anyone can read them. Use a small backend/serverless proxy, or serve pre-fetched CSVs for the demo.

### 9.7 Quick trend cross-check

I aggregated the bundled ERA5 CSV to monthly values, removed the 1980–2025 monthly climatology, and ran OLS on time. This is a sanity check, not the final HAC/Mann–Kendall method described in `trend-analysis-guide.md`.

| Site | Variable | Trend per decade | 95% CI | p |
|---|---|---|---|---|
| Jakarta | T2M | **+0.237 °C** | +0.213 to +0.260 | 1.7e-65 |
| Wisconsin | T2M | **+0.277 °C** | +0.145 to +0.410 | 4.5e-5 |
| Jakarta | relative humidity | **-0.629 %** | -0.786 to -0.472 | 2e-14 |
| Jakarta | soil water (5 cm) | **-0.0033 m³/m³** | -0.0052 to -0.0013 | 8.5e-4 |
| Wisconsin | wind speed | **-0.024 m/s** | -0.042 to -0.006 | 7.7e-3 |

Mann–Kendall on the same monthly anomalies agrees on sign and significance for both T2M series and for the ERA5 Jakarta precipitation series (p=0.014).

Precipitation is the useful cautionary tale:

| Period | Site | ERA5 | CHIRPS3 |
|---|---|---|---|
| 1981–2025 | Jakarta | -0.142 mm/day/dec (p=0.037) | **+0.190** mm/day/dec (p=0.025) |
| 2000–2025 | Jakarta | +0.274 mm/day/dec (p=0.075) | +0.383 mm/day/dec (p=0.063) |
| 1981–2025 | Wisconsin | +0.035 mm/day/dec (p=0.37) | +0.060 mm/day/dec (p=0.28) |

The Jakarta sign flips between datasets over 1981–2025 but agrees over 2000–2025. That is not a bug in the API; it is what noisy, method-dependent precipitation trends look like. The POWER figure in `data-exploration-update.md` (+0.795 mm/day/decade) is larger still. Absolute totals also differ: at the Wisconsin point, CHIRPS3 averages 1,144 mm/year versus 887 mm/year in ERA5. Compare trends within one dataset; do not splice absolute values across datasets. The product should show dataset, period, and method next to the verdict, and should not claim a single “true” trend.

### 9.8 Files and script

`scripts/fetch_meteomatics.py` downloads the three CSV files:

- `docs/problems/assets/meteomatics/era5_daily_jakarta_wisconsin_1980_2025.csv`
- `docs/problems/assets/meteomatics/chirps3_daily_precip_jakarta_wisconsin_1981_2025.csv`
- `docs/problems/assets/meteomatics/cams_daily_aod_pm25_jakarta_wisconsin_2016_2025.csv`

Run `python scripts/fetch_meteomatics.py` (skips existing files), or `--force` to refetch, or `--dataset era5` for one dataset. The script uses at most three requests, well inside the 1,000/day cap.

### 9.9 Hackathon verdict

- **Use it for:** a second, independent long-record path for temperature, precipitation, humidity, wind, radiation, and soil moisture (1940–present; 1981–present for CHIRPS); a build-time cross-check against NASA POWER; an optional recent air-quality layer (2015+); an optional forecast/nowcast layer; an optional climate-scenario view (2015–2100).
- **It can be the primary engine.** The rule requires at least one NASA resource, not that NASA be the only source. Use Meteomatics for the heavy lifting and keep NASA POWER/Giovanni/MODIS in the app for the required NASA evidence and a cross-check.
- **Do not use it as the NASA resource:** it is an official Global Offer, but the global-award rule requires a NASA resource from the challenge Resources tab. The technical meeting (page 19) says “At least one NASA resource from the Challenge is required for global awards!”, and the same deck lists Participant Offers separately (page 16). The challenge’s Resources tab has no Meteomatics entry (checked 2026-11-14). Keep NASA POWER/Giovanni/MODIS as the primary NASA evidence.
- **Rule check:** this reading is based on the published technical meeting deck (page 19) and the 2026 challenge page. If the organizers confirm that Global Offers count toward the NASA-resource requirement, update this note.
- **Submission placement:** describe Meteomatics as an official Space Apps Global Offer (and cite the offer page) in the project description and references. Do not use it to answer the “What NASA data did you use?” field; use NASA POWER/Giovanni/MODIS there.
- **Do not use `mix` for trends.** Pick `ecmwf-era5` or `chc-chirps3`.
- **Pre-fetch and cache.** Long series are fast enough (49 s for 46 years), but a demo should not depend on a 49 s network call. Commit the CSVs and refresh them at build time.
- **Credentials expire 2026-11-22.** Keep them in `.env`; rotate or remove after the event.

