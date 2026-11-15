# Data access feasibility: "Be an Earth System Trend Detective!"

> **Update 2026-11-14 15:35 WIB:** the earlier CloudFront 403s were caused by a VPN/Cloudflare WARP profile. With the VPN disabled, the portals return 200, but data downloads still require Earthdata Login. See `data-exploration-update.md` for the new multi-parameter, seasonal, grid, and MODIS L3 exploration.

**Test date:** 2026-11-14
**Environment:** Linux, Python 3.11, `requests`; no Earthdata Login account and no NOAA token were used.
**Network location of the test machine:** Jakarta, Indonesia (egress IP geolocated to Jakarta; AS13335 Cloudflare).
**Working directory:** `docs/problems/`
**Goal:** find a data path that a 48-hour hackathon team can actually ship, download real data, and compute a monthly trend with Mann-Kendall p-value and Sen's slope.

---

## Bottom line

**Yes, a real end-to-end demo is feasible today, in about one second of network time.**

The reliable path is the **NASA POWER monthly point API** (`https://power.larc.nasa.gov/api/temporal/monthly/`):

- No login, no token, no API key.
- Returns CSV or JSON in **0.4-0.8 s** per point request.
- Includes `AOD_55` (aerosol optical depth at 550 nm, from CERES SYN1deg) monthly from **January 2001 to present**, plus MERRA-2 temperature and precipitation from 1981/2000.
- Sends `Access-Control-Allow-Origin: *`, so a browser app can call it directly with `fetch()`.

The video's exact dataset, **MODIS-Aqua MYD08_M3 monthly AOD**, is not reachable without Earthdata credentials. Raw MODIS files require a LAADS DAAC download token; the GES DISC OPeNDAP service is retired; AppEEARS, CMR, and Earthdata Cloud return CloudFront 403 from this Jakarta network. Giovanni (which needs no login) does respond, but requests take 40-112 s and the workflow is asynchronous, so it is unusable for a live demo.

**Recommended demo:** bundle the two POWER CSVs in `assets/`, compute the trend client-side or in a tiny backend, and optionally refresh live from POWER. If the judges insist on MODIS, pre-download a MYD08_M3 CSV before the event (Earthdata account + LAADS token required) and bundle it as a second dataset.

---

## 1. Test matrix

| Path | Dataset | Auth | Observed result | Latency | Verdict |
|---|---|---|---|---|---|
| NASA POWER monthly point | AOD_55, T2M, PRECTOTCORR | none | HTTP 200, CSV | 0.44-0.78 s | **Works** |
| NASA POWER monthly regional | T2M box 42-44N, 90-88W | none | HTTP 200, CSV | 0.39-0.72 s | **Works** (1 parameter only) |
| Giovanni homepage | UI | none | HTTP 200 | 40-51 s | Reachable but very slow |
| Giovanni `service_manager.pl` | ArAvTs workflow | none | HTTP 200 XML, "Launching workflow" | **112 s for one request** | Not demo-safe |
| GES DISC on-prem OPeNDAP | MERRA-2 M2T1NXAER | none | **HTTP 410 "Service Permanently Retired"** | 1.0 s | Dead |
| GES DISC `/data/` file | MERRA-2 daily `.nc4` | Earthdata Login | **302 to `urs.earthdata.nasa.gov`, then 401** | 1-2 s | Login required |
| Earthdata Cloud OPeNDAP | MERRA-2 | Earthdata Login | **HTTP 403 CloudFront "Request blocked"** | 0.8 s | Blocked here |
| CMR search | collection metadata | none normally | **HTTP 403 CloudFront "Request blocked"** | 0.6-0.7 s | Blocked here |
| `earthdata.nasa.gov` | docs | none normally | **HTTP 403 CloudFront** | 0.6 s | Blocked here |
| AppEEARS web + API | subsetting | Earthdata Login | **HTTP 403 CloudFront on every endpoint** | 0.5 s | Blocked here |
| Earthdata Login signup | account | none | HTTP 200 | 1.4 s | Reachable |
| NOAA NCEI CDO API | station climate | token | **HTTP 400 `{"message":"Token parameter is required."}`** | 1.6 s | Token required |
| NOAA CDO token request | signup | email only | HTTP 200 | 1.4 s | Reachable |
| LAADS API-V2 metadata | MYD08_M3 product info | none | HTTP 200 JSON, 10 KB | ~1 s | **Works** |
| LAADS download | MODIS HDF | LAADS token | not tested (no token) | - | Token required |

