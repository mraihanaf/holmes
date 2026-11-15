# NASA Space Apps 2026 — "Be an Earth System Trend Detective!"

> Research dossier for the Jakarta team. Prepared 2026-11-14.
> Challenge page: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
> Video: https://www.youtube.com/watch?v=Cd9Q48LhNbo ("2026 Challenge | Be an Earth Systems Trend Detective!")

## 1. At a glance

| Field | Value |
|---|---|
| Challenge | Be an Earth System Trend Detective! |
| Event | 2026 NASA Space Apps Challenge |
| Difficulty | Advanced |
| Subjects | Earth Science, Software |
| Core task | Build a tool that selects Earth-science variables, visualizes how they change over time for a chosen region, and tests whether the change is a statistically significant trend. |
| Minimum NASA data requirement | At least one NASA resource from the challenge Resources tab is required for global awards. |
| Video presenter | Dr. James Acker (NASA Goddard Space Flight Center; oceanographer) |
| Video length | 5 min 26 s |

**One-line pitch:** A "trend detective" app that lets a non-specialist pick an Earth variable, draw or choose a region, pull a multi-decade time series, see the trend, and learn whether it is statistically significant.

## 2. The problem (challenge text, condensed)

Change is always occurring in the Earth's interconnected environmental system. When a measured variable moves consistently in one direction — rising or falling, increasing or decreasing, thickening or thinning — it shows a **trend**.

Two things make this hard:

1. **Too many variables.** NASA and partner missions measure hundreds of variables on land, in the atmosphere, and in the ocean. MERRA-2 and GLDAS models add many more. Users do not know which variables can show change.
2. **Trends can flip by region.** The same variable can trend up in one region and down in another, even when the same process drives both. Most trends are not global.

The work has two parts: (a) finding variables that are trending, and (b) analyzing trends in particular regions of land, ocean, or atmosphere levels. Finding, analyzing, and relating significant trends to the processes causing them is one of the most important uses of NASA Earth science data.

## 3. Objectives — what a successful response must do

The challenge page lists four elements; the video condenses them into five user steps.

**Page wording:**
1. Identify Earth science variables of interest that can be investigated for potential trends.
2. Acquire the data variables for a particular region (most trends are regional, though some are global).
3. Generate and visualize a time series for the variable and region over a long enough period for statistical analysis.
4. Perform a basic statistical analysis of that time series: rate of change over time, and a significance test (t-test, Mann-Kendall, or confidence intervals).

The page notes: data sites already generate time series, and statistical packages already do significance testing. **A response that does both the visualization and the analysis meets the full scope.**

**Video's five steps (the app should do all five):**
1. Decide on the data variable(s) for analysis.
2. Choose a region for the analysis (could be the whole world).
3. Select the time period for the time series.
4. Create and explore the time series — does it appear to have a trend?
5. Analyze the trend for significance.

## 4. Potential considerations (optional, from the page)

### Audience
- High school and college students, plus members of the public with some scientific background.
- Provide **simple definitions** of variables. This helps users a lot.
- The concept: help users become **data detectives** — find a variable, decide whether it trends, and whether the trend is significant.

### Approach
- A short series of questions about *what* and *where* the user wants to investigate can drive variable search.
- Provide a couple of **demonstration examples** the user can watch to understand how the tool works.
- Optional: use AI to suggest data with trend potential for a region, drawing on news/research or region characteristics (desert, rainforest, tidal estuary, atmosphere above a big city).

### Working with the data
- Earth science data comes at hourly, 3-hourly, daily, and monthly resolutions. **Daily and monthly are easiest** for this challenge.
- A trend is interesting even if it is not significant. Sometimes a trend only needs a longer record to become significant.
- Consider existing public tools such as CUAHSI for hydrological plotting.
- Trend analysis can be complex: trends may be non-linear and may only appear after removing regular cycles (e.g., seasonal cycle). **Detecting and analyzing linear trends is a great start**; more complex analyses are beyond the envisioned scope.

