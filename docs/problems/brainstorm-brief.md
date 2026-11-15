# Brainstorm brief — Earth System Trend Detective

This is the bridge from research to product decisions. Use it in the brainstorming session.

## 1. What the challenge actually requires

A successful app must do four things (the video turns them into five user steps):

| Requirement | User step | Must-have in the app |
|---|---|---|
| Identify variables | 1 | A variable picker with plain-language names/definitions |
| Acquire data for a region | 2 | A region picker (point, box, named place, or world) |
| Visualize a time series | 3–4 | A time-series chart with units and a meaningful time range |
| Test significance | 5 | Slope/rate of change + p-value (t-test, Mann-Kendall, or CI) + verdict |

The page's own scope note is important: **"A response that does both the visualization and the analysis meets the full scope of this challenge."** A fully general platform is not required. A focused, working tool beats a broad, incomplete one.

## 2. What judges reward (from the Jakarta deck)

- **Impact** — helps many people or solves a big problem; inspires.
- **Creativity** — novel interaction or angle, not another generic dashboard.
- **Validity** — scientifically correct, works in the real world.
- **Relevance** — directly answers the challenge, complete enough, usable.
- **Presentation** — clear story: challenge → solution → why it matters.

For a 48-hour event, the winning combination is usually: **one sharp user journey + real data + a polished demo + an honest limitations note**.

## 2.5 Competitive landscape (researched 14 Nov 2026)

This challenge is **crowded**. A GitHub search for the exact challenge phrase found **44 repositories** already, plus dozens of 2026 demo videos. Many teams are building the same "pick a place, pick a NASA POWER variable, plot it, run Mann-Kendall" dashboard. To stand out, we need a clear product idea, not just more features.

**Table stakes (everyone has them):** map point/polygon, variable picker, date range, monthly/annual chart, seasonal-cycle removal, Mann-Kendall and/or t-test, Theil-Sen slope, plain-language verdict, data-source disclosure.

**What the best 2026 entries do:**
- **Slope and Signal** — 18 variables, raw vs deseasonalized charts, autocorrelation-corrected tests, 5 guided cases including a non-significant case, excellent 7-slide deck.
- **AtmoSpy** — four answer cards (what/where/how much/significant), then-vs-now visual, effect size vs normal variability, spatial grid with uncertainty.
- **TrendLens** — "Trend Radar" ranks every variable by signal-to-noise, per-cell trend map with FDR control, second-opinion tests.
- **NEIA** — one surprising finding: Bangladesh's annual mean hides a September warming signal; 442 Mann-Kendall tests with FDR correction; a Cesium globe and an evidence card.
- **Terra Bangla / My Climate Story** — district-level local relevance, bilingual English/Bangla, classroom mode, teacher lesson plan, low-data mode.

**Where the gap is:**
1. A true **inquiry flow** — most tools are "select dataset → plot." Few make the user form a question, gather evidence, consider an alternative, and file a verdict.
2. **Statistical intuition** — almost no app lets users play with noise, seasonality, and record length to learn why a trend test is needed.
3. **Classroom distribution** — a teacher-ready package is more impactful than another explorer.
4. **Honest uncertainty on maps** — most maps show red/blue trends with no significance encoding.
5. **Mechanism without causation** — a cited "possible explanations" panel, clearly separated from the computed result.
6. **Mobile-first, no-login, low-bandwidth** — many tools are desktop research interfaces.

**Implication:** "Case Files" is the strongest frame, but it must be a real inquiry, not a skin. A second signature view (Trend Radar or Opposite Trends) can provide the wow moment. Do not build 10 features.

## 3. Concept directions

> The prior-art research (`prior-art-and-ux.md`) refined these into four strongest directions: **Case Files** (guided inquiry), **Trend Radar** (scan and rank variables), **Opposite Trends** (same variable, opposite signs), and **Season Sleuth** (annual averages hide the month that changed). The concepts below are the product-level versions.



### A. "Trend Detective" — guided case files (recommended)
**Pitch:** Pick a place, get a set of "cases" (variables) worth investigating, open a case, and see the evidence: time series, trend, and significance verdict.