Raw measurements are in `assets/probe_results.json`; the probe script is `assets/probe_endpoints.py`, log in `assets/probe_log.txt`.

---

## 2. NASA POWER: the working no-login path

### 2.1 Exact request

Monthly point time series, Wisconsin (Madison area), 2000-2025, three parameters:

```bash
curl -sS "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=-89.4&latitude=43.07&start=2000&end=2025&format=CSV" \
  -o docs/problems/assets/power_monthly_wisconsin.csv
```

Jakarta:

```bash
curl -sS "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=106.85&latitude=-6.2&start=2000&end=2025&format=CSV" \
  -o docs/problems/assets/power_monthly_jakarta.csv
```

Parameters:

- `parameters`: comma-separated; up to **20** parameters per point request.
- `community=AG` (agroclimatology community; this is the community used by the examples).
- `longitude`, `latitude`: decimal degrees (west negative).
- `start`, `end`: years.
- `format=CSV` or `JSON`.

### 2.2 Response format

The CSV is not a plain table: it starts with a fixed text header, then a `PARAMETER,YEAR,JAN,...,DEC,ANN` table.

```
-BEGIN HEADER-
NASA/POWER Source Native Resolution Monthly and Annual
Dates (month/day/year): 01/01/2000 through 12/31/2025 in LST
Location: Latitude  43.07   Longitude -89.4
Elevation from MERRA-2: Average for 0.5 x 0.625 degree lat/lon region = 280.98 meters
The value for missing source data that cannot be computed or is outside of the sources availability range: -999
Parameter(s):
AOD_55          CERES SYN1deg Aerosol Optical Depth 55 (dimensionless)
PRECTOTCORR     MERRA-2 Precipitation Corrected (mm/day)
T2M             MERRA-2 Temperature at 2 Meters (C)
-END HEADER-
PARAMETER,YEAR,JAN,FEB,...,DEC,ANN
AOD_55,2001,0.07,0.15,...,0.09,0.23
```

Gotchas:

- **`ANN` is a 13th monthly column** (annual mean). Drop it before melting or you will duplicate months.
- Missing data is **`-999`**, not NaN. In our requests, all of 2000 is `-999` for `AOD_55`; data starts **2001-01**.
- `T2M` and `PRECTOTCORR` are complete for 2000-2025; `AOD_55` starts in 2001.
- The point is the MERRA-2 grid cell (0.5° x 0.625°), not an exact station.
- `AOD_55` is **CERES SYN1deg**, not MODIS. It is a legitimate monthly AOD product but it is not the exact product in Dr. Acker's video.
- The API has an undocumented rate limit; HTTP 429 exists. Our ~10 requests were all fine.
- No CORS problem: POWER returns `Access-Control-Allow-Origin: *` on GET when an `Origin` header is sent. Do not add custom headers (OPTIONS preflight returns 404; a simple GET does not need it).

### 2.3 Regional endpoint

For a box average, use the regional endpoint (one parameter per request):

```bash
curl -sS "https://power.larc.nasa.gov/api/temporal/monthly/regional?parameters=T2M&community=AG&latitude-min=42&latitude-max=44&longitude-min=-90&longitude-max=-88&start=2020&end=2020&format=CSV" \
  -o power_regional.csv
```