## 5. Official Resources tab — complete list

Source: challenge page `?tab=resources`. NASA does not endorse non-U.S. Government sites; participants must comply with each site's data-use terms.

### NASA data & resources

| Resource | Link | What it gives you |
|---|---|---|
| **Giovanni** | https://giovanni.gsfc.nasa.gov/ | Versatile tool with menus of numerous data variables; generates time series and downloads time-series data. This is the tool used in the challenge video for the Wisconsin AOD example. **Full functionality and downloads require Earthdata Login** (guest mode is limited). |
| **Hydrology Time Series** | https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series | Generates time series with hydrological data (GES DISC). |
| **AppEEARS** | https://appeears.earthdatacloud.nasa.gov/ | Simple, efficient access to geospatial data from federal archives; includes time-series generation. Good for land variables (MODIS, SMAP, etc.). |
| **NOAA Climate Data Online (CDO)** | https://www.ncei.noaa.gov/cdo-web/ | Free access to NCDC's archive of global historical weather and climate data plus station history; includes a mapping tool. |
| **SeaWiFS chlorophyll time-series article** | https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf | Research article demonstrating time-series creation and significance testing for remotely sensed chlorophyll in river-influenced coastal regions. Useful as a methods example. |

### Space Agency Partner resources

| Resource | Link | What it gives you |
|---|---|---|
| **KNMI Climate Explorer** | https://climexp.knmi.nl/ | Web-based scientific analysis tool to explore, analyze, and visualize climate data from many sources. Strong precedent for the UX. |
| **Statistical test methods to detect trends in time series data** | https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b | Overview article on trend tests. |
| **A Comprehensive Guide to Statistical Significance** | https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance | Guide to significance testing and interpretation. |
| **CSA — RADARSAT Constellation Mission (RCM) data** | https://donnees-data.asc-csa.gc.ca/en/dataset/rcm | Canada's trio of Earth-observation SAR satellites; maritime surveillance, disaster management, ecosystem monitoring. |
| **Geo.ca** | http://geo.ca/ | Canada's open geospatial information source. |
| **CSA — SWOT mission information** | https://www.asc-csa.gc.ca/eng/satellites/swot/ | SWOT measures changes in water surface elevation for lakes, rivers, reservoirs, and oceans over time. |
| **CSA — Monitoring and protecting our ecosystem from space** | https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp | Satellite data for monitoring changes and responsible land/natural-resource use. |
| **CSA — Synthetic Aperture Radar Python tutorial** | https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | Practical Python + QGIS tutorial for accessing and visualizing SAR imagery. |

### Resource availability check (2026-11-14)

Every link in the Resources tab was requested from this network. Status is a snapshot; NASA services can change.

| Resource | HTTP | Notes |
|---|---|---|
| Giovanni | 200 | JS application; menus of variables and time-series export. Full functionality/downloads require Earthdata Login; guest mode is limited. Use it at build time; do not scrape it live. |
| Hydrology Time Series | 200 | GES DISC Angular app. Data access generally requires Earthdata login. |
| AppEEARS | 403 | CloudFront blocked this network; requires Earthdata login. Build-time tool only. |
| NOAA Climate Data Online | 200 | Web portal works; the API returns 400 without a token. Free token signup at `ncdc.noaa.gov/cdo-web/token`. |
| SeaWiFS chlorophyll article | 403 | NTRS PDF blocked direct request from this network; the citation is still a valid methods reference. |
| KNMI Climate Explorer | 200 | Web UI works; no documented public API. Strong UX precedent, not a live data source. |
| Medium trend-test article | 200 | Readable. |
| Statsig significance guide | 200 | Readable. |
| CSA RCM data | 200 | Open data portal works. |
| Geo.ca | 200 | Language-selection page works. |
| CSA SWOT | 200 | Mission page works. |
| CSA ecosystem monitoring | 200 | Article works. |
| CSA SAR Python tutorial | 200 | GitHub repository works. |