- **User flow:** search/draw a place → choose a variable card (e.g., "Aerosol optical depth — smoke and dust") → choose time range → see chart with seasonal toggle → read verdict → save/share a case file.
- **Hero demo:** Wisconsin AOD (the official video example), then Jakarta rainfall/temperature.
- **Data:** pre-bundled CSVs from Giovanni/NASA POWER; optional live NASA POWER.
- **MVP:** 2–4 variables, one map, one chart, one stats panel, one example.
- **Why it wins:** literally the challenge's five steps, but with a memorable detective framing and an educational payoff.
- **Risk:** "guided" can feel like a wizard; keep the map and chart central, not buried.

### B. "Significance Scanner" — map-first trend explorer
**Pitch:** Pick a variable, see a map of where it is rising or falling significantly, then click a hotspot for the time series.

- **User flow:** variable → global/regional trend map → click cell/region → time series + stats.
- **Data:** precomputed gridded trends (needs a global monthly dataset; heavier).
- **MVP:** one variable, one region (e.g., Southeast Asia), static trend map + click-to-series.
- **Why it wins:** directly answers "where is it changing" and looks impressive.
- **Risk:** data volume and preprocessing; hard to do live in 48 hours. Could use a precomputed map.

### C. "Season Sleuth" — is summer getting hotter / is the wet season shifting?
**Pitch:** Separate the seasonal cycle from the long-term trend and show how each season is changing.

- **User flow:** place → variable → season selector (annual, DJF, MAM, JJA, SON) → seasonal time series + trend.
- **Data:** monthly NASA POWER temperature/precipitation for any point (no login).
- **MVP:** one variable, four seasons, a few cities.
- **Why it wins:** scientifically interesting, differentiates from generic trend tools, directly addresses the challenge's "remove regular cycles" note.
- **Risk:** narrower story; may need more explanation for a general audience.

### D. "Trend Detective Academy" — learn by solving cases
**Pitch:** A short, game-like investigation for high-school students: read a clue, inspect the data, decide whether the trend is significant, earn a badge.

- **User flow:** case intro → hypothesis → chart exploration → choose the correct verdict → explanation.
- **Data:** 3–5 pre-bundled cases (AOD Wisconsin, rainfall Jakarta, soil moisture, ocean color).
- **MVP:** 3 cases, quiz logic, progress/badges.
- **Why it wins:** strong impact and presentation; very demo-friendly.
- **Risk:** less of a "tool" and more of a lesson; judges may question scientific depth if cases are canned.

### E. "Local Climate Case File" — Jakarta/Indonesia focus
**Pitch:** Investigate the environmental trends that matter to Jakarta: urban heat, rainfall intensity, aerosol/smoke, soil moisture, coastal water.

- **User flow:** choose a local issue → see the relevant variable and region → time series → verdict → "what it means for the city."
- **Data:** NASA POWER (temperature/precip), Giovanni/MODIS AOD, GLDAS soil moisture, ocean color.
- **MVP:** 2–3 local cases + one global example.
- **Why it wins:** relevance and impact for the local judges/audience; strong story.
- **Risk:** local data may be harder; don't overclaim local policy conclusions.

## 4. Recommended direction

**Build "Trend Detective: Case Files" — a guided inquiry app with one signature scan.**

A focused app with three doors:

1. **"Investigate a place I know"** — search/draw a region.
2. **"Solve a case"** — 3–5 curated mysteries (including the official Wisconsin AOD example and a Jakarta case).
3. **"Surprise me"** — a curated place/variable pair with a surprising result.

### The core flow

1. **Ask a question** — the app turns the user's place into a question: "Is Jakarta's air getting cleaner or dirtier?" "Is the rain changing?"
2. **Pick a variable** — 3–4 cards with plain definitions, units, source, period, and "what this can/cannot tell you."
3. **Pick a time period** — default 2000–present; warn if fewer than 10–15 years.
4. **See the evidence** — raw monthly chart, seasonal-cycle toggle, fitted trend line, units.
5. **Read the verdict** — one sentence + four cards: what, where, how much, significant?
6. **File the case** — a shareable case file with chart, verdict, data source, method, and caveats.