Response: HTTP 200, CSV attachment `POWER_Regional_Monthly_...csv`, **0.39-0.72 s**. This is useful if the app lets the user draw a box, but it is limited to one parameter per request.

### 2.4 Timing

| Request | Time |
|---|---|
| Point, 1 year, 2 parameters | 0.44 s |
| Point, 26 years, 3 parameters (the two saved CSVs) | 0.5-1.3 s |
| Regional, 1 year, 1 parameter | 0.39-0.72 s |

No authentication round trip, no queue.

---

## 3. Giovanni: reachable, but not a live-demo API

Giovanni is the tool used in the challenge video. It does **not** require Earthdata Login for the legacy workflow endpoint, but it is not practical for a hackathon demo.

What was tested:

```text
GET https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/service_manager.pl?service=ArAvTs
```

Response (HTTP 200, 112 s, `text/xml`):

```xml
<session id="...">
  <resultset id="...">
    <result id="..." title="Time Series, Area-Averaged">
      <status>
        <code>0</code>
        <message>Launching workflow</message>
        <percentComplete>0</percentComplete>
      </status>
      ...
```

A full request with `service=ArAvTs`, `starttime`, `endtime`, `data=MYD08_M3_6_1_AOD_550_Dark_Target_Deep_Blue_Combined`, `variable=...`, and `bbox=-95,40,-85,47` did not return data within 150 s. The response is an **asynchronous session**; the front end polls `service_manager.pl?session=<id>&format=json`, and the XSL template expects a `data/fileGroup/dataFile` element when the job finishes.

Other timing observations:

- Giovanni homepage: 40-51 s.
- `getGiovanniConfig.pl?cfg=APPLICATION`: 66 s to return `{"APPLICATION":"GIOVANNI"}`.
- `service_manager.pl?service=ArAvTs`: 112 s.
- Static JavaScript file: up to ~2 minutes.

**Honest conclusion:** no time series was retrieved from Giovanni. The endpoint is real and login-free, but there is no documented, stable request contract, each request costs 40-112 s, and job completion is asynchronous. It is not suitable for a 48-hour demo, let alone a live one. If a team wants MODIS AOD, download it before the event.

---

## 4. GES DISC, MERRA-2, LAADS, AppEEARS

### 4.1 GES DISC OPeNDAP is retired

```text
GET https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/MERRA2/M2T1NXAER.5.12.4/
HTTP 410
"Service Permanently Retired. GES DISC's on-premises OPeNDAP service has been retired.
The data can be accessed through Earthdata Cloud OPeNDAP and other subsetting services."
```

This is a hard failure, not a temporary one. Any tutorial that uses `goldsmr4.gesdisc.eosdis.nasa.gov/opendap/...` is stale.

### 4.2 GES DISC direct files require Earthdata Login

Directory listings are public:

```text
GET https://goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2/M2T1NXAER.5.12.4/2000/01/
HTTP 200 (HTML listing)
```

File download is not:

```text
GET https://goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2/M2T1NXAER.5.12.4/2000/01/MERRA2_200.tavg1_2d_aer_Nx.20000101.nc4
HTTP 302 -> https://urs.earthdata.nasa.gov/oauth/authorize/?...
HTTP 401 "HTTP Basic: Access denied."
```

So the exact recipe is: Earthdata Login account, then either browser login or a `.netrc`/cookie flow. This works in principle, but it adds account creation, credential handling, and a large per-file download. MERRA-2 `M2T1NXAER` is hourly 2D aerosol diagnostics at 0.5° x 0.625°; a full month is ~30 files.

### 4.3 Earthdata Cloud OPeNDAP and CMR are blocked from this network

```text
GET https://opendap.earthdata.nasa.gov/                  -> HTTP 403 CloudFront "Request blocked"
GET https://cmr.earthdata.nasa.gov/search/collections.json?... -> HTTP 403 CloudFront "Request blocked"
GET https://www.earthdata.nasa.gov/data/tools/appeears   -> HTTP 403 CloudFront "Request blocked"
```