**Bottom line:** the only official resource that is both no-login and programmatically reliable is **NASA POWER** (which is not listed on the Resources tab but is a NASA service built on MERRA-2/CERES). The listed portals are excellent build-time sources and citations, but a live demo should not depend on them.

### Datasets named in the challenge text (not all are separate links)

| Dataset / mission | Type | Why it matters for trends |
|---|---|---|
| **MODIS** (Moderate Resolution Imaging Spectroradiometer, Terra/Aqua) | Satellite imager | Aerosol optical depth (AOD), land surface temperature, NDVI/EVI, snow cover, cloud properties. Daily/8-day/monthly products, 2000–present. The video's worked example uses MODIS-Aqua AOD over Wisconsin, monthly, 2002–present. |
| **OMI** (Ozone Monitoring Instrument, Aura) | Satellite spectrometer | Ozone, NO2, SO2, aerosol index, UV radiation. Useful for atmospheric-composition trends. |
| **AIRS** (Atmospheric Infrared Sounder, Aqua) | Satellite sounder | Temperature and humidity profiles, surface temperature, cloud properties, trace gases. |
| **GPM** (Global Precipitation Measurement) | Satellite precipitation | Global precipitation, rain/snow, extremes; monthly products (e.g., IMERG). |
| **MERRA-2** (Modern-Era Retrospective analysis for Research and Applications, Version 2) | Reanalysis model | Long, consistent global record of atmosphere, land, ocean, and aerosol variables; 1980–present. Good for multi-decade trends. NASA POWER exposes MERRA-2 monthly data without login. |
| **GLDAS** (Global Land Data Assimilation System) | Land model/assimilation | Soil moisture, evapotranspiration, runoff, snow, groundwater, land surface temperature. Good for water-cycle trends. |

## 6. The challenge video — what Dr. James Acker says

Watch: https://www.youtube.com/watch?v=Cd9Q48LhNbo. Transcript saved at `_raw/video_transcript.txt`; timestamped at `_raw/video_transcript_timed.txt`.

**Structure and key points:**

- **0:00–0:20 — Intro.** Dr. James Acker, NASA Goddard Space Flight Center, oceanographer, filmed at Crater Lake, Oregon. Invites teams to become "Earth System Trend Detectives."
- **0:20–1:20 — Why trends matter.** Volcanic eruptions can inject sulfur dioxide (OMI image of Kasatochi) and temporarily cool the planet — a cooling trend. NASA data covers many phenomena: regional temperature, cloud cover, solar radiation, snow fall/pack/water content, ocean surface temperature, ocean height, ocean color, soil water storage, precipitation, wind speed, pressure, water vapor, and the timing of seasons.
- **1:20–2:30 — The example.** Central Canada wildfires (including summer 2026) sent smoke across the U.S. Use **Aerosol Optical Depth (AOD)** — how much light transmission is reduced by particles such as smoke. Create a monthly AOD time series from **MODIS on Aqua**, which began observing in 2002, averaged over **Wisconsin**, for every month since observations began. The plot is generated with **Giovanni**.
- **2:30–3:30 — Reading the plot.** The series shows a possible upward trend, but AOD rises in summer (fire/smoke season) and is much lower in winter. The seasonal cycle is visible. "Can you detect a trend?" "Is this a significant trend?"
- **3:30–4:20 — Significance.** Scientific significance means using a statistical test to decide whether the time series meets a significance standard. The simplest approach is the **p-value**. If **p < 0.05**, the series meets the standard — a significant trend. If **p > 0.05**, it does not meet the standard. **That does not mean there is no trend or that it is unimportant**; sometimes a trend only becomes significant with a longer time series.
- **4:20–5:00 — The five app steps.** (1) decide variable(s); (2) choose region; (3) select time period; (4) create and explore the time series — does it look like a trend? (5) analyze significance.
- **5:00–5:26 — Advice.** NASA has a lot of data. The app can work on one type of data (rainfall, soil moisture) or let users choose among several. **Sometimes choosing the data is more complicated than doing the analysis.** Some datasets are hourly or 3-hourly; **weekly or monthly data make trends easier to detect.** "Good luck — I will be very interested to see what trends you discover."