### The signature scan (the wow moment)

A **"Trend Radar"** for the chosen place: scan 3–5 NASA POWER variables at once, rank them by signal-to-noise and significance, and show a compact "what is changing here?" board. This directly answers the challenge's "too many variables" problem. Keep it to one screen and 3–5 variables; do not turn it into a 20-variable dashboard.

### The demo story (strong, local, verified)

The verified NASA POWER numbers give us a compelling Jakarta narrative:

- **Jakarta AOD_55:** +0.0378 per decade, Mann-Kendall **p < 0.001** — significantly more aerosol.
- **Jakarta T2M:** +0.214 °C per decade, **p < 0.001** — significant warming.
- **Jakarta PRECTOTCORR:** +0.795 mm/day per decade, **p < 0.001** — significantly more precipitation.
- **Wisconsin AOD_55:** −0.010 per decade, **p = 0.003** (CERES; the official video's MODIS product may differ).
- **Wisconsin T2M:** +0.19 °C per decade, **p = 0.10** — a useful "not significant" case.

This lets the demo say: "The official example is Wisconsin. We built the same workflow, and when we pointed it at Jakarta, we found the city's air, temperature, and rainfall are all changing significantly." That is a memorable, locally relevant story.

### Data plan

- **Live:** NASA POWER point/regional API (no login) for any place. Temperature, precipitation, AOD, and more.
- **Curated MODIS:** pre-fetch ORNL DAAC MOD13Q1 NDVI or MOD11A2 LST for a few places; the API needs no login but is slow and limited to ~10 dates/request. This gives a real MODIS variable without an Earthdata account.
- **Curated official example:** pre-bundled CSVs for the official Wisconsin AOD example and 2–3 extra cases. This guarantees the demo works even if NASA POWER is slow.
- **Independent cross-check (optional):** Meteomatics ERA5 and CHIRPS v3, via the official Space Apps Global Offer account in `.env`; useful for showing that dataset choice can flip a precipitation trend. See `data-resources.md` §9. It is an official partner offer, but not a NASA resource from the challenge Resources tab, so keep a NASA resource in the project for global-award eligibility.
- **Build-time only:** Giovanni, AppEEARS, GES DISC/GLDAS, NOAA CDO. Export once, validate, commit, cite.

### Scope discipline

Do **not** build: user accounts, a global 3D globe, real-time satellite ingestion, 10+ variables, forecasting, or a custom LLM agent. Build the case flow and the scan; polish the demo.

## 4.5 New evidence from the deeper data exploration

After the VPN was disabled, we could reach the metadata portals (CMR, AppEEARS, Earthdata Cloud, Giovanni API), but **data downloads still require Earthdata Login**. The useful new evidence came from NASA POWER:

- **Jakarta multi-parameter scan:** 11 of 14 variables are significant after Benjamini–Hochberg FDR: specific humidity, root-zone and surface soil wetness, AOD, T2M, T2M_MIN, clear-sky and all-sky shortwave, wind speed, land evaporation, and precipitation. The strongest standardized signals are QV2M, GWETROOT, AOD_55, GWETTOP, T2M, and T2M_MIN.
- **Wisconsin multi-parameter scan:** 0 of 14 variables survive FDR. AOD is method-dependent (MK p=0.003, HAC p=0.128, FDR p=0.551); T2M is +0.26 °C/decade but HAC p=0.39. This is the honesty case.
- **Jakarta seasonal fingerprint:** T2M is significant in March and May–August (strongest June/July, ~+0.28–0.29 °C/decade); AOD is significant in February–August (strongest June, ~+0.079/decade), but September–October show no trend. Precipitation has no individual significant month after FDR, even though the annual total is significant.
- **Jakarta 5×5 grid:** all 25 points show significant trends in AOD, T2M, and precipitation, but precipitation ranges from +0.45 to +1.33 mm/day/decade and T2M from +0.18 to +0.25 °C/decade. AOD is blocky because the native product grid is coarse.

**Product implication:** the "Trend Radar" is now a real, evidence-backed demo, not a concept. A single screen can show "11 of 14 variables are changing in Jakarta; 0 of 14 in Wisconsin." The seasonal view gives a second signature moment: "The annual average hides the story — Jakarta's aerosol increase is a February–August story."

**Demo caution:** the 14 variables are physically correlated; FDR is conservative; the result is exploratory, not causal. Say so on the methods slide.

## 5. Minimum viable vs. stretch

**Must ship (MVP):**
- Map/region selection.
- Variable selection (at least AOD + one NASA POWER variable).
- Monthly time series with trend line.
- Significance test with p-value and slope.
- One-click official example.
- Data source/references panel.

**Stretch:**
- Deseasonalized view toggle.
- Compare two regions.
- Trend map for one variable.
- AI explanation of the result (disclosed).
- Export/share case file.
- Guided quiz/educational mode.
- Live NASA POWER API for any point.

**Cut without regret:**
- User accounts.
- Global gridded maps for every variable.
- Real-time satellite ingestion.
- Complex non-linear trend methods.
- Mobile-native app.

## 6. Technical shape (one option)

- **Frontend:** Next.js/React + Tailwind; MapLibre/Leaflet; Plotly or Recharts; deployed on Vercel.
- **Backend:** FastAPI (Python) for stats/data, or Next.js API routes if the team is JS-only.
- **Stats:** `scipy.stats.linregress`, `pymannkendall`, `numpy`; or a small JS implementation of Sen's slope + Mann-Kendall.
- **Data:** CSV/JSON bundle in the repo for demo reliability; optional NASA POWER live fetch.
- **Charts:** show raw monthly data, a 12-month rolling mean, and the fitted trend; allow deseasonalized toggle.
- **Map:** region as a bounding box; compute the average over the box from precomputed gridded data or use a point API.

## 7. 48-hour plan (suggested)

| Block | Work |
|---|---|
| 0–2 h | Lock the concept, variable list, and demo story. Assign data, frontend, stats, narrative. |
| 2–8 h | Data: download/prepare 3–5 CSVs; validate units, dates, missing values; write the stats module. |
| 8–20 h | Frontend shell: map, variable cards, chart, verdict panel; connect to the stats module. |
| 20–28 h | Integrate the official AOD example and Jakarta example; polish empty/loading/error states. |
| 28–36 h | Narrative: 7-slide deck, screenshots, references, limitations; rehearse the 2-minute walkthrough. |
| 36–44 h | Buffer: fix demo bugs, test in a clean browser, record the 30-second video or finalize slides. |
| 44–48 h | Submit early; re-check all fields, links, citations, and eligibility boxes. |

## 8. Demo story (7 slides)

1. **Title** — team name, challenge, one-line pitch.
2. **The problem** — Earth is changing, but non-specialists can't tell a real trend from noise or seasons.
3. **The insight** — NASA already has the data; what's missing is a guided detective workflow.
4. **The product** — map → variable → time series → significance verdict (screenshots).
5. **The science** — how we compute the trend and p-value; why seasonal adjustment matters; caveats.
6. **Impact** — students, journalists, local planners; the Wisconsin AOD and Jakarta examples.
7. **Future + ask** — more variables, live data, local languages; references and AI disclosure.

## 9. Questions for the team

1. Who is our primary user: high-school students, college students, or curious adults?
2. Do we lead with the **official Wisconsin AOD** example or a **Jakarta** example?
3. How many variables can we genuinely support well in 48 hours?
4. Do we want a map-first or wizard-first experience?
5. Is a live API essential, or is a pre-bundled dataset acceptable for the demo?
6. Who owns the 7-slide narrative and the 30-second video?
7. What is our one-sentence "why this matters" for the judges?

## 10. Guardrails

- Cite every dataset, article, library, image, and AI tool in the submission.
- Use at least one NASA resource from the challenge Resources tab.
- State the statistical method and assumptions plainly.
- Do not claim causality from a trend; say "associated with" or "consistent with."
- Do not use NASA branding in generated content.
- Test the demo link in a logged-out browser.