The egress IP is in Jakarta (`2a09:bac1:...`, country ID). NASA's CloudFront distributions appear to block this region/source. This is not a credentials issue: the request never reaches the application. A VPN or a different network may change the result. Do not build a demo that depends on these hosts from Jakarta.

Earthdata Login itself is reachable (`https://urs.earthdata.nasa.gov/users/new`, HTTP 200), so an account can be created; the problem is the CloudFront-fronted services afterward.

### 4.4 LAADS DAAC (MODIS MYD08_M3)

LAADS is the correct home for MODIS atmosphere Level 3 products. Its **API-V2 metadata is public and fast**:

```bash
curl -sS "https://ladsweb.modaps.eosdis.nasa.gov/api/v2/measurements/products/MYD08_M3"
# HTTP 200, JSON: title "MODIS/Aqua Aerosol Cloud Water Vapor Ozone Monthly L3 Global 1Deg CMG"
# archiveSet 61, collection 6.1
```

Download requires a token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://ladsweb.modaps.eosdis.nasa.gov/api/v2/content/archives/FILENAME"
```

The LAADS site states that all downloads require either a website login or a download token, and at the time of testing it also displayed: **"We are currently unable to generate a LAADS DAAC token."** That is a live operational risk. The old LWS Classic API retired on 2026-08-31; the current API base is `/api/v2/`.

### 4.5 AppEEARS

Every tested URL returned CloudFront 403 from this network, including the web UI and the product-list endpoint. The documented auth flow (from NASA docs, not executable here) is:

1. `POST https://appeears.earthdatacloud.nasa.gov/api/login` with HTTP Basic `email:password` (Earthdata Login).
2. Receive a bearer token; send `Authorization: Bearer <token>` on all later calls.
3. `POST /api/task` with a JSON area/date/product request; poll `GET /api/task/{task_id}`; download `GET /api/bundle/{task_id}`.

Because the host is blocked, this path is **untested end-to-end** and should not be the demo backbone.

---

## 5. NOAA NCEI Climate Data Online

- Base URL: `https://www.ncei.noaa.gov/cdo-web/api/v2/`
- Auth: token in the `token:` header (or `?token=`).
- Signup: `https://www.ncdc.noaa.gov/cdo-web/token` (enter email, token is emailed). Reachable, HTTP 200.
- Rate limits, quoted from the NCEI docs: **5 requests/second and 10,000 requests/day**.
- Without a token: HTTP 400 `{"status":"400","message":"Token parameter is required."}`.

Example request (not executed because no token was requested):

```bash
curl -H "token: YOUR_TOKEN" \
  "https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&stationid=GHCND:USW00014898&startdate=2000-01-01&enddate=2025-10-31&datatypeid=TAVG&units=metric&limit=1000"
```

This is a good fallback for station temperature trends, but it adds an email round trip and a token to the demo. It is not needed for the AOD story.

---

## 6. Working trend analysis

Script: `assets/power_trend_analysis.py`
Data: `assets/power_monthly_wisconsin.csv`, `assets/power_monthly_jakarta.csv`
Outputs: `assets/power_trend_results.csv`, `assets/power_trend_wisconsin.png`, `assets/power_trend_jakarta.png`

Method:

1. Parse the POWER fixed header and the `PARAMETER,YEAR,JAN..DEC,ANN` table.
2. Melt months to a monthly series; drop `ANN`; drop `-999`.
3. Compute the **monthly climatology** (mean of each calendar month) and subtract it to get anomalies.
4. Fit an OLS linear trend to the anomaly series; report the slope per decade.
5. **Mann-Kendall** test with tie correction; report S, tau, and two-sided p.
6. **Sen's slope**: median of all pairwise slopes; report per decade.
7. Robustness check: repeat Mann-Kendall on **annual means** (25 points), which is less affected by month-to-month autocorrelation.