**What the video implies for the build:**
- The demo should show the **Wisconsin AOD** example, or a closely analogous example, because the presenter explicitly walks through it.
- A single-variable app is acceptable; a multi-variable app is more ambitious and more useful.
- The app must make the **seasonal cycle visible** and must not confuse seasonality with a long-term trend.
- A p-value alone is not enough for a good UX: show the fitted trend line, rate of change with units, sample period, and a plain-language significance explanation.

## 7. Judging criteria (from the Jakarta technical meeting)

| Criterion | What judges ask |
|---|---|
| **Impact** | How much impact (quality and quantity) can this project have? Does it solve a big problem or a little problem? Will it inspire or help many, or a few? |
| **Creativity** | How creative/innovative is the approach? Is it novel, or an incremental improvement on something that already exists? |
| **Validity** | Is the solution scientifically valid? Will it do what it sets out to do? Can it work in the real world? |
| **Relevance** | Is this project responsive to the chosen challenge? Is it a complete solution or does it have a long way to go? Is it technically feasible? How usable and user-friendly is it? |
| **Presentation** | How well did the team communicate the project? Were they effective in telling the story: the challenge, the solution, and why it is important? |

## 8. Submission and eligibility (Jakarta technical meeting + challenge rules)

From `2026 Technical Meeting NASA Space Apps Jakarta.pdf` (full text in `_raw/technical_meeting.txt`):

- **Timeline (WIB):** Hackathon start **14 Nov 2026, 00:00**; Pitch Workshop **15 Nov**; deadline **15 Nov 2026, 23:59**; closing/awarding ceremony (virtual) **22 Oct** [as printed in the deck; treat as tentative].
- Teams have only the **two-day event** to complete projects. Judges do **not** expect a fully finished solution. Demonstrate a **solution blueprint** and explain design reasoning even if the build is incomplete.
- Must solve one of the **14 official 2026 challenges**. "Create Your Own Challenge" projects are not eligible for Global Judging.
- **Project demo (required):** choose **one** — a **7-slide presentation** (title slide counts) or a **30-second video**. Upload to a public link (YouTube, Google Drive, GitHub, OneDrive, Dropbox). No password/login. Test in a private browsing window.
- Slide decks and project pages must be in **English**. Videos may be in a native language with English subtitles.
- **Project submission page fields:** project name; high-level summary (50–200 words); one demo link; project details (what it does, how it works, benefits, goals, tools/languages/hardware/software); NASA data used and how; partner data (optional but encouraged); references for every resource, including open-source code, text, and images.
- **Global award eligibility:** at least one **NASA resource from the challenge** must be used. All team members must be registered and identified on the project page. All required fields must be complete. Check the Terms & Conditions and originality/references boxes.
- **AI use:** LLMs, chatbots, image/video generation, foundation models, and coding assistants are permitted. Disclose where and how they were used. Generated images/videos need a visible watermark; generated code/data need acknowledgment in text and metadata. No NASA branding in generated content.
- **Citations:** every source must be cited, even open source. NASA can remove nominations/awards for violations.
- **Demo guidance:** judges look at demos first. Tell a story: introduce yourself/team, name the solution and problem, describe the idea and user experience, show how NASA data made it possible, and paint the future. Use strong visuals and readable text.
- **Uploads:** project page allows JPG/PNG/GIF up to 10 MB; no video/document uploads. Link externally.

## 8.5 Data feasibility — verified on 2026-11-14

These are hands-on results, not assumptions. Raw evidence is in `_raw/` and `assets/`.

### What works without a login

**NASA POWER API** — `https://power.larc.nasa.gov/api/temporal/monthly/point` and `/regional` return monthly CSVs with no authentication. Tested parameters:

