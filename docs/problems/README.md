# Research dossier — NASA Space Apps 2026, "Be an Earth System Trend Detective!"

This folder is the team's shared understanding of the challenge. Read this page first, then dive into the linked documents.

## Reading order

1. This page.
2. `earth-system-trend-detective.md` — the challenge in full, plus the video summary and submission rules.
3. `brainstorm-brief.md` — the product synthesis and recommended direction for the brainstorming session.
4. `data-exploration.md` — what data actually works, with verified Jakarta/Wisconsin trends.
5. `data-exploration-update.md` — after the VPN was disabled: new access status, 14-parameter scan, Jakarta grid, seasonal fingerprints.
6. `trend-analysis-guide.md` — how to compute and explain the statistics correctly.
7. `prior-art-and-ux.md` — what 44 competing teams are building, and where the gaps are.
8. `data-resources.md` — every portal, auth requirement, and access status.

## The 60-second brief

NASA wants a tool that helps a non-specialist become an **Earth data trend detective**:

1. Pick an Earth-science variable (temperature, rainfall, aerosol optical depth, soil moisture, ocean color, …).
2. Pick a region (a point, a box, a named place, or the whole world).
3. Pick a time period long enough to analyze.
4. See the time series and explore it.
5. Get a statistical verdict: how fast is it changing, in which direction, and is the trend **significant** (e.g., p < 0.05)?

The challenge is **Advanced**, subjects **Earth Science + Software**, and the official video is presented by **Dr. James Acker** of NASA Goddard. The worked example is **MODIS-Aqua Aerosol Optical Depth over Wisconsin, monthly, 2002–present**, plotted in **Giovanni**. The video's five steps are the product spec in miniature.

**Global-award rule:** use at least one NASA resource from the challenge Resources tab.

## Key facts

| Item | Value |
|---|---|
| Challenge page | https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/ |
| Official video | https://www.youtube.com/watch?v=Cd9Q48LhNbo (5:26) |
| Difficulty | Advanced |
| Subjects | Earth Science, Software |
| Hackathon | 14–15 Nov 2026 (Jakarta local event) |
| Submission | 15 Nov 2026, 23:59 WIB |
| Demo | 7-slide deck **or** 30-second video, one public link |
| Must use | ≥1 NASA resource from the challenge Resources tab (for global awards) |

**Official Space Apps Global Offer (not a NASA resource):** the Meteomatics Weather API is one of the 2026 NASA Space Apps [**Global Offers**](https://www.spaceappschallenge.org/2026/global-offers/) — free access at 1,000 queries/day for the hackathon, with an account valid until 2026-11-22. It adds ERA5 reanalysis from 1940, CHIRPS v3 rainfall from 1981, CAMS air quality from 2015, forecasts, and climate scenarios. See `data-resources.md` §9 and `../scripts/fetch_meteomatics.py`; credentials live in `.env`. It is an official partner offer, but it is **not** a NASA resource from the challenge Resources tab, so it does **not** by itself satisfy the global-award requirement — keep a NASA resource in the project.

## What is in this folder

| File | What it covers |
|---|---|
| `earth-system-trend-detective.md` | **Main dossier.** Full challenge text, objectives, considerations, all official resources, video summary, judging criteria, submission rules, implications, open questions. Start here. |
| `jakarta-technical-meeting.md` | Timeline, submission mechanics, demo rules, judging criteria, eligibility, AI/citation rules from the Jakarta technical meeting deck. |
| `data-resources.md` | Deep dive on every data portal and dataset: access, auth, resolution, variables, fastest path for a 48-hour build. §9 covers the Meteomatics API. *(subagent research)* |
| `trend-analysis-guide.md` | Statistical methods (OLS, Sen's slope, Mann-Kendall, seasonal adjustment), code, pitfalls, and how to explain results. *(subagent research)* |
| `prior-art-and-ux.md` | Prior Space Apps/hackathon projects (44 same-challenge repos found), comparable tools (Giovanni, KNMI, Climate Engine), audience, UX patterns, 7 app concepts, and recommended narrative. |
| `data-exploration.md` | Hands-on test: what actually downloads, exact endpoints, verified Jakarta/Wisconsin trends, a working trend calculation, and a ranked data path. |
| `brainstorm-brief.md` | The synthesis for the brainstorming session: competitive landscape, 5 concept directions, recommended product, MVP scope, 48-hour plan, demo story, open questions. |
| `data-exploration-update.md` | **After the VPN was disabled**: access status, MODIS L3 public plots, 14-parameter POWER trend scan, Jakarta 5×5 grid, and seasonal fingerprints. New demo assets. |
| `jakarta_data_exploration.ipynb` | **Executed notebook** with the Jakarta results: 14-parameter trend table, SNR chart, seasonal fingerprints, geospatial 5×5 grid maps (contextily/Esri), interactive folium map, and the MODIS NDVI sample. |
| `indonesia_wildfire_exploration.ipynb` | **Executed notebook** checking recent Indonesia fires with NASA FIRMS: 5-day detections, province ranking, top clusters, static + interactive maps, and 30-day context. |
| `indonesia-wildfire.md` | Short text summary of the Indonesia fire check, with the top provinces/clusters and caveats. |
| `_raw/` | Raw evidence: challenge page text/HTML, resource links, video transcript, technical meeting text, deep source-verification notes (`data-sources-notes.md`, `trend-notes.md`, `prior-art-notes.md`). |
| `assets/` | CSVs, trend plots, analysis scripts, probe logs, and `video_frames/` key frames from the official video. |

## The official Resources tab at a glance

**NASA:** Giovanni · GES DISC Hydrology Time Series · AppEEARS · NOAA Climate Data Online · SeaWiFS chlorophyll time-series article.
**Partners:** KNMI Climate Explorer · two statistics articles · CSA RADARSAT Constellation Mission · Geo.ca · CSA SWOT · CSA ecosystem monitoring · CSA SAR Python tutorial.

Datasets named in the challenge text: **MODIS, OMI, AIRS, GPM, MERRA-2, GLDAS**.

## Working hypotheses for the brainstorm

- **Hero flow:** variable → region → time range → time series + trend line + significance panel.
- **Hero example:** the official Wisconsin AOD example for continuity, plus a Jakarta case for local relevance. Verified Jakarta trends: AOD +0.0378/decade, T2M +0.214 °C/decade, precipitation +0.795 mm/day/decade, all significant.
- **Reliability:** live NASA POWER (no login, 0.4–1.3 s) + pre-bundled CSVs for demo cases. Giovanni/AppEEARS/GES DISC are build-time tools, not live dependencies. ORNL DAAC MODIS REST is a no-login path to real MODIS NDVI/LST values, but slow; cache it.
- **New evidence:** Jakarta **11 of 14** POWER variables are significant after FDR; Wisconsin **0 of 14**. Seasonal fingerprint: Jakarta T2M significant in March and May–August; AOD significant February–August. See `data-exploration-update.md`.
- **Differentiators:** a guided "Case Files" inquiry flow, a Trend Radar scan, a seasonal/opposite-trends signature view, and a classroom worksheet.
- **Validity:** show slope + CI + n + period + method; remove the seasonal cycle; use HAC standard errors; add a "method-dependent" badge when tests disagree; report that non-significance ≠ no trend. See `trend-analysis-guide.md`.

## Open decisions

See the "Open questions" section at the end of `earth-system-trend-detective.md`.