Validation: our Sen slope equals `scipy.stats.theilslopes` to 6 decimals; our MK p-value matches `scipy.stats.kendalltau` on the same series (tau-b differs slightly because of ties). Numbers below are from `power_trend_results.csv`.

### Results

| Site | Parameter | Period | Mean | Sen slope / decade | MK p (monthly) | Annual-mean MK p |
|---|---|---|---:|---:|---:|---:|
| Wisconsin | AOD_55 | 2001-01..2025-12 | 0.211 | **-0.0100** | **0.0033** | 0.0496 |
| Wisconsin | T2M | 2000-01..2025-12 | 8.20 °C | +0.249 °C | 0.101 | 0.378 |
| Wisconsin | PRECTOTCORR | 2000-01..2025-12 | 2.59 mm/day | +0.078 mm/day | 0.392 | 0.724 |
| Jakarta | AOD_55 | 2001-01..2025-12 | 0.398 | **+0.0378** | **2.2e-16** | 7.8e-05 |
| Jakarta | T2M | 2000-01..2025-12 | 27.38 °C | +0.214 °C | 5.5e-12 | 1.5e-04 |
| Jakarta | PRECTOTCORR | 2000-01..2025-12 | 6.11 mm/day | +0.795 mm/day | 1.05e-05 | 0.0308 |

Interpretation for the demo:

- Wisconsin AOD declines by about **0.010 per decade** (about 5% of the 0.21 mean); monthly MK p = 0.003, annual MK p = 0.050. Significant but modest.
- Jakarta AOD rises by about **0.038 per decade** (about 9.5% of the 0.40 mean); p is effectively zero. The seasonal cycle peaks in September-October.
- The same code also finds significant Jakarta warming (+0.21 °C/decade) and a significant increase in mean daily precipitation (+0.79 mm/day/decade).

Caveats to state in the app:

- Monthly MK p-values are optimistic because monthly anomalies are autocorrelated. The annual-mean test is the conservative headline; both are reported.
- `AOD_55` is CERES SYN1deg, not MODIS. Do not label it "MODIS AOD".
- 25 years is a short record for aerosol trends; do not overclaim.
- The point is a MERRA-2 grid cell, not a ground station.

The plots show the monthly anomaly series, a 12-month running mean, the Sen trend line, and the mean seasonal cycle with ±1 standard deviation bars. Wisconsin's summer AOD peak is clear; Jakarta's autumn peak is clear.

---

## 7. Three paths for the hackathon

### (a) Pre-downloaded CSV bundled with the app

- **Reliability: 5/5.** No network, no auth, no rate limits; works offline and on demo day even if the venue Wi-Fi fails.
- **Demo value: 4/5.** Instant and deterministic. Can look static unless the UI makes the data provenance obvious.
- **Effort: lowest.** The two CSVs in `assets/` are ready; the trend script runs in under 2 s.

### (b) Live API on demand (NASA POWER)

- **Reliability: 4/5.** Verified working from Jakarta, 0.4-0.8 s, CORS `*`, no login. Risks: venue network, undocumented rate limit, and the API being down.
- **Demo value: 5/5.** Type a city or drag a point, get a fresh 25-year series and a trend. This is the "detective" interaction judges remember.
- **Effort: low.** One GET, one CSV parse, the same analysis code. A browser can call POWER directly; if the app needs a server, one endpoint is enough.

### (c) Earthdata-authenticated subsetting (GES DISC / LAADS / AppEEARS)

- **Reliability: 1/5 from this network.** AppEEARS, CMR, Earthdata Cloud OPeNDAP, and `earthdata.nasa.gov` return CloudFront 403 here. GES DISC file downloads require a login; LAADS requires a token and token generation was unavailable during testing.
- **Demo value: 5/5 if it works.** It is the only path to the actual MODIS MYD08_M3 product used in the video.
- **Effort: high.** Account creation, token handling, long downloads, HDF/NetCDF parsing, and a real chance of failure on stage.