| Parameter | Definition | Source |
|---|---|---|
| `AOD_55` | Aerosol Optical Depth at 550 nm (dimensionless) | CERES SYN1deg |
| `T2M` | Temperature at 2 m (°C) | MERRA-2 |
| `PRECTOTCORR` | Corrected precipitation (mm/day) | MERRA-2 |

- Point request example: `?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=106.85&latitude=-6.2&start=2001&end=2025&format=CSV`
- Regional request example: `?parameters=T2M&community=AG&latitude-min=42&latitude-max=44&longitude-min=-90&longitude-max=-88&start=2020&end=2020&format=CSV`
- Response is a header block plus `PARAMETER,YEAR,JAN..DEC,ANN` rows. Missing values are `-999`.
- This is the **fastest, most reliable live path** for the app. It covers temperature, precipitation, aerosol optical depth, and many other MERRA-2/CERES variables.

**ORNL DAAC MODIS REST API** — `https://modis.ornl.gov/rst/api/v1/{product}/subset?...` returned an actual MODIS NDVI value at Jakarta (MOD13Q1, 2024-01-01, raw 2233 × 0.0001 = **0.2233**) **without a login**. This is the only no-login path we found to real MODIS pixel values. Caveats: each subset request is slow (tens of seconds) and limited to about 10 tiles/dates, so use it at build time to cache a few NDVI/LST series; do not call it live. The `/{product}/dates` endpoint is fast and useful for availability checks.

**Verified trend results** (monthly, seasonal cycle removed, Mann-Kendall + Sen's slope; full table in `assets/power_trend_results.csv`):

| Site | Variable | Period | Sen slope | Monthly Mann-Kendall p | Annual-mean MK p | Verdict |
|---|---|---|---|---|---|---|
| Jakarta | AOD_55 | 2001–2025 | **+0.0378 per decade** | **2.2e-16** | 7.8e-05 | Significant increase |
| Jakarta | T2M | 2000–2025 | **+0.214 °C per decade** | **5.5e-12** | 1.5e-04 | Significant warming |
| Jakarta | PRECTOTCORR | 2000–2025 | **+0.795 mm/day per decade** | **1.05e-05** | 0.031 | Significant increase |
| Wisconsin | AOD_55 | 2001–2025 | −0.0100 per decade | 0.0033 | 0.050 | Significant decrease by MK, but **method-dependent** (OLS p=0.056; HAC p=0.128). CERES, not MODIS. |
| Wisconsin | T2M | 2000–2025 | +0.249 °C per decade | 0.101 | 0.378 | Not significant |
| Wisconsin | PRECTOTCORR | 2000–2025 | +0.078 mm/day per decade | 0.392 | 0.724 | Not significant |

The Jakarta results are a strong local story: the city's aerosol load, temperature, and precipitation all show statistically significant upward trends in these NASA products. That is exactly the kind of "what is changing, where, how much, and is it significant" result the challenge asks for.

**Deeper exploration (after the VPN was disabled):** CMR, AppEEARS, Earthdata Cloud, and the Giovanni API became reachable (HTTP 200), but actual data downloads still redirect to Earthdata Login. A 14-parameter POWER scan found **11 of 14 variables significant after FDR in Jakarta, versus 0 of 14 in Wisconsin**. Seasonal fingerprints (Jakarta T2M significant in March and May–August; AOD significant February–August) and a 5×5 Jakarta grid are in `data-exploration-update.md`. This is strong material for a "Trend Radar" and "Season Sleuth" demo.

### What does not work without a login (tested)

> **Network update (15:35 WIB):** the CloudFront 403s below were caused by a VPN/Cloudflare WARP profile. With the VPN off, CMR, AppEEARS, Earthdata Cloud, and the Giovanni API return **HTTP 200**, but actual data downloads still redirect to **Earthdata Login** and require an account/token. See `data-exploration-update.md`.

| Service | Result | Implication |
|---|---|---|
| GES DISC MERRA-2/GLDAS file access | Redirects to Earthdata login (302 → 401) | Needs an Earthdata account; not suitable for a live no-login demo. Pre-download at build time. |
| GES DISC OPeNDAP legacy URL | HTTP 410 (retired) | Do not use old `goldsmr4.../opendap/` links. |
| AppEEARS web/API | 403 was VPN-related; **200 now**, but task endpoints return 403 without a token | Needs Earthdata login; treat as a build-time tool, not a live dependency. |
| NASA CMR search | 403 was VPN-related; **200 now** | Metadata works; granule data links still redirect to Earthdata login. |
| NOAA Climate Data Online API | HTTP 400 "Token parameter is required" | Free token signup; usable but one more dependency. |
| Giovanni | JS-heavy web UI; full functionality requires Earthdata Login; guest mode limited. The cloud `proxy-timeseries` endpoint also redirects to Earthdata Login. | Use it at build time to export CSVs; do not scrape it live during the demo. |

### Recommended data architecture

1. **Live mode:** NASA POWER point/regional API for temperature, precipitation, and AOD at any user-selected place. No login, fast, reliable.
2. **Curated MODIS mode:** pre-fetched ORNL DAAC MOD13Q1 NDVI or MOD11A2 LST for a few places, cached as CSV. This gives a real MODIS variable without a login at runtime. Fetch once; the subset API is slow.
3. **Curated official example:** pre-bundled CSVs for the official Wisconsin AOD example (MODIS/Giovanni) and 2–3 extra cases (e.g., Jakarta AOD/temperature/precip, a not-significant case, an opposite-trends case).
4. **Build-time only:** Giovanni, AppEEARS, GES DISC/GLDAS, NOAA CDO. Export once, validate, commit the CSV, and cite the exact dataset/version.

This gives the best of both worlds: a real live tool for any place, plus guaranteed demo cases that do not depend on a NASA service being up.

**Eligibility caution:** NASA POWER is a NASA service, but the global-award rule says to use at least one NASA resource from the challenge. To be safe, also use and cite a resource explicitly listed on the Resources tab — ideally **Giovanni** for the Wisconsin AOD example, plus **MODIS** as the dataset. Record the exact dataset/version and export date in the references.

## 8.6 Statistical method choices (recommended)

Based on verified library tests and simulations (`_raw/trend-notes.md`; full guide in `trend-analysis-guide.md`):

1. **Default trend estimate:** OLS slope on a **deseasonalized monthly series** (monthly anomalies or month dummies), reported **per decade**, with a 95% confidence interval.
2. **Default significance test:** a **HAC (Newey-West) p-value** for the OLS slope, because monthly Earth data are autocorrelated. `statsmodels.OLS(...).fit(cov_type="HAC", cov_kwds={"maxlags": 12})` works.
3. **Robustness check:** **Sen's slope + Mann-Kendall** (`pymannkendall`). If OLS and Sen/MK disagree, show both and explain. Do not treat MK as a fix for autocorrelation: simulations show both OLS and MK false-positive rates rise sharply with AR(1) autocorrelation (e.g., at φ=0.6, ~30% false positives at a nominal 5%).
4. **Seasonality:** remove it before testing. Month dummies in a regression are cleaner for inference; monthly anomalies are easier to plot and explain. A raw monthly series is dominated by the seasonal cycle, and a naive trend test on it is misleading.
5. **Many pixels/variables:** apply **Benjamini-Hochberg FDR** control. Never present raw pixel-wise p < 0.05 as "the significant area."
6. **Report:** slope + CI + n + period + method + dataset. A badge alone is not enough.
7. **Language:** "not statistically significant" means "not enough evidence at this record length," not "no change." Add a years-of-data-needed estimate when possible.
8. **Power:** short records have low power. At n=10 years, even a trend of 0.20 SD/year has only ~36% power; at n=30, it is essentially certain. This is why the 20+ year NASA records matter.
9. **Method sensitivity is real — show it.** On the POWER AOD sample, Wisconsin is −0.008/decade with OLS p=0.056, HAC p=0.128, Seasonal MK p=0.0015, and Sen p<0.05. The verdict depends on the method. Jakarta is +0.037/decade and significant under every method. This is a great argument for a **"method-dependent" badge** and for showing a robustness table instead of a single p-value. It is also a strong regional sign-flip story: the same variable, opposite signs, different significance behavior.

## 9. What this means for our app (working hypotheses)

**Minimum viable submission:**
1. A variable picker with plain-language definitions (at least 1–3 variables).
2. A region picker (map draw / bounding box / named region) and time-range picker.
3. A time-series chart with monthly/daily data, seasonal cycle visible, fitted linear trend, and units.
4. A significance panel: slope/rate of change, p-value, test name, "significant / not significant" plain-language verdict, and a caveat that non-significance does not mean "no trend."
5. A worked example (Wisconsin AOD) available in one click, so the demo tells the same story as the official video.
6. A methods/limitations note and a references list.

**Differentiators to consider (brainstorm later):**
- Guided "detective" flow: ask what/where, suggest variables and regions.
- Trend map (per-pixel or per-region) rather than only one time series.
- Seasonal decomposition view (raw + deseasonalized + trend).
- Compare regions or periods; show sign flips.
- Export a report/CSV; shareable permalink.
- AI assistant that explains variables and results (must disclose AI use).

**Feasibility risks:**
- NASA Earthdata login is required for many GES DISC/AppEEARS workflows. A live demo that depends on login is risky.
- Giovanni UI is powerful but not a stable public API for a hackathon app; scraping it is fragile.
- Hourly/3-hourly data is heavy. Prefer monthly/daily.
- Global maps are expensive; a point/region time series is much easier.
- Statistical significance with autocorrelated or seasonal data can mislead; state the method and assumptions.

## 10. Open questions for the brainstorming session

1. Which single variable family should be the hero: **aerosol/AOD**, **precipitation**, **soil moisture**, **temperature**, or **ocean color/height**?
2. Do we build a **guided example-first** app (Wisconsin AOD) or a **general variable explorer**?
3. Data path: **pre-bundled CSV** for demo reliability, **NASA POWER API** (no login), **Giovanni export**, or **Earthdata-authenticated subsetting**?
4. How much statistics do we expose: p-value only, or slope + confidence interval + Mann-Kendall + seasonal adjustment?
5. How do we visualize "where it is changing": single region, multi-region comparison, or a trend map?
6. What is the 30-second story and the 7-slide arc?
7. Which NASA resource(s) do we cite to satisfy the global-award requirement?
8. Do we include an AI guide, and how do we disclose it properly?

## 11. Source files in this dossier

- `_raw/challenge_details.txt` — full challenge page text (6.5 KB, saved from the browser)
- `_raw/challenge_resources.txt` — Resources tab text
- `_raw/challenge_links.json` — every link on the challenge Details tab
- `_raw/challenge_resources_links.json` — every link on the Resources tab
- `_raw/video_transcript.txt` — cleaned English auto-caption transcript
- `_raw/video_transcript_timed.txt` — timestamped transcript
- `_raw/technical_meeting.txt` — full text of the Jakarta technical meeting PDF
- `_raw/trend-notes.md` — statistical research notes, simulations, and library verification
- `_raw/data-sources-notes.md` — deep verification log for every data portal (auth, URLs, status)
- `_raw/prior-art-notes.md` — raw prior-art links and evidence
- `assets/video_frames/` — key frames from the official video (AOD plot, p-value slide, five steps, advice)
- `data-resources.md` — deep dive on data access (subagent + verification notes)
- `trend-analysis-guide.md` — statistical methods and code (subagent, 1,700 lines)
- `prior-art-and-ux.md` — prior projects and UX patterns (subagent, 117 KB)
- `data-exploration.md` — hands-on data access and working trend demo (subagent)
- `data-exploration-update.md` — after the VPN was disabled: access status, 14-parameter scan, Jakarta grid, seasonal fingerprints, ORNL MODIS
- `brainstorm-brief.md` — synthesis and product recommendations for the brainstorming session