### Ranking

1. **Hybrid (a)+(b): bundled CSV first, live POWER refresh second.** Best reliability and best demo value. The app always has data; the button that fetches live data is a bonus, not a dependency.
2. **Pure (b), live POWER.** Excellent demo, small operational risk.
3. **Pure (a), bundled CSV.** Bulletproof but less interactive.
4. **(c) Earthdata-authenticated MODIS.** Only as a pre-event stretch goal, never as the live path.

**Best dataset:** NASA POWER `AOD_55` monthly point series (CERES SYN1deg), with `T2M` and `PRECTOTCORR` from the same request. If the team wants the exact MODIS product, pre-fetch `MYD08_M3` (collection 6.1) before the hackathon and bundle the resulting CSV; do not plan to fetch it live.

---

## 8. Reproduction

```bash
cd docs/problems/assets

# 1. Download the two point series (already saved)
curl -sS "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=-89.4&latitude=43.07&start=2000&end=2025&format=CSV" -o power_monthly_wisconsin.csv
curl -sS "https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=106.85&latitude=-6.2&start=2000&end=2025&format=CSV" -o power_monthly_jakarta.csv

# 2. Run the analysis (writes CSV + PNGs)
python power_trend_analysis.py

# 3. Re-run the endpoint probes (optional; Giovanni takes minutes)
python probe_endpoints.py
```

Python dependencies: `pandas`, `numpy`, `scipy`, `matplotlib` (all present in the test environment).

Files:

| File | Purpose |
|---|---|
| `power_monthly_wisconsin.csv` | Raw POWER monthly data, Wisconsin, 2000-2025 |
| `power_monthly_jakarta.csv` | Raw POWER monthly data, Jakarta, 2000-2025 |
| `power_trend_analysis.py` | Parser + OLS + Mann-Kendall + Sen + plots |
| `power_trend_results.csv` | Trend table for all six site/parameter combinations |
| `power_trend_wisconsin.png` | Anomaly + seasonal cycle plot, Wisconsin AOD |
| `power_trend_jakarta.png` | Anomaly + seasonal cycle plot, Jakarta AOD |
| `probe_endpoints.py` | Reproducible endpoint/auth probe |
| `probe_results.json` | Machine-readable probe results (status, timing, headers) |
| `probe_log.txt` | Raw probe log |
| `giovanni_probe.py` | Bounded attempt at the legacy Giovanni workflow |
| `giovanni_probe.log` | Giovanni request log |

---

## 9. Honest failures and unknowns

- **Giovanni did not return a time series.** The legacy endpoint accepted the request and launched a workflow, but no data arrived within the test window. The request format is undocumented; the observed latency (40-112 s per call) makes further debugging expensive.
- **AppEEARS, CMR, Earthdata Cloud OPeNDAP, and `earthdata.nasa.gov` were blocked at CloudFront (HTTP 403) from Jakarta.** This is likely geographic/WAF filtering, not an auth failure. Results may differ on another network. They were not tested with a VPN.
- **No Earthdata account or NOAA token was created**, so authenticated downloads and token-based CDO queries were not executed. The auth requirements above come from the services' own responses and documentation.
- **LAADS token generation was unavailable** at test time (site banner), so the MODIS download path could not be completed.
- **POWER parameter-metadata endpoints** (`/api/parameters`, `/api/parameters/AOD_55`) return 404. Parameter descriptions are in the CSV header instead.
- **AOD_55 is not MODIS.** It is CERES SYN1deg. The trend results are real, but they are not a reproduction of the video's exact MODIS retrieval.
- **Monthly Mann-Kendall p-values are optimistic** because of autocorrelation. The annual-mean p-values are the conservative check; both are in the results table.
