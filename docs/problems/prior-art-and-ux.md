# Prior Art and UX Research
## Challenge: "Be an Earth System Trend Detective!" — NASA Space Apps 2026

**Prepared:** 14 November 2026
**Scope:** prior art, target audience, judging narrative, comparable public tools, and app concepts.
**Primary sources:** the official 2026 challenge page, the Jakarta 2026 Technical Meeting PDF, 2025/2024 Space Apps winners archives, GitHub, Devpost, YouTube, and live product documentation for Giovanni, KNMI Climate Explorer, Climate Engine, Trends.Earth, Google Earth Engine apps, Our World in Data, NASA Worldview, NASA POWER, and AppEEARS.


### Contents

1. [What the challenge actually asks for](#1-what-the-challenge-actually-asks-for)
2. [Prior art](#2-prior-art)
3. [Target audience and onboarding](#3-target-audience-and-onboarding)
4. [Judging criteria and the 7-slide / 30-second demo](#4-judging-criteria-and-the-7-slide--30-second-demo)
5. [Comparable public tools](#5-comparable-public-tools-interaction-patterns-and-gaps)
6. [App concepts and UX flows](#6-app-concepts-and-ux-flows)
7. [Recommendations](#7-recommendations)
8. [Candidate demo cases](#8-candidate-demo-cases-quick-screening-not-final-validated-results)
9. [Source list and further reading](#9-source-list-and-further-reading)
10. [Bottom line](#10-bottom-line)

---

## Executive summary

1. **The challenge is a workflow, not a chart.** NASA asks for four linked capabilities: identify variables, acquire data for a region, visualize the time series, and test whether the change is statistically significant. A product that stops at "draw a line on a map" does not meet the brief.
2. **This is a crowded 2026 challenge.** A GitHub search for the exact challenge phrase returned 44 repositories on 14 November 2026, and YouTube already hosts dozens of 2026 project demos. Another generic dashboard will not stand out. The competitive baseline is already: click a place, pick a NASA POWER variable, draw a line, run Mann-Kendall and Theil-Sen, print a p-value.
3. **The strongest differentiator is the detective frame, executed as a real inquiry.** Most entries use "detective" as a skin over a dashboard. Very few teach the user to form a question, gather evidence, consider alternatives, and file a verdict. A case-file flow is both more original and a better fit for the stated audience of high-school/college students and scientifically literate public.
4. **The second differentiator is the "many variables" problem.** NASA explicitly says the multitude of variables makes it hard to choose. A one-click regional scan that ranks what is changing, with false-discovery-rate control, answers that pain directly and produces a memorable demo moment.
5. **The third differentiator is spatial and seasonal contrast.** NASA's background says the same variable can trend in opposite directions in different regions, even when one process drives both. A map that finds and explains opposite trends is visually striking, scientifically distinctive, and directly quoted from the challenge.
6. **Statistical honesty wins Validity points.** The strongest 2026 entries remove the seasonal cycle, correct for autocorrelation, report confidence intervals, use Theil-Sen as a robust slope, control false discovery when scanning, show a non-significant case, and validate their code against SciPy/pymannkendall. These are now the credibility bar, not extras.
7. **Most public tools are dataset-first; the gap is question-first.** Giovanni, Climate Engine, KNMI Climate Explorer, and Trends.Earth are powerful but expect users to know which dataset and variable to choose. OWID is polished but curated, not a NASA variable explorer. A guided "what do you want to investigate?" flow fills a real gap.
8. **The audience needs just-in-time explanations, not a statistics course.** Define each variable in one sentence, use a plain-language verdict, disclose the method in an expandable drawer, and teach three concepts interactively: trend vs noise, seasonal cycle, and statistical significance.
9. **The demo is judged before the details.** The Jakarta PDF says demos are often one of the first things global judges look at. A 7-slide deck or 30-second video must lead with one place, one variable, one surprising result, and one honest verdict. Feature lists lose.
10. **The winning product shape is probably one polished flow plus one signature view.** Recommended: a **Case Files** shell (guided investigation), a **Trend Radar** scan (find what is changing), and an **Opposite Trends** view (show where it changes in opposite directions). Build the shell and three cases first; add the scan if time allows.

### Three strongest app directions (detail in Section 7)

| Rank | Direction | One-line pitch | Why it can win |
|---|---|---|---|
| 1 | **Case Files** | "Pick a real Earth mystery, follow the evidence, and file a verdict." | Best audience fit, best story, best 30-second demo; teaches the scientific process rather than exposing a dashboard. |
| 2 | **Trend Radar** | "Click any place and scan NASA variables to see what is changing, how fast, and whether it is real." | Directly solves NASA's "too many variables" problem; produces a strong wow moment; naturally demonstrates multiple-testing correction. |
| 3 | **Opposite Trends** | "See how the same variable can rise in one place and fall in another—and why both can be true." | Directly quotes the challenge background; visually compelling; few competitors execute it well; strong Creativity and Validity story. |

A close fourth is **Season Sleuth** ("annual averages hide the signal; find the month that changed"). It is cheap to build on NASA POWER monthly data and produces a genuinely surprising, teachable result. It can be a signature case inside Case Files.

---

## 1. What the challenge actually asks for

### 1.1 The brief, in NASA's words

The official challenge page states:

> "Change is always occurring in the Earth's interconnected environmental system, and when it runs in a consistent direction – rising or falling, increasing or decreasing, thickening or thinning – measured variables reflect it. But a measured Earth science data variable can trend one way in one region and the opposite way in another, even when the same process drives both. The multitude of Earth science data variables makes it difficult to select variables that could indicate change, and to then perform an analysis on the selected variables. Your challenge is to create a tool that can select variables measured by Earth science missions or produced by Earth science models, visualize how they change over time, and determine what is changing, where it is changing, how much it is changing, and if these changes are what scientists call 'significant.'"

The **Objectives** section names four required elements:

1. Identify Earth science variables of interest that can be investigated for potential trends.
2. Acquire the data variables for a particular region, because most trends are not global.
3. Generate and visualize a time series over a long enough period for statistical analysis.
4. Perform a basic statistical analysis indicating the rate of change and testing significance using methods such as a t-test, the Mann-Kendall test, or confidence intervals.

The page adds: "A response that does both the visualization and the analysis meets the full scope of this challenge."

**Implication:** the minimum viable product is a four-step chain: choose variable → choose region → time series → trend + significance. Every concept in this document must complete that chain.

### 1.2 What NASA says about the audience

The "Potential Considerations" section is unusually explicit about users:

- The likely audience is **high school and college students**, plus **members of the public with some scientific background**.
- **Simple definitions of the variables** would help these users considerably.
- The concept is to help users become **data detectives**: finding variables of interest, then determining whether those variables show a trend and whether the trend is significant.
- A **short series of questions** about what or where the user wants to investigate could drive a search of related variables.
- **A couple of demonstration examples** would help users understand how the tool works.

This is a mandate for onboarding, not a nice-to-have. A variable dropdown with 20 acronyms fails the brief.

### 1.3 What NASA says about the data and method

- Earth science data come at hourly, 3-hourly, daily, and monthly resolutions. **Daily and monthly are easiest** for this challenge.
- A trend is interesting even if it is **not significant**. Sometimes a trend only needs a longer record to become significant.
- **Seasonal cycles** can hide trends; removing them may be necessary.
- **Linear trends are a great start**; non-linear and more complex analyses are beyond the challenge scope.
- Suggested data includes **MODIS, OMI, AIRS, GPM, MERRA-2, GLDAS**, and the challenge Resources tab lists **Giovanni, Hydrology Time Series, AppEEARS, NOAA CDO, KNMI Climate Explorer**, and the SeaWiFS chlorophyll time-series article.

**Implication:** a credible app should use at least one named NASA dataset, state the resolution and period, and show the seasonal-cycle treatment. A tool that only uses a generic "climate API" is weaker on Relevance and Validity.

### 1.4 The competition context

The 2026 hackathon runs **14–15 November 2026**. The Jakarta PDF says teams have only the two-day event, judges do **not** expect a finished solution, and teams should demonstrate a **solution blueprint and the reasoning behind the design** even if the build is incomplete.

The 2025 Space Apps Challenge received **11,500+ submissions** and named 10 global winners. The 2024 edition received **9,900+**. This is a large, competitive field. The 2026 challenge is one of 14 official challenges and is attractive because it can be built with accessible data (NASA POWER) and familiar statistics, which means many teams will attempt it.

**Strategic implication:** do not compete on feature count. Compete on a clear audience, one memorable interaction, and a demonstration that the science is right.

---

## 2. Prior art

### 2.1 How this was researched

- **GitHub:** exact-phrase search for "earth system trend detective", plus topic/tag searches (`spaceapps`, `nasa-space-apps`), Mann-Kendall/Theil-Sen searches, and NDVI/NASA POWER searches. 44 repositories matched the exact challenge phrase on 14 November 2026.
- **Devpost:** project search for Earth observation, climate data, time series, NASA POWER, and related challenge names.
- **Space Apps archives:** 2025 and 2024 global winner pages, team pages, and project descriptions.
- **YouTube:** challenge explainer, 2026 project demos, 2019 Earth Observation projects, and 2024/2025 Earth observation entries. Auto-generated transcripts were used where available.
- **Product documentation:** Giovanni user guide, KNMI Climate Explorer help, Climate Engine web app, Trends.Earth docs, Google Earth Engine app docs, OWID grapher, NASA POWER API docs.

**Caveat:** the 2026 repositories are same-event entries, not settled history. Some were created weeks before the hackathon, some are scaffolds, and some may be demos rather than final submissions. They are still the most relevant prior art because they show what judges are likely to see in this challenge. Quality varies; this document focuses on what each project teaches, not on ranking teams.

### 2.2 The 2026 same-challenge field at a glance

The table lists the most substantial entries found. Star counts are a weak signal and were recorded only as a rough indicator of visibility.

| Project | Link | Stack / data | What it does | Lesson |
|---|---|---|---|---|
| **Slope and Signal** | [repo](https://github.com/seunghyeon1004/slope-and-signal) · [live](https://seunghyeon1004.github.io/slope-and-signal/) | Static JS/TS; NASA POWER monthly; 18 variables, 19 places; custom stats | Pick variable, place, period; raw/monthly, yearly, and deseasonalized charts; least-squares and Mann-Kendall with autocorrelation correction; Theil-Sen; plain-English verdict; 5 guided cases; 7-slide deck | The best presentation benchmark: one question, three inputs, one verdict, honest non-significant case, tested against SciPy/pymannkendall. |
| **AtmoSpy** | [repo](https://github.com/TanvirMahmudTushar/AtmoSpy_Autonomous-Multi-Agent-Discovery-of-Environmental-Change) | Next.js/FastAPI; NASA POWER, MODIS, GPM; agent pipeline | Pixel-art "crew" runs investigations; Discover scans 16 region-variable pairs; finding reports with what/where/how much/significance cards, then-vs-now visual, spatial grid, cited "why" panel | Best product thinking: the four answer cards and effect-size visual are excellent. Risk: agent theater and feature sprawl can bury the science. |
| **TrendLens** | [repo](https://github.com/yashodha7tech/trendlens) | React/TS + Python pipeline; NASA POWER, MODIS tree cover, NOAA GSOM | "Trend Radar" ranks every variable by signal-to-noise; per-cell trend map; corrected Mann-Kendall; second-opinion tests; practice lab; share links | Best "scan" idea: ranking variables is a direct answer to NASA's variable-selection problem. Also shows how dense the feature set can become. |
| **EarthTrend Detective** | [repo](https://github.com/iammalik884/earthtrend-detective) · [live](https://iammalik884.github.io/earthtrend-detective/) | Static HTML/JS; NASA POWER + MODIS NDVI via ORNL DAAC | 20 variables in 6 themes; place-type helper; Variable Scanner; Trend Map; 8 Case Files; Learn & Methods; CSV export; validation against SciPy/pymannkendall | Best feature breadth and case library. The 5-tab structure is a warning: a judge may not know where to start. |
| **Terra Bangla** | [repo](https://github.com/yasar-sys/TERRA_BANGLA-final) · [live](https://terrabangla.yasar.earth/) | React/Three.js; NASA POWER, MODIS, geoBoundaries; cached | 3D globe flies to Bangladesh; all 64 districts; temperature/rain/sunlight/NDVI/LST; Mann-Kendall + Theil-Sen; heatmap; comparison; bilingual English/Bangla; kids' climate game; accessibility | Best local-impact and accessibility story. Shows the power of "your district" and a bilingual interface. |
| **My Climate Story** | [repo](https://github.com/Shafiur0/my-climate-story) · [live](https://my-climate-story.vercel.app) | Static HTML/JS; NASA POWER + GIBS | Four Bangladesh pilot sites; map picker; temperature/rain charts; Evidence Passport; Trend Lab heatmap; quiz; teacher lesson plan; bilingual; low-data mode | Best classroom package. The teacher mode, quiz, and evidence passport are strong Impact differentiators. |
| **Earth System Fingerprints** | [repo](https://github.com/sushmiNeela/FrontierX-Earth-System-Fingerprints) | Streamlit; MODIS LST/NDVI, SMAP soil moisture | Three contrasting regions; multivariate "fingerprint" of LST + NDVI + soil moisture; regional comparison; MK/Sen | Best scientific framing: "same planet, different pathways." A multivariate fingerprint is more original than another single-variable dashboard. |
| **GlobTraceX** | [repo](https://github.com/oceantraceproject-hub/GlobtraceX) · [video](https://www.youtube.com/watch?v=xIbB9IFUlws) | Web app; NASA Earth observation data | Earth → region → variable → time series → trend → evidence; compare two regions; deterministic Mann-Kendall/Theil-Sen; data coverage shown | Best clean narrative. The video is a model of "data to understanding" storytelling. |
| **NEIA (NASA Earth Intelligence Agent)** | [video](https://www.youtube.com/watch?v=3N2vCDW5Buk) | CesiumJS globe; NASA POWER/MERRA-2, GIBS, FIRMS | 25 years, 34 Bangladesh grid cells, 12 months + annual; 442 MK/Sen tests; Benjamini-Hochberg FDR; September warming finding; evidence card; AI agent grounded in computed results | Best single finding and best use of monthly decomposition. "The annual mean showed almost nothing; September did" is a perfect detective story. |
| **ImpactLens** | [repo](https://github.com/INmahi/impactLens-by-team-Meteors) | 3D globe; GRACE, NASA-SSH, JPL sea level, POWER, MODIS | Ice mass, sea level, monsoon rainfall, coastal land change; variable/region/time flow; plain verdict; compare; grounded AI assistant; import CSV; offline; report download | Best "global to local" scope. Also a caution: the feature list is enormous for a 48-hour build. |
| **Earth Pulse** | [repo](https://github.com/cyberhatc/earth-pulse) | React/MapLibre + Python pipeline (planned) | Global trend map, click-to-inspect charts, Opposite Trend Detector, forecasting, anomaly detection, climate twins, ground-truth check | Best idea generator: the "Opposite Trend Detector" and "Earth Memory" are strong concepts, but the repo is concept-heavy and implementation-light. |
| **TerraDetective** | [repo](https://github.com/BELALANSARI07/TerraDetective) | MODIS, GPM IMERG, POWER; STL; MK/Sen; Planetary Computer STAC | 25-year trends; STL seasonal decomposition; Mann-Kendall/Sen; "Student" and "Scientist" modes; regional paradox workbench | Good model for dual-mode UX: plain language by default, full method on demand. |
| **TrendScope** | [repo](https://github.com/lZXGl/trendscope) | Python + static web; MODIS MOD13A3 NDVI via AppEEARS | Nile Delta NDVI trend; data/statistics/web role split; schema-validated results; cached jobs; "Random Region" from pre-analysed areas | Good engineering discipline: shared contracts, schema validation, cache keys. Less user-facing innovation. |
| **AstroLogic MCI** | [repo](https://github.com/TanvirHosenNishat01-blip/AstroLogic-Megacity-Climate-Intelligence) · [video](https://www.youtube.com/watch?v=ifttH-iTz4o) | NASA POWER; MK/Sen; 5 megacity pairs + 64 BD districts | Megacity climate intelligence; 24+ years; 4 persona modes; 6 languages; offline-first | Shows the value of a tight geographic comparison and persona modes. Risk: personas can fragment the experience. |
| **TERRA BANGLA / Terra Earth** | [video](https://www.youtube.com/watch?v=g3T5h9Zs05g) | 3D globe; POWER/MODIS; cached | District-level story, heatmap, comparison, AI explanation that never invents numbers | A polished 240-second narrative. The pitch is a good template for a 30-second cut. |
| **Case Files / SpaceJammers** | [video](https://www.youtube.com/watch?v=JtVXxtEgTTw) | Web app | Detective case framing for the challenge | Confirms that "case files" is an emerging framing; execution and content quality will decide the winner. |

### 2.3 Detailed lessons from the strongest entries

#### Slope and Signal — the presentation and honesty benchmark

- **Flow:** one question ("Is it really changing, or is it just noise?"), then three inputs: variable (18 with plain definitions), place (map or 19 presets), period. One button: Investigate.
- **What makes it credible:** raw monthly chart first, then the same data with the seasonal cycle removed; slope per decade with 95% CI; least-squares t-test adjusted for autocorrelation; Mann-Kendall with Hamed-Rao correction; Theil-Sen as a robust check; "significant" only when both adjusted tests agree; if not significant, an estimate of how many more years of data would be needed.
- **What makes it teachable:** five guided cases, including a non-significant case ("Alps spring snow: not significant yet") and a polar-opposites case. Each case is a story with a verdict, not a feature tour.
- **What makes it win presentation:** the 7-slide deck is a model. Slide 1 has the live verdict screenshot; slide 2 shows the problem with raw vs deseasonalized charts; slide 3 shows the three-question workflow and data provenance; slide 4 shows the statistics table; slide 5 shows opposing trends; slide 6 shows guided cases and validation; slide 7 shows the classroom vision and links.
- **Weaknesses to avoid:** the interface is dense for a first-time user; the mobile experience is secondary; the 5-case library is excellent but the rest of the tool can feel like a form.

#### AtmoSpy — the best "answer card" UX

- **Four answer cards:** What changed? Where? How much? Is it significant? Each card has a one-line answer and a number. This is the clearest mapping of NASA's four questions found in any entry.
- **Then vs now:** a visual metaphor (rain scene, vegetation scene) that changes between the start and end of the record. The size of the change is tied to the effect size, not just the p-value. A caption explains that the scene is drawn from the trend line, not the raw years.
- **Effect size vs normal variability:** a small "how big vs. normal year-to-year swing" strip with a marker. This teaches that statistical significance and practical magnitude are different.
- **Spatial grid:** arrows mark significant cells; arrow size shows magnitude; hatched cells mean "no statistically clear trend." This is better than a simple red/blue map because it encodes uncertainty.
- **"Why it may be happening":** a panel written from cited sources, separate from the computed numbers. Good pattern: the LLM can suggest mechanisms but cannot invent statistics.
- **Risk:** the pixel-art crew and multi-agent pipeline are memorable but can overshadow the science. The app has Discover, Investigate, Globe, Watches, Findings, Learn, and more. A judge may see the show and miss the evidence.

#### TrendLens — the best "what is changing here?" scan

- **Trend Radar:** every variable is tested and ranked by signal-to-noise: how far it moved over its record compared with its normal year-to-year swings. This is a more intuitive ranking than p-value alone.
- **Per-cell map:** the test is run on every grid cell, with Benjamini-Hochberg FDR control. This is the correct way to avoid "1 in 20 by luck" when scanning many cells.
- **Honest verdict format:** fixed-format plain-language verdict, plus second-opinion tests, start-year sensitivity, years-of-data-needed, and a weather-station check.
- **Practice lab:** synthetic data lets users see what a trend looks like when they know the answer. This is a strong onboarding idea.
- **Risk:** the app is dense; a first-time user needs a guided entry point, not a radar screen with 20 variables.

#### NEIA — the best single finding

- **The story:** "Every year, we're told Bangladesh is getting hotter. But when we looked at 25 years of NASA data, the yearly average showed almost nothing. So we asked a different question: what if the heat is hiding in one month?"
- **The method:** 25 years, 34 grid cells, 12 months + annual mean, 442 separate Mann-Kendall/Theil-Sen tests, then Benjamini-Hochberg FDR correction. The annual mean had no significant trend in any cell; September warmed in all 34 cells, 31 after correction; median +0.36°C/decade; Barisal coast +0.40°C/decade, p ≈ 7×10⁻⁵.
- **The product:** a CesiumJS globe, a "climate detective" panel, an evidence card with rate/test/significance, and an agent that flies to the place and answers with the corrected result.
- **Why it works:** one surprising, verifiable finding is more persuasive than ten features. The 30-second version writes itself.
- **Risk:** a single-country story may read as narrow to global judges; frame it as a method that generalizes, with the country as the demo case.

#### Terra Bangla and My Climate Story — the best audience design

- **Terra Bangla:** "every one of Bangladesh's 64 districts can become the starting point of an investigation." A 3D globe flies from the planet to the district. Bilingual English/Bangla, keyboard navigation, 360 px support, reduced motion, and a kids' game. The AI assistant never invents numbers; it explains and suggests follow-ups.
- **My Climate Story:** four pilot sites, an "Evidence Passport" behind every number, a 4×12 Trend Lab heatmap, a six-question quiz, a teacher comparison-table builder, a 3×45-minute lesson plan, print/PDF, English/Bangla, and a low-data mode.
- **Lesson:** local relevance and classroom usability are stronger Impact stories than a global 3D globe with no named user. The best entry may be the one a teacher can actually use on Monday.

#### Earth System Fingerprints — the best scientific framing

- **Concept:** instead of one variable, combine land surface temperature, NDVI, and soil moisture into a multivariate "fingerprint" for three contrasting regions (Bangladesh, Indo-Gangetic Plain, Amazon frontier).
- **Why it works:** it directly addresses "environmental changes rarely occur in isolation" and gives the user a pattern, not a single line.
- **Risk:** a fingerprint is harder to explain than a trend; it needs a strong visual and a plain-language legend.

#### GlobTraceX — the best narrative discipline

- **Structure:** Earth → region → variable → time series → trend → evidence. The video repeats this chain and never wanders.
- **Proof:** deterministic Mann-Kendall and Theil-Sen, uncertainty and data coverage shown wherever applicable, compare two regions side by side.
- **Lesson:** a simple chain, repeated in the UI and the pitch, is more memorable than a long feature list.

### 2.4 Earlier Space Apps and other hackathon projects

These are useful because they show which Earth-observation ideas have won before, and which presentation patterns persist across years.

| Year | Project | Link | What it did | Lesson |
|---|---|---|---|---|
| 2019 | **WaterMatters** | [YouTube](https://www.youtube.com/watch?v=LE8i8oeTLXM) | Interactive map of sea-level rise; user can change the annual increase and see the world map change; local People's Choice and Global Nomination | One interactive lever + a personal place is memorable. A 33-second video can be enough. |
| 2019 | **airsat** | [YouTube](https://www.youtube.com/watch?v=TsFtGYooGm4) | Satellite-derived air quality map plus citizen reports and photos; "surface-to-air quality mission" | Combining top-down satellite data with ground truth builds trust and local relevance. |
| 2019 | **AEDES** | [YouTube news segment](https://www.youtube.com/watch?v=UTAar03Sa2g) | Dengue early-warning system using Earth observation data; 2019 global winner | A local public-health decision is a strong Impact story. |
| 2024 | **AsturExplorers** | [team page](https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/asturexplorers/) | Landsat Surface Reflectance comparison: define a target location, get Landsat overpass notifications, access and display the matching SR data; Global Winner, Best Mission Concept | A specific workflow with a clear user (field scientist/student) beats a general-purpose dashboard. |
| 2024 | **GaamaRamma** | [team page](https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/gaamaramma/) | Earth observation for agricultural decision-making; Global Winner, Best Use of Data | Action-oriented framing ("what should I do?") is judged as Impact. |
| 2024 | **NVS-knot** | [team page](https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/nvs-knot/) | SMAP surface soil moisture + OpenET evapotranspiration for planting conditions; Global Winner, Galactic Impact | Combining two datasets to answer one concrete question is stronger than one dataset with many charts. |
| 2024 | **TerraTales** | [team page](https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/terratales/) | Climate storytelling; Global Winner, Best Use of Storytelling | Narrative and visual craft are scored, not just data. |
| 2025 | **QUEÑARIS** | [team page](https://www.spaceappschallenge.org/2025/find-a-team/watana-project/) | BloomWatch: Earth observation for global flowering phenology; Global Winner, Local Impact | A visible seasonal phenomenon + local species + reforestation decision is a strong, concrete story. |
| 2025 | **ClimaLens** | [YouTube](https://www.youtube.com/watch?v=oGYux-d5ZTM) | 45 years of MERRA-2/HYCOM; location-based likelihood of extreme heat, cold, rain, wind; global map and probability charts | Long records + "what does this mean for this place/date?" is a strong public-facing frame. |
| 2025 | **BloomWatch / Bloomee** | [repo](https://github.com/bloomee-app/bloomee-web) | 3D globe, time-series NDVI maps, AI assistant for flowering phenology | The 2025 BloomWatch challenge produced a cluster of impressive Earth-observation apps; phenology is a good "visible" variable. |
| 2026 | **ChronoWeather** (other hackathon) | [Devpost](https://devpost.com/software/chronoweather) | Climate-analog forecasting: match current conditions to a historical "twin year" using Giovanni, MERRA-2, GPM; 7-day narrative | The "analog year" idea is creative and easy to explain; it shows the value of a single memorable metaphor. |
| 2026 | **AgriSense** (other hackathon) | [Devpost](https://devpost.com/software/agrisense-hst54k) | Draw an area; combine satellite imagery, weather, soil, crop suitability; AI analysis | Map-first workspace + multi-source evidence is a strong pattern for place-based questions. |
| 2026 | **EarthScope** | [YouTube](https://www.youtube.com/watch?v=REyTSsFwvOY) | Global climate shifts, ice coverage and temperature trends from 1981; live demo | "Ice + temperature" is an intuitive global story, but it risks being another global dashboard. |
| 2026 | **Earth Case Files** | [YouTube](https://www.youtube.com/watch?v=FmtnRkGppiE) | Pick any location, 35 years of temperature/rain/sunlight/humidity, historical imagery, comparisons; NASA POWER/GIBS/EPIC | Confirms "case files" is a popular 2026 framing; the differentiator will be the quality of the cases and the verdict. |

### 2.5 What worked across projects

1. **A single question and a single place.** The best demos start with "Is X changing in Y?" not "Here is a tool with 20 variables."
2. **A three-step flow.** Choose what → choose where/when → see the verdict. Anything longer loses the audience.
3. **A visual proof of change.** Raw monthly wiggle vs deseasonalized trend, then-vs-now imagery, a map with significant cells, or a before/after slider.
4. **A plain-language verdict with the number.** "Rose by +0.39°C per decade; 95% CI +0.25 to +0.47; Mann-Kendall p < 0.0001" is understandable when it is one sentence, not a table.
5. **Honesty as a feature.** Showing a non-significant case, "the data cannot tell yet," "about 2 more years would be needed," and "this does not tell you why" builds trust with judges and users.
6. **A named dataset and a method.** NASA POWER/MERRA-2, MODIS, GPM, GRACE, etc., plus MK/Sen/t-test/CI. Generic "climate data" loses Validity points.
7. **A local or classroom story.** District-level, school-level, or "your hometown" framing beats a global map with no user.
8. **A polished deck/video.** The best projects start the demo early, use real screenshots, and tell a story in seven slides or 30 seconds.
9. **Caching and fallbacks.** The strongest demos use precomputed data or saved API responses so the live demo does not depend on a slow NASA service.
10. **A distinct visual identity.** Pixel art, a 3D globe, a case board, a dark "detective" theme — a memorable look helps judges remember the project.

### 2.6 What did not work, or what to avoid

1. **Feature sprawl.** Apps with 10–15 features (forecasting, anomaly detection, climate twins, citizen reports, AI agents, watches, import/export) rarely demo well. Judges remember one thing.
2. **Dashboard-first onboarding.** A wall of variable dropdowns, date pickers, and map controls is the opposite of "help users become data detectives."
3. **3D for its own sake.** A globe that spins slowly and hides the chart costs demo seconds and can obscure the science.
4. **AI that computes or invents numbers.** Several entries use an LLM to "explain" results. The credible ones constrain it to the app's own statistics and label it clearly. The weak ones let it generate numbers or causes.
5. **Significance confusion.** Saying "significant" without saying "statistically significant at the 5% level" invites misinterpretation. Saying "no trend" when the result is "not significant" is wrong.
6. **Ignoring seasonality and autocorrelation.** Annual means can hide opposite monthly trends; naive tests overstate significance on serially correlated series.
7. **No data provenance.** A chart with no dataset name, version, period, resolution, or missing-data note is not scientifically valid.
8. **Live API dependency on stage.** A demo that fails because NASA POWER or AppEEARS is slow is a Presentation failure. Cache the demo cases.
9. **Desktop-only or login-walled.** Climate Engine itself says it is not meant for small screens. A student audience needs mobile and no login.
10. **"Detective" as a skin, not a process.** A magnifying-glass icon and a dark theme do not make an inquiry. The user must actually gather evidence and reach a verdict.

### 2.7 Competitive implications

**Table stakes (necessary, not differentiating):**

- Map point/polygon selection.
- Variable picker with plain definitions.
- Date range with sensible defaults.
- Monthly and annual time series.
- Seasonal-cycle removal.
- Mann-Kendall and/or t-test with a p-value.
- Theil-Sen slope with a confidence interval.
- A plain-language verdict.
- Data source and method disclosure.
- A shareable result or URL.

**Emerging differentiators (seen in a few entries, still rare):**

- Multi-variable scan and ranking with FDR control.
- Opposite-trends detection and side-by-side comparison.
- Monthly/seasonal decomposition that reveals hidden signals.
- Guided cases with different outcomes, including non-significant.
- "Years of data needed for significance" and power warnings.
- Classroom mode, teacher guide, worksheet, quiz.
- Bilingual/local language and low-bandwidth mode.
- Accessibility: keyboard, screen reader, colorblind-safe, table view.
- Reproducible evidence card / CSV / report export.
- A named, memorable interaction (case file, radar, time machine).

**Open gaps a hackathon app can fill:**

1. **A true inquiry flow.** Most tools are "select dataset → plot." A case-file flow that asks the user to commit to a question, gather evidence, consider an alternative, and file a verdict is rare.
2. **Statistical intuition building.** Almost no app lets the user play with noise, seasonality, and record length to learn why a trend test is needed. A 60-second interactive "trend or noise?" game could be a differentiator.
3. **Classroom distribution.** A teacher-ready package (lesson plan, worksheet, answer key, share links, low bandwidth) is more impactful than another explorer.
4. **Honest uncertainty on the map.** Most maps show red/blue trends with no indication of significance. Arrows/hatching/dot markers that encode significance and magnitude are better.
5. **Mechanism without causation.** A "possible explanations" panel with citations, clearly separated from the computed result, is rare and valuable.
6. **Mobile-first, no-login, low-bandwidth.** Many tools are desktop research interfaces; students in the Global South need a phone-friendly experience.
7. **A reproducible "evidence card."** A one-page, shareable output with claim, data, method, result, uncertainty, and caveat is useful for classrooms, journalism, and science communication.

---

## 3. Target audience and onboarding

### 3.1 Who the challenge names

NASA defines two overlapping audiences:

- **High school and college students.** They can read a line chart and understand "up" and "down." Most have seen averages and percentages. Few have used a p-value, a confidence interval, a null hypothesis, or a seasonal decomposition. They are mobile-first, expect instant feedback, and respond to stories, challenges, and shareable results.
- **Scientifically literate public.** They are comfortable with charts and basic statistics and may read science news. They want sources, methods, uncertainty, and the ability to export or verify. They are less tolerant of gamification that gets in the way of the data.

A third implicit audience is **teachers and informal science educators**, who decide whether a classroom tool gets used. The strongest 2026 entries (My Climate Story, Terra Bangla) designed for this audience explicitly.

### 3.2 What each audience needs

| Need | Student | Scientifically literate public | Teacher |
|---|---|---|---|
| A reason to care | A local place, a mystery, a challenge, a score | A timely claim, a place they know, a source they can trust | A curriculum link and a 45-minute plan |
| A way in | "Pick a place" or "pick a case" | Search, compare, or browse indicators | A ready-made case and worksheet |
| Vocabulary | One-sentence definitions, hover/tap | Definitions, units, resolution, source | Definitions plus background notes |
| Statistics | Plain verdict, visual intuition, "show me why" | Method, n, test, CI, p, caveats | Answer key and discussion prompts |
| Output | A shareable card or badge | CSV, PNG, citation, reproducible method | Printable worksheet, class board |
| Trust | "This is real NASA data" | Provenance, validation, limitations | Sources and answer key |
| Access | Phone, no login, low data | Desktop, export, keyboard | Projector, print, low bandwidth |

### 3.3 What the audience likely knows — and what it likely does not

**Likely known:**

- A line can go up or down.
- An average summarizes many values.
- A map can show where something is.
- "Climate" is long-term; "weather" is short-term.
- Some places are hotter, colder, wetter, or drier than others.

**Likely not known, or commonly misunderstood:**

| Misconception | Why it matters | Design response |
|---|---|---|
| "Any upward line is a trend." | Noise can produce a slope. | Show the raw series first, then the fitted trend; explain that a trend is a consistent direction beyond normal variability. |
| "A big change is statistically significant." | Significance depends on noise and record length, not just effect size. | Show effect size and p-value separately; use the "how big vs. normal swings" strip. |
| "'Significant' means important." | Statistical significance is not practical or scientific importance. | Always write "statistically significant" and add "this does not tell you why or whether it matters for people." |
| "No significant trend means no change." | A short or noisy record may be unable to detect a real trend. | Say "the data cannot tell yet"; show the years-of-data-needed estimate. |
| "The global trend applies here." | Local trends can differ in sign and magnitude. | Default to a local map/region; show spatial variation. |
| "Seasonal change is the trend." | The seasonal cycle can dominate a monthly series. | Show raw monthly vs deseasonalized charts side by side. |
| "One month is enough." | Monthly values are noisy; annual or seasonal aggregation may be needed. | Offer monthly, seasonal, and annual views; explain the trade-off. |
| "Correlation proves causation." | A trend in one variable may not cause a trend in another. | Separate "what the data shows" from "possible explanations"; never claim causation. |
| "The start year doesn't matter." | Cherry-picked start/end years can create or hide trends. | Show start-year sensitivity or a default long record; warn about short records. |
| "A map cell is a precise place." | Grid resolution is coarse; a cell may mix urban, water, and land. | Show resolution and a "this is a grid box, not a weather station" caveat. |

### 3.4 The onboarding blueprint

The best onboarding is not a tutorial modal. It is a sequence of small, meaningful choices that get the user to a verdict quickly.

#### Step 0 — Three doors

Instead of a variable dropdown, start with three large entry points:

1. **"Investigate a place I know"** — search or click a map.
2. **"Solve a case"** — 3–5 curated mysteries (e.g., "Is the Sahel getting greener?", "Is the Mediterranean drying?", "Is your city's summer getting hotter?").
3. **"Surprise me"** — a curated place/variable pair with a surprising result.

This gives the user agency and avoids the blank-page problem.

#### Step 1 — Place

- Search by city, region, country, or coordinates; or click/draw on the map.
- Offer place types: city, farmland, forest, desert, coast, mountain, river basin, ice, ocean.
- Show a small "data availability" check: record length, missing months, grid resolution, and whether a trend test is meaningful.
- If the user picks a place with a short record, say so before the analysis, not after.

#### Step 2 — Variable

- Show **variable cards**, not a multi-select list:
  - Name and plain definition.
  - Unit.
  - What it can and cannot tell you.
  - Source and period.
  - "Why it might be changing here" (one sentence, optional).
- Use a **place-type helper**: "You picked a city. These variables are often useful: air temperature, heat index, aerosol optical depth, precipitation."
- Limit the first choice to 3–5 recommended variables; put the full catalog behind "Browse all variables."
- Let the user compare a second variable later, not on the first screen.

#### Step 3 — Time

- Default: **1981–present** for NASA POWER; **2000–present** for MODIS.
- Presets: "Last 30 years," "Since 2000 (satellite era)," "Custom."
- Show the number of years and a warning if fewer than 10–15 years.
- Offer "whole year" vs "season" vs "month" as an analysis choice, with a one-line explanation.

#### Step 4 — Run with a visible method

A short progress narrative builds trust and teaches the method:

1. "Fetching NASA POWER monthly data for 23.8°N, 90.4°E…"
2. "Checking data coverage: 45 years, 540 months, 0 missing."
3. "Removing the seasonal cycle…"
4. "Testing for a trend: Mann-Kendall and Theil-Sen…"
5. "Checking how the result changes with the start year…"
6. "Writing the verdict…"

This is also a demo opportunity: the audience sees that the app is doing real work, not just drawing a line.

#### Step 5 — The verdict

Lead with one sentence, then four cards, then the evidence:

**Verdict sentence:**

> "Air temperature in Seoul rose by about **+0.39°C per decade** between 1981 and 2025. The trend is **statistically significant** at the 5% level (Mann-Kendall p < 0.001; Theil-Sen 95% CI +0.25 to +0.47°C per decade)."

**Four cards:**

- **What:** the variable, in plain language.
- **Where:** the place and the spatial pattern (one point vs a grid).
- **How much:** rate per decade with a confidence interval, plus total change over the record.
- **Is it significant?** the test, p-value, and a plain-language interpretation.

**Then:**

- Chart: raw monthly or annual values, trend line, confidence band, hover/tap details.
- Map: the region and the grid cells used; if a scan, significant vs not.
- "Show the evidence" drawer: dataset, version, period, n, missing values, method, assumptions, caveats.
- "What this does not tell you": one or two sentences.
- Next actions: compare, share, download CSV, try a guided case.

#### Step 6 — Teach the concepts just in time

Instead of a statistics lecture, offer three interactive concept cards the first time they are relevant:

1. **Trend vs noise.** Show a random series with a positive slope; ask "Is this a trend?" Then reveal that it is noise. Repeat with a real trend. This is the single most important intuition.
2. **The seasonal cycle.** Show a raw monthly series with a huge annual wiggle; ask "What is the trend?" Then toggle "remove seasonal cycle" and reveal the underlying trend.
3. **Significance and record length.** Show the same slope with 10, 20, and 40 years of data; show how the p-value and confidence interval change. This teaches why "not significant yet" is not "no change."

These can be 30–60 second interactions, not a course. They are also excellent demo material.

#### Step 7 — Guided cases

Offer 3–5 cases, each with a different outcome:

- **A clear, significant trend.** Example: Seoul air temperature, 1981–2025.
- **A surprising seasonal flip.** Example: Bangladesh annual mean vs January cooling and September warming.
- **Opposite trends in one region.** Example: a West African box with significant wetting and drying cells.
- **A not-significant result.** Example: Seoul annual precipitation, 1981–2025.
- **A short-record case.** Example: 10 years of data with a visible slope but no significance.

Each case should include:
- A one-sentence mystery.
- The place, variable, and period (pre-filled).
- A prediction step ("What do you expect?").
- The evidence and verdict.
- A "what would change your mind?" question.
- A shareable result.

This structure teaches the process, not just the tool.

### 3.5 Explanation patterns that work

#### The one-sentence verdict

Use a fixed template so the result is comparable and easy to read:

> **"[Variable] in [place] [rose/fell] by [rate] per decade between [start] and [end]. The trend is [statistically significant / not statistically significant] at the 5% level ([test], p = [p]; 95% CI [low] to [high])."**

Then add one interpretation sentence:

> "Over the full record, that is about [total change]."

#### The "not significant" sentence

> "The data do not show a statistically significant trend at the 5% level. That does not mean nothing is changing; it means this record cannot separate the change from normal variability. At the current slope and noise, about [N] more years of data would be needed."

This is much better than "no trend."

#### The "significant but small" sentence

> "The trend is statistically significant, but the change is small compared with normal year-to-year swings. Statistical significance is not the same as importance."

#### The spatial sentence

> "Of the [N] grid cells in this region, [X] show a significant increase, [Y] show a significant decrease, and [Z] show no clear trend. The map shows where each pattern occurs."

#### The "why" sentence

> "This tool does not test causes. Possible explanations include [mechanism 1] and [mechanism 2]; these come from published research, not from this analysis."

#### The data-quality sentence

> "This result uses [dataset] at [resolution] from [start] to [end]. [N] months are missing; years with missing months are excluded from annual values. A grid cell is an area average, not a weather station."

### 3.6 Onboarding demos

The challenge explicitly suggests "a couple of demonstration examples." The best format is a **60–90 second guided investigation** that the user can play, pause, and step through:

1. **Hook:** "Is Seoul really getting warmer, or is it just noise?"
2. **Raw data:** show the monthly series; point out the seasonal wiggle.
3. **Remove the seasonal cycle:** show the same data with the cycle removed; the trend appears.
4. **Test:** show the trend line, confidence band, and p-value.
5. **Verdict:** read the one-sentence verdict.
6. **Alternative:** show a place with no significant trend; explain why that is still useful.
7. **Invite:** "Now try your own place."

This demo can also be the 30-second video skeleton.

### 3.7 Classroom mode

If the team wants an Impact story that judges remember, design for a teacher:

- **Teacher landing page:** "Run a 45-minute trend investigation with your class."
- **Learning objectives:** read a time series, distinguish trend from noise, explain statistical significance, use evidence to support a claim.
- **Lesson plan:** 10-minute demo, 20-minute student investigation, 10-minute class discussion, 5-minute exit ticket.
- **Worksheet:** a one-page "detective notebook" with fields for question, place, variable, period, evidence, verdict, and "what would change your mind?"
- **Answer key:** sample answers for 3 cases.
- **Class board:** students submit their verdicts; the teacher sees a map/list of claims.
- **Share link:** each case has a URL; no login; works on a phone; low-data mode.
- **Assessment:** a short quiz with feedback, not a grade.

This is more work than a dashboard, but it is a credible Impact story and a strong differentiator.

### 3.8 Accessibility and low-bandwidth requirements

- Mobile-first layout at 360 px; bottom sheets for controls.
- Keyboard navigation and visible focus states.
- Screen-reader labels for charts; provide a data table alternative.
- Colorblind-safe palette; never use red/green as the only encoding; add arrows/hatching/labels.
- `prefers-reduced-motion` support.
- Low-data mode: no autoplay video, simplified map, cached data, no large imagery.
- Bilingual or local-language option where relevant (English + Bangla, Spanish, French, etc.).
- Print stylesheet for worksheets and evidence cards.

### 3.9 What to put in the first 30 seconds of a first-time user session

1. One sentence: "This tool helps you find out whether a part of Earth is really changing."
2. One example: "For example, is Seoul getting warmer?"
3. One action: "Pick a place, or try a case."
4. One promise: "You will get a plain-language verdict, the evidence behind it, and an honest answer when the data cannot tell."

Do not start with a variable catalog, a login screen, or a 3D globe spinning.

---

## 4. Judging criteria and the 7-slide / 30-second demo

### 4.1 The five criteria, decoded

The Jakarta PDF lists five criteria and defines them as questions. The definitions matter because they tell the team what evidence to put in the demo.

| Criterion | What the judge asks | What to show | Common failure |
|---|---|---|---|
| **Impact** | "How much impact (quality and quantity) can this project have? Does it solve a big problem or a little problem? Will it inspire or help many, or a few?" | A named user and a measurable outcome: "a teacher can run this with 30 students in 45 minutes"; "a student can answer a local claim in 3 minutes"; "a journalist can export an evidence card." | "It helps everyone" or "it raises awareness." Vague impact is no impact. |
| **Creativity** | "How creative/innovative is the approach? Is the project novel and something that hasn't been attempted before, or is it an incremental improvement on something that already exists?" | One memorable interaction or framing that is not just a dashboard: a case file, a trend radar, a seasonal flip, an opposing-trends map. | A magnifying-glass icon on a standard dashboard. Feature sprawl mistaken for creativity. |
| **Validity** | "Is the solution scientifically valid? Will it do what it sets out to do? Can it work in the real world?" | Correct data handling, seasonal removal, autocorrelation-aware tests, confidence intervals, multiple-testing correction, validation against reference implementations, honest caveats. | Naive p-values, "significant" misused, no data provenance, no missing-data handling, a line drawn through noisy data and called a trend. |
| **Relevance** | "Is this project responsive to the challenge for which it was submitted? Is it a complete solution or does it have a long way to go? Is it technically feasible? How usable or user friendly is the solution?" | The full four-step chain: variable → region → time series → trend + significance. A working slice, not a mock. A first-time user can complete the flow. | A beautiful map with no analysis; a statistics engine with no user flow; a concept video with no working app. |
| **Presentation** | "How well did the team communicate their project? Were they effective in telling the story of the project: the challenge, the solution, and why is it important?" | A 7-slide deck or 30-second video that tells one story with real screenshots, a clear verdict, and a credible method. | A feature tour, a slow intro, tiny text, no visual, no user, no "why." |

**Important asymmetry:** Validity and Relevance are pass/fail gates for serious judges; Impact, Creativity, and Presentation decide the winner among valid projects. Do not sacrifice Validity for a prettier demo, and do not sacrifice Presentation for one more feature.

### 4.2 What the Jakarta PDF says about demos

The PDF is explicit:

- A demo is "a high-level summary of the project in the form of a demonstration," either a **7-slide presentation** or a **30-second video presentation**.
- Demos are "often one of the first things that Global Judges look at to determine whether a project deserves additional attention." Start thinking about the demo early.
- For a slide deck: **7 slides maximum**; a title slide counts.
- For a video: **30 seconds or less**.
- Slide decks and projects must be in **English**. Videos can be in a native language with **English subtitles**.
- The deck should include: **team name; team member names; challenge; an image of the project; a description of the user experience; how space agency open data and technology make the solution possible.**
- Visual storytelling matters: strong visuals, readable font size, limited words.
- Only **one** demo link on the submission page.
- Links must be publicly accessible; test with a logged-out browser.
- Do not include images, video, audio, or likeness of persons under 18.
- AI-generated content is permitted, but must be disclosed; generated images/videos need a visible watermark; generated code/data must be acknowledged.

The PDF also gives a potential 30-second video structure:

| Time | Beat | What to say/show |
|---|---|---|
| 0:00 | Introduce yourself | Name and team name. |
| 0:02 | Lead us in | Which Space Apps challenge, and what inspired the team. |
| 0:05 | Name your solution | Title and tagline that catch attention; what problem it solves; what people gain; where the opportunity is. |
| 0:10 | Describe your idea | How it works; show images or a prototype; describe a user's experience; how NASA data made it possible. |
| 0:20 | Look into the future | What the idea could change; what it could do for people, the world, and beyond. |
| 0:30 | End | — |

This is a story arc, not a feature list: **person → challenge → solution → user experience → data → future.**

### 4.3 Recommended 7-slide deck

The deck below maps each slide to the criteria and to the PDF requirements. It assumes a working app and one strong finding.

#### Slide 1 — Title and promise

- **Content:** Project name; one-line pitch; team name and members; challenge name; a real screenshot of the verdict, not a logo collage.
- **Example headline:** "Trend Detective: find out what is changing in your backyard — and whether it is real."
- **Criteria:** Presentation, Relevance.
- **Rule:** The first slide must answer "what is it?" and "why should I care?" in five seconds.

#### Slide 2 — The problem

- **Content:** "Earth data is abundant, but a slope is not a trend." Show a raw monthly chart with a huge seasonal wiggle and a flat annual average. Add three pain points: too many variables, local trends differ, short/noisy records mislead.
- **Criteria:** Impact, Relevance.
- **Rule:** Make the problem visual, not textual. One chart beats three bullets.

#### Slide 3 — The user experience

- **Content:** A 3-step flow: "What do you want to investigate?" → "Where and when?" → "What does the evidence say?" Use three real screenshots with numbered callouts.
- **Criteria:** Relevance, Presentation.
- **Rule:** Show the product doing the job, not a wireframe. If the app is incomplete, show the working slice and label the rest as "next."

#### Slide 4 — How it works and why it is valid

- **Content:** The data chain (NASA POWER/MERRA-2, MODIS, etc.) and the method (seasonal removal, Mann-Kendall, Theil-Sen, confidence interval, autocorrelation correction, FDR if scanning). Include one line on validation against SciPy/pymannkendall.
- **Criteria:** Validity, Relevance.
- **Rule:** A judge should be able to repeat the method from this slide. Name the dataset, period, resolution, and test.

#### Slide 5 — The finding / wow moment

- **Content:** One concrete result with a map and a chart. Best options:
  - **Seasonal flip:** "Bangladesh's annual mean looks flat, but January is cooling and September is warming."
  - **Opposite trends:** "In one 10°×10° West African box, some grid cells are significantly wetter and others significantly drier."
  - **Scan:** "Of 20 variables, three are changing significantly here; the rest are noise."
- **Criteria:** Creativity, Impact, Validity.
- **Rule:** One finding, one place, one number. Do not show three findings.

#### Slide 6 — Honesty and validation

- **Content:** A non-significant case ("the data cannot tell yet"); the years-needed estimate; the validation tests; the caveats ("statistical significance is not importance"; "a grid box is not a weather station"; "this does not test causation").
- **Criteria:** Validity.
- **Rule:** This slide is a trust accelerator. Judges who see a non-significant case believe the significant ones more.

#### Slide 7 — Vision, impact, and links

- **Content:** Classroom mode or another adoption path; what more data/variables would enable; live URL; GitHub; team contact. Required: how NASA data and technology make the solution possible.
- **Criteria:** Impact, Presentation.
- **Rule:** End with a concrete next step, not "thank you." "Try the Seoul case at [URL]" is stronger.

### 4.4 Recommended 30-second video

The PDF's structure can be compressed into a tight script. The goal is one story, one verdict, one proof point.

| Time | Visual | Voiceover / text |
|---|---|---|
| 0:00–0:04 | A student or teacher looking at a phone/laptop; title card appears | "Is my city really getting hotter — or is it just noise?" |
| 0:04–0:08 | Map zooms to Seoul; variable card "Air temperature" | "Trend Detective uses 40 years of NASA data to answer that question for any place on Earth." |
| 0:08–0:14 | Raw monthly chart, huge seasonal wiggle; then toggle "remove seasonal cycle" | "Raw data is dominated by the seasons. Remove the cycle, and the signal appears." |
| 0:14–0:20 | Verdict card: +0.39°C/decade, 95% CI, p-value; map of significant cells | "Seoul is warming by about 0.39 degrees per decade — statistically significant, with the uncertainty shown." |
| 0:20–0:25 | A non-significant case and a "years needed" note | "And when the data can't tell, we say so — and estimate how many more years are needed." |
| 0:25–0:30 | Classroom screen; URL and QR code | "Trend Detective: turn NASA data into evidence students can defend." |

**Rules:**
- No feature list.
- No more than one chart and one map on screen at a time.
- Use real screenshots, not stock imagery.
- Put the URL on screen for at least 3 seconds.
- If the video is in a native language, add English subtitles.
- Do not include anyone under 18.
- Disclose AI assistance in the submission, not necessarily in the video.

### 4.5 Narrative recommendations

#### The one-sentence pitch

Use this formula:

> "For **[audience]** who **[need]**, **[app]** turns **[NASA data]** into **[plain-language verdict]** about **[what/where/how much/significant]**, without **[pain]**."

Examples:

- "For students and teachers, **Trend Detective** turns 40 years of NASA Earth data into a plain-language verdict about what is changing in their backyard — and whether the trend is real."
- "For scientifically literate readers, **Trend Radar** scans 20 NASA variables for any place on Earth and ranks what is actually changing, with false-discovery control."
- "For anyone who has heard a climate claim, **Opposite Trends** shows how the same variable can rise in one place and fall in another — and why both can be true."

#### The demo headline

Use one concrete, surprising result:

- "Bangladesh's annual temperature looks flat. January is cooling, September is warming."
- "In one West African box, half the grid is getting wetter and half is getting drier — both significantly."
- "Seoul is warming by 0.39°C per decade; its rainfall is not changing significantly. The tool tells you which is which."

#### The credibility sentence

> "We use NASA POWER/MERRA-2 monthly data, remove the seasonal cycle, test with Mann-Kendall and Theil-Sen, correct for autocorrelation, and validate our code against SciPy and pymannkendall."

This single sentence covers Validity and Relevance.

#### The honesty sentence

> "When the result is not significant, we say the data cannot tell yet — and estimate how many more years would be needed."

This is the sentence that separates a scientific tool from a chart.

#### The impact sentence

> "A teacher can run this with 30 students in 45 minutes, with no login and no installation, on a phone."

This is the sentence that makes Impact concrete.

### 4.6 Submission page checklist

The Jakarta PDF lists required fields. Build the submission page in parallel with the demo:

- **Project name.**
- **High-level summary (50–200 words):** what you developed, how it addresses the challenge, why it matters.
- **One demo link:** 7-slide deck or 30-second video, publicly accessible, no login.
- **Project details:** what it does, how it works, benefits, goals, tools/languages.
- **NASA data:** which NASA data you used, how, and how it inspired the project. At least one NASA resource from the challenge is required for global awards.
- **Space agency partner data:** optional but encouraged.
- **References:** every dataset, code library, image, and external resource, even if open source.
- **AI disclosure:** where and how LLMs/image generation/code generation were used.
- **Team members:** all registered and identified on the project page.
- **English:** submission page and linked materials; video can be native language with English subtitles.
- **No NASA branding** in generated content; no under-18 likeness; no copyrighted material without permission.

### 4.7 A narrative that connects all five criteria

**Opening:** "A student in Dhaka hears that the city is getting hotter. She opens a chart. The yearly average looks flat. She almost gives up. Then she looks month by month — and finds that January is cooling while September is warming. The average was hiding the story."

This story does five things at once:
- **Impact:** a real student, a real place, a question that matters.
- **Creativity:** the "average hides the story" twist is a memorable detective reveal.
- **Validity:** the finding comes from a statistical test, not a hunch.
- **Relevance:** it directly answers what/where/how much/significant.
- **Presentation:** it is a story with a beginning, a turn, and a verdict.

The rest of the deck is the evidence behind that story.

---

## 5. Comparable public tools: interaction patterns and gaps

### 5.1 NASA Giovanni

**What it is:** a web environment for displaying and analyzing geophysical parameters, with data lineage. It is the closest official tool to the challenge's "select variables, generate a time series, download data" objective.

**Interaction pattern (from the Giovanni 2024.1 user guide):**

1. **Choose a visualization type** from a top menu: time-averaged map, animation, comparison, scatter plot, time series, Hovmöller, cross-section, vertical profile, zonal mean, histogram.
2. **Choose a date range** with drop-down calendars or YYYY-MM-DD entry; monthly products restrict the selector to year/month.
3. **Choose a region of interest** three ways: type west/south/east/north coordinates, drag a bounding box on the interactive map, or select a named shape (countries, lakes, etc.).
4. **Choose variables** by faceted search (measurement categories) or keyword search; multiple variables can be selected.
5. **Plot and replot**; adjust plot options such as a linear regression line.
6. **Download** the plot as PNG and the data as CSV (time series) or netCDF (most other plots).

**Strengths:**

- Deep catalog and data lineage.
- Flexible plot types for many scientific use cases.
- Bookmarkable URLs and a results history.
- CSV/netCDF export.

**Gaps for this challenge:**

- **Dataset-first, not question-first.** The user must know which visualization and variable to choose.
- **No plain-language verdict.** The optional linear regression is explicitly caveated: "This linear regression line does not draw a scientific trend conclusion; users use it with discretion."
- **No significance testing** in the time-series workflow (no Mann-Kendall, no confidence interval for the trend).
- **Earthdata Login** is required for full functionality; guest mode is limited.
- **Desktop, form-heavy UI.** Not designed for high-school students or mobile.

**Lesson:** Giovanni proves the data access is possible; it leaves the interpretation and the audience experience wide open.

### 5.2 KNMI Climate Explorer

**What it is:** a web-based scientific analysis tool with more than 10 TB of climate data and dozens of analysis tools, developed by the Royal Netherlands Meteorological Institute. It covers station temperature and precipitation, pressure and wind, reanalyses, CMIP climate models, and future scenarios.

**Interaction pattern:**

1. **Choose a dataset** from a menu of station, gridded, reanalysis, and model data.
2. **Choose an analysis**: time series, anomaly relative to a reference period, comparison of selected events/periods, trend analysis with significance testing, correlation, etc.
3. **Choose a region/station and period.**
4. **Generate a plot or download the data.**

**Strengths:**

- Research-grade breadth and depth.
- Built-in anomaly calculation and trend analysis with significance.
- Long records and many data sources.
- Free, with a long track record in climate science.

**Gaps:**

- **Dense, menu-driven research interface.** It assumes the user knows which dataset and analysis to choose.
- **Jargon-heavy.** Dataset names, reference periods, and statistical options are not explained for a general audience.
- **No guided narrative or case structure.**
- **Bot verification** can interrupt first use.
- **No modern mobile experience.**

**Lesson:** the statistical machinery is not the hard part; the translation layer is.

### 5.3 Climate Engine

**What it is:** a web app, API, and reports platform for on-demand climate and Earth-observation analysis, backed by Google Earth Engine. It provides access to Landsat, ERA5, drought and rangeland vegetation datasets, and more.

**Interaction pattern (from the live web app):**

1. **Choose a mode:** Build (Map, Graph, Visualization Layer).
2. **Choose a feature type:** point, polygon, custom polygon from a table asset, custom polygon from a shapefile, or administrative/world regions.
3. **Choose variable type, dataset, variable, units, computation resolution, and statistic** (over the day range / region / forecast ensemble).
4. **Choose a time period** (start/end date, year range).
5. **Optional masking:** by value or category, with layers such as ESA WorldCover, National Land Cover Database, etc.
6. **Compute a map** or **compute a time series**; for time series, choose one-variable or two-variable analysis, add multiple regions, and compare year ranges.
7. **Graph options:** scatter, line, spline, bar, stacked area; add statistics such as median, percentile ranges, averages, **linear trend lines (OLS or Sen's slope)** and confidence intervals.
8. **Download:** GeoTIFF, CSV, GeoJSON, KML/KMZ, PDF map image.

**Notable:** the map computation includes a **Mann-Kendall p-value mask** option. This is one of the few public tools that exposes a trend-significance mask directly.

**Strengths:**

- Powerful, credible, and backed by Earth Engine.
- Flexible region selection, including shapefiles.
- Exports in analysis-ready formats.
- Exposes trend statistics (Sen's slope, OLS, Mann-Kendall mask).

**Gaps:**

- **Professional, dataset-first UI.** The user must know which dataset and statistic to choose.
- **Desktop-only by design:** the app itself says it is "not meant to be viewed on small screen sizes."
- **US-centric masking layers** (NLCD, etc.).
- **No plain-language verdict or guided cases.**
- **No classroom or first-time-user onboarding.**

**Lesson:** Climate Engine is the strongest proof that a hackathon app should not try to out-feature a professional platform. It should out-explain it.

### 5.4 Trends.Earth

**What it is:** a free, open-source tool to understand land change, produced by Conservation International, Lund University, and NASA. It supports land degradation and SDG 15.3.1 reporting, UNCCD strategic objectives, land consumption, carbon emissions from deforestation, and carbon sequestration from restoration.

**Interaction pattern:**

1. **Install the QGIS plugin** (or use the browser app, which is still "coming soon" in the docs).
2. **Select an area of interest** (country, region, custom polygon).
3. **Choose indicators** (land productivity, soil organic carbon, land cover, etc.) and epochs.
4. **Compute** the indicators and combine them into a status map.
5. **View summary tables and maps**, then export reports for national reporting.

**Strengths:**

- Scientifically grounded, policy-relevant, and open source.
- Strong for land degradation and SDG reporting.
- Produces maps, tables, and reports, not just charts.

**Gaps:**

- **Heavy setup** (QGIS install, data downloads).
- **Specialized to land degradation/SDG reporting**, not general Earth-system trend exploration.
- **Not a casual or classroom tool.**
- **No question-first flow for students.**

**Lesson:** a hackathon app can win by being the opposite of Trends.Earth: lightweight, browser-based, and question-first, while still being honest about method.

### 5.5 Google Earth Engine apps

**What they are:** dynamic, shareable user interfaces for Earth Engine analyses, accessible via a unique URL without an Earth Engine account. Apps are built with the Earth Engine UI API and published from the Code Editor.

**Typical interaction pattern:**

1. Open a single-purpose app (e.g., Global Forest Change, Global Surface Water).
2. The map is the primary interface; layers are pre-selected.
3. A time slider or date selector changes the layer.
4. Click a pixel or draw an area to inspect values or a time series.
5. A chart or summary panel shows the result.
6. Download/export may be limited or absent.

**Strengths:**

- Extremely fast and scalable for global data.
- No login for viewers.
- A polished single-purpose app can be very compelling.
- The map/time-slider pattern is familiar.

**Gaps:**

- **Each app is bespoke and fixed.** There is no general "pick any variable, place, and period" explorer.
- **Analysis is hidden.** The user sees the output but not the method.
- **No statistical verdict or uncertainty** in most apps.
- **Building a GEE app requires Earth Engine access and JavaScript UI skills**, which is a high barrier in a 48-hour event.
- **Less suitable for a question-first, multi-variable detective tool.**

**Lesson:** GEE apps are a model for a focused, single-purpose experience. A hackathon team can emulate the focus without the platform dependency.

### 5.6 Our World in Data (OWID)

**What it is:** a public data publisher with curated topic pages and interactive "grapher" charts. The climate change topic page includes global temperature anomalies, sea-level rise, sea ice, and ice sheets.

**Interaction pattern:**

1. Browse by topic or search for an indicator.
2. Open a grapher chart: line chart by default; map/table tabs where relevant.
3. Add/remove entities (countries, regions) on multi-entity charts.
4. Adjust the time range; use a timeline scrubber on maps.
5. Read the "About this data" panel: source, processing, last updated, date range, unit.
6. Download CSV or PNG; reuse with citation.

**Strengths:**

- Best-in-class explanatory writing and chart design.
- Clear sourcing and processing notes.
- Consistent visual language across thousands of indicators.
- Familiar, trustworthy, and mobile-friendly.

**Gaps:**

- **Curated indicators, not arbitrary NASA variables.** The user cannot ask for "root-zone soil wetness at this coordinate."
- **No regional trend analysis or significance testing.**
- **No spatial drawing or local investigation.**
- **No classroom case structure** (though the charts are used in teaching).

**Lesson:** OWID is the benchmark for explanation and provenance. A trend detective app should borrow its "About this data" discipline and its plain-language framing.

### 5.7 NASA Worldview

**What it is:** an imagery browsing tool for NASA's near-real-time and historical satellite layers, with a timeline and comparison features.

**Interaction pattern:**

1. Open the map with a default layer.
2. Add/remove layers from a catalog.
3. Move the timeline to a date; animate.
4. Compare two dates or swipe.
5. Download imagery or share a link.

**Strengths:**

- Excellent for visual context and "what did it look like then vs now?"
- No login, fast, global.
- Strong for storytelling and situational awareness.

**Gaps:**

- **No time-series extraction or trend analysis.**
- **No statistics, no verdict.**
- **Layers are imagery, not analysis-ready variables.**

**Lesson:** Worldview is the right partner for the "then vs now" visual, not the analysis engine.

### 5.8 NASA POWER Data Access Viewer and AppEEARS

**NASA POWER** provides solar and meteorological data from satellite observations and models. The Data Access Viewer supports point or regional selection, parameter selection, date range, and CSV/JSON output. The API is free, keyless, and fast for monthly point data.

**AppEEARS** provides analysis-ready samples for MODIS, Landsat, and other products: define an area, choose a product and dates, submit a task, and download GeoTIFF/CSV when processing finishes.

**Strengths:**

- POWER is the fastest path to a real NASA time series for any point on Earth.
- AppEEARS is the right tool for MODIS/Landsat area samples.
- Both have documentation and stable APIs.

**Gaps:**

- **Data access, not analysis.** No trend test, no verdict, no visual story.
- **AppEEARS is asynchronous**; tasks can take minutes to hours.
- **POWER is a gridded reanalysis, not a weather station.** A grid cell can mix land uses and elevations.
- **MODIS APIs throttle**; a 25-year NDVI series for many sites needs chunking and caching.

**Lesson:** use POWER for the live backbone and precompute/cache MODIS for the signature visual. Do not build the demo on an asynchronous service.

### 5.9 Interaction-pattern comparison

| Tool | Entry point | Region selection | Variable selection | Time | Analysis | Output | UX strength | Main gap |
|---|---|---|---|---|---|---|---|---|
| **Giovanni** | Choose plot type | Bbox, map drag, named shape | Faceted/keyword search | Date range | Area-averaged time series, optional regression | PNG, CSV, netCDF | Deep catalog, lineage | Dataset-first; no significance verdict |
| **KNMI Climate Explorer** | Choose dataset | Station/grid/region | Dataset menu | Period | Anomalies, trends, significance | Plots, downloads | Research-grade | Dense, jargon-heavy |
| **Climate Engine** | Build tab | Point/polygon/shapefile/admin | Dataset/variable/statistic | Date range | Sen's slope, OLS, Mann-Kendall mask | GeoTIFF, CSV, GeoJSON, PDF | Powerful, credible | Desktop-only, professional |
| **Trends.Earth** | QGIS plugin | AOI/country/polygon | Land indicators | Epochs | Land degradation/SDG indicators | Maps, tables, reports | Policy-grade | Heavy setup, specialized |
| **GEE apps** | Single app | Map | Fixed layers | Slider/date | Fixed analysis | Map/chart | Fast, focused | Bespoke, not general |
| **OWID** | Topic/chart | Country/world | Curated indicator | Long-run | None/annotations | Chart, CSV, PNG | Explanatory, trustworthy | Curated, no arbitrary NASA data |
| **Worldview** | Map | Map | Imagery layers | Timeline | None | Imagery | Visual context | No analysis |
| **POWER DAV** | Point/region | Point/bbox | Parameter list | Date range | None | CSV/JSON/plots | Fast, keyless | No statistics or story |
| **AppEEARS** | Area sample | Polygon/bbox | Product list | Date range | None | GeoTIFF/CSV | Analysis-ready | Async, no analysis |

### 5.10 What this means for a hackathon app

The public tools leave a clear wedge:

1. **Question-first instead of dataset-first.** Ask "What do you want to investigate?" and recommend variables.
2. **Verdict-first instead of chart-first.** Give the plain-language answer, then the evidence.
3. **Local-first instead of global-first.** Start at a place the user knows; global maps are context, not the product.
4. **Classroom-first instead of researcher-first.** No login, mobile, lesson plan, worksheet, low bandwidth.
5. **Honest-first instead of hype-first.** Show uncertainty, non-significance, data gaps, and "what this does not tell you."
6. **One signature view instead of ten features.** Pick one: case file, radar, opposite trends, or seasonal flip.

The app does not need to out-compute Giovanni or Climate Engine. It needs to out-explain them for a specific audience, and to make the four-step chain feel like an investigation rather than a form.

---

### 5.11 Verified NASA POWER path and the Jakarta/Wisconsin benchmark table

The team's data-explorer work (see `earth-system-trend-detective.md` and `assets/power_trend_results.csv`) verified a no-login NASA POWER path that is fast enough for a live demo:

**Point request (monthly, CSV):**

```
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=AOD_55,T2M,PRECTOTCORR&community=AG&longitude=106.85&latitude=-6.2&start=2001&end=2025&format=CSV
```

**Regional request (monthly, CSV):**

```
https://power.larc.nasa.gov/api/temporal/monthly/regional?parameters=T2M&community=AG&latitude-min=42&latitude-max=44&longitude-min=-90&longitude-max=-88&start=2001&end=2025&format=CSV
```

**Response shape:** a header block, then `PARAMETER,YEAR,JAN..DEC,ANN` rows. Missing values are `-999`. The `ANN` column is the annual value. No authentication is required. Tested parameters:

| Parameter | Definition | Source |
|---|---|---|
| `AOD_55` | Aerosol Optical Depth at 550 nm (dimensionless) | CERES SYN1deg |
| `T2M` | Temperature at 2 m (°C) | MERRA-2 |
| `PRECTOTCORR` | Corrected precipitation (mm/day) | MERRA-2 |

**Verified benchmark trends** (monthly, seasonal cycle removed, Mann-Kendall + Sen's slope):

| Site | Variable | Period | Slope per decade | Mann-Kendall p | Verdict |
|---|---|---|---|---|---|
| Jakarta | AOD_55 | 2001–2025 | **+0.0378 per decade** | **< 0.001** | Significant increase |
| Jakarta | T2M | 2000–2025 | **+0.214 °C per decade** | **< 0.001** | Significant warming |
| Jakarta | PRECTOTCORR | 2000–2025 | **+0.795 mm/day per decade** | **< 0.001** | Significant increase |
| Wisconsin | AOD_55 | 2001–2025 | −0.010 per decade | 0.003 | Significant decrease (CERES; the official video uses MODIS, which can differ) |
| Wisconsin | T2M | 2000–2025 | +0.19 °C per decade | 0.10 | Not significant |
| Wisconsin | PRECTOTCORR | 2000–2025 | +0.046 mm/day per decade | 0.39 | Not significant |

**Slope note:** the team table reports Sen's slope for Jakarta AOD and Wisconsin AOD, and OLS slope for the other rows; `assets/power_trend_results.csv` contains both. Use one method consistently in the app and label it in the UI.

**Why this matters for the product:**

- Jakarta gives a **local, all-three-variables** story: aerosol, temperature, and rainfall are all changing significantly. This is a strong demo for a Jakarta team and a strong "what/where/how much/significant" answer.
- Wisconsin gives the **official-video continuity** story: the challenge video walks through MODIS-Aqua AOD over Wisconsin in Giovanni. Reproducing that workflow builds immediate Relevance with judges who know the video. It also gives a **non-significant** case (Wisconsin T2M p = 0.10; precipitation p = 0.39), which is essential for the honesty slide.
- The same POWER path covers both sites, so the app can demonstrate a general workflow, not a one-off.

**Caveats:**

- POWER `AOD_55` is CERES SYN1deg, not the MODIS-Aqua AOD used in the official Giovanni example. The sign and significance can differ. Label the dataset precisely; do not claim it is the same product.
- These are screening results, not a peer-reviewed analysis. The app should show the method and the uncertainty, and a domain expert should sanity-check any headline claim.
- The official example is a **monthly AOD series with a strong seasonal cycle**. The app must show the raw series and the deseasonalized series, or the user will not understand the trend.

**Recommended demo pairing:**

1. **Official continuity:** "This is the Wisconsin AOD example from the challenge video, reproduced live in our app."
2. **Local relevance:** "Now we point the same workflow at Jakarta. Aerosol, temperature, and rainfall all show significant trends."
3. **Honesty:** "Wisconsin temperature and rainfall do not show significant trends in this record. The app says so, and explains what that means."

This three-beat sequence is stronger than either site alone: it proves the workflow generalizes, connects to the official example, and demonstrates scientific honesty.

---


## 6. App concepts and UX flows

The concepts below are deliberately different in their **entry point** and **signature interaction**, not just their feature list. Each completes the four-step chain required by NASA: variable → region → time series → trend + significance.

### 6.1 Concept summary

| # | Concept | One-line pitch | Target user | Signature interaction | Data/analysis |
|---|---|---|---|---|---|
| 1 | **Case Files** | "Pick a real Earth mystery, follow the evidence, and file a verdict." | High-school/college students, teachers | Case gallery → evidence board → verdict card | Precomputed POWER/MODIS; MK, Sen, CI, seasonal removal |
| 2 | **Trend Radar** | "Click any place and scan NASA variables to see what is changing, how fast, and whether it is real." | Scientifically literate public, students, journalists | One-click scan → ranked list → drill-down | POWER point/regional; MK/Sen; BH FDR |
| 3 | **Opposite Trends** | "See how the same variable can rise in one place and fall in another—and why both can be true." | Students, public, educators | Per-cell trend map → pick two cells → side-by-side | POWER regional grid; per-cell MK/Sen; FDR |
| 4 | **Season Sleuth** | "Annual averages hide the signal. Find the month that changed." | Students, public | 12-month × year heatmap → month drill-down | POWER monthly; seasonal MK; per-month tests; FDR |
| 5 | **Then & Now** | "Drag a timeline and watch your hometown change—then check whether it is a trend or just weather." | General public, museums, classrooms | Year slider + before/after imagery → evidence card | GIBS imagery + POWER; precomputed trends |
| 6 | **Trend Check** | "Paste a climate claim. See what NASA data says—and what it does not." | Scientifically literate public, journalists, students | Claim input → disambiguation → evidence card | POWER/MODIS catalog; MK/Sen; citations |
| 7 | **Classroom Detective** | "A 45-minute investigation lab where every student leaves with a defensible verdict." | Teachers and students | Teacher picks a case → share link → worksheet → class board | Cached POWER cases; MK/Sen; CSV export |

### 6.2 Concept 1 — Case Files

**Pitch:** "Pick a real Earth mystery, follow the evidence, and file a verdict."

**Target user:** high-school/college students and their teachers; also scientifically literate adults who want a guided entry.

**Core interaction:**

1. **Case gallery.** 3–5 cards, each with a question, a place, a variable, and a difficulty label. Examples:
   - "The warming city: Is Seoul really getting hotter?"
   - "The hidden month: Why does Bangladesh's annual temperature look flat?"
   - "The greening Sahel: Is the desert coming back?"
   - "The dry Southwest: Is the Colorado River Basin drying?"
   - "The not-so-obvious trend: Is Seoul's rainfall changing?"
2. **Briefing.** One screen: the question, why it matters, what the user will do, and a prediction ("What do you expect to find?"). The prediction step is important: it creates commitment and makes the reveal memorable.
3. **Evidence board.** Four panels, filled in sequence:
   - **What** — variable card with a plain definition, unit, source, period.
   - **Where** — map with the region and grid cells; hover to see values.
   - **How much** — time series with raw and deseasonalized views, trend line, confidence band.
   - **Is it significant?** — test result, p-value, CI, and a plain-language interpretation.
4. **Verdict.** A one-page "case file" with the verdict sentence, four answer cards, the chart, the map, and "what this does not tell you."
5. **Cross-examination.** One or two questions:
   - "Would a different start year change the conclusion?"
   - "Is the change big compared with normal year-to-year swings?"
   - "What would change your mind?"
6. **File and share.** Save the case to a local "case board," copy a share link, download a PNG/CSV.
7. **Next case.** A recommendation based on what the user just learned.

**Required data/analysis:**

- NASA POWER monthly point/regional data for temperature, precipitation, soil moisture, etc.
- Optional MODIS NDVI/LST for a vegetation or land-surface case.
- Seasonal-cycle removal; annual means; Mann-Kendall with autocorrelation correction; Theil-Sen slope with 95% CI; start-year sensitivity; years-needed estimate.
- Precompute all five cases and cache the API responses.

**Why it fits the challenge:**

- It teaches the process, not just the tool. The user actually does what NASA describes: find a variable, acquire data for a region, visualize, test.
- It gives the 30-second video a natural story: question → surprise → evidence → verdict.
- It gives the 7-slide deck a natural structure: problem → user → flow → method → finding → honesty → vision.
- It is original relative to the dashboard field, and it directly serves the named audience.

**48-hour scope:**

- Build the shell and **three** cases, not five.
- Use POWER point data for two cases and POWER regional data for one.
- Precompute the data and statistics; the app can still show the API request and a "live refresh" button.
- Use a simple SVG chart and a Leaflet/MapLibre map; no 3D globe.
- The "case board" can be localStorage; no accounts.

**Risks and mitigations:**

- **Content risk:** a case may not show a significant trend. Mitigation: choose cases after a quick data screen; include one deliberately non-significant case.
- **Scope risk:** five cases is too many. Mitigation: three polished cases; the gallery can show "coming soon" for the rest.
- **Scientific risk:** a surprising finding may be an artifact. Mitigation: label it as "a candidate finding"; show the data and method; do not claim a cause.

### 6.3 Concept 2 — Trend Radar

**Pitch:** "Click any place on Earth and scan NASA variables to see what is changing, how fast, and whether it is real."

**Target user:** scientifically literate public, students, journalists, and anyone who asks "what is changing here?"

**Core interaction:**

1. **Place.** Search, click, or draw a region (point or small polygon).
2. **Scan.** One button: "Scan this place." The app tests every available variable over the same period.
3. **Rank.** A ranked list of variables by **signal-to-noise** (trend magnitude relative to normal variability), with badges:
   - "Significant increase"
   - "Significant decrease"
   - "No clear trend"
   - "Not enough data"
4. **Drill down.** Click a row to see the time series, map, verdict, and "show the evidence."
5. **Compare.** Add a second place or a second variable; the radar re-ranks.
6. **Share/export.** A share link and a CSV of the scan.

**Required data/analysis:**

- NASA POWER monthly parameters across themes: heat (T2M, T2M_MAX, T2M_MIN, RH2M), water (PRECTOTCORR, QV2M, EVPTRNS?), soil (GWETROOT, GWETTOP), radiation/cloud (ALLSKY_SFC_SW_DWN, CLRSKY_SFC_SW_DWN), wind (WS2M, WS10M).
- Optional MODIS NDVI/LST for vegetation and land surface.
- For each variable: deseasonalize, annualize, Mann-Kendall, Theil-Sen, CI, record-length check.
- Benjamini-Hochberg FDR across all variables and grid cells.
- A "signal-to-noise" score: |Sen slope × record length| / standard deviation of detrended values, or |trend| / CI width. Explain the choice in the method drawer.

**Why it fits the challenge:**

- It directly solves NASA's "multitude of variables" pain.
- It produces a strong demo: "We scanned 20 variables; only three are changing significantly."
- It naturally demonstrates multiple-testing correction, which is a Validity differentiator.

**48-hour scope:**

- Start with 8–12 POWER variables at a point, not 20 variables over a grid.
- Precompute a catalog for 5–10 demo places; live scan for any point if the API responds.
- Use a simple horizontal bar/ranked list, not a radar chart.

**Risks and mitigations:**

- **Multiple testing:** scanning 20 variables inflates false positives. Mitigation: FDR correction and an explicit "we tested N variables" note.
- **Data availability:** some variables have shorter records. Mitigation: show the period and gray out variables with fewer than 15 years.
- **Interpretation:** a high rank does not mean importance. Mitigation: separate "statistical signal" from "practical importance" in the UI.

### 6.4 Concept 3 — Opposite Trends

**Pitch:** "See how the same variable can rise in one place and fall in another—and why both can be true."

**Target user:** students, scientifically literate public, educators; anyone who has heard "the planet is warming" and wonders why their region feels different.

**Core interaction:**

1. **Choose a variable and a region.** Default: precipitation or air temperature over a 10°×10° box.
2. **See the per-cell trend map.** Each grid cell is colored by the sign and magnitude of the trend; significant cells are marked with an arrow or a dot; non-significant cells are hatched or gray.
3. **Pick two cells.** Click cell A and cell B; a side-by-side panel appears:
   - Time series for A and B.
   - Trend, CI, p-value for each.
   - A plain-language contrast: "A is getting wetter by +0.03 mm/day per decade; B is getting drier by -0.03 mm/day per decade; both are significant."
4. **Ask why.** A "possible explanations" panel with 2–3 cited mechanisms (e.g., monsoon shifts, land use, aerosols), clearly labeled as hypotheses, not results.
5. **Zoom out.** A regional summary: how many cells are significantly wetter, drier, or uncertain.
6. **Share.** A split-screen image and a link.

**Required data/analysis:**

- NASA POWER monthly regional endpoint for gridded variables (0.5° × 0.625°). A 10°×10° box is about 300–400 cells; this is manageable.
- Per-cell annual or seasonal series; Mann-Kendall and Theil-Sen; BH FDR across cells.
- Optional MODIS NDVI/LST for a vegetation contrast.
- A basemap with country/state boundaries (Natural Earth or Leaflet).

**Why it fits the challenge:**

- It directly quotes NASA's background: "a measured Earth science data variable can trend one way in one region and the opposite way in another, even when the same process drives both."
- It is visually compelling: a map with red and blue cells, then two charts that diverge.
- It is scientifically distinctive: few entries execute it well.
- It creates a natural "why?" moment without claiming causation.

**48-hour scope:**

- One variable (precipitation) and one region (West Africa or the US Southwest).
- Precompute the grid trends; the app can fetch live if time allows.
- Use a 2D map, not a globe.
- Provide one strong pair of cells and a "find another pair" button.

**Risks and mitigations:**

- **Computational load:** per-cell tests can be slow. Mitigation: precompute; limit the box to 10°×10°; use annual data.
- **Sparse significance:** many cells may be non-significant. Mitigation: show uncertainty honestly; choose a region with a known contrast.
- **Causation:** users may assume the app explains why. Mitigation: separate "what the data shows" from "possible explanations."

### 6.5 Concept 4 — Season Sleuth

**Pitch:** "Annual averages hide the signal. Find the month that changed."

**Target user:** students and scientifically literate public; a strong classroom case.

**Core interaction:**

1. **Place and variable.** Default: Bangladesh or a user-selected place; air temperature or precipitation.
2. **Heatmap.** A 12-month × years heatmap of values or anomalies. The user can see the seasonal cycle and the year-to-year variation.
3. **Scan.** A "test every month" button runs 12 Mann-Kendall/Theil-Sen tests with BH FDR correction.
4. **Reveal.** The months with significant trends are highlighted; the annual mean is shown alongside.
5. **Drill down.** Click a month to see its time series, trend, CI, p-value, and a comparison with the annual mean.
6. **Explain.** A plain-language note: "The annual mean can cancel a warming month and a cooling month. Here, January is cooling and September is warming."
7. **Share.** A "seasonal flip" card.

**Required data/analysis:**

- NASA POWER monthly point/regional data, 1981–present.
- Monthly series for each calendar month; seasonal Mann-Kendall (or per-month MK with FDR); Theil-Sen per month; annual mean for comparison.
- A multiple-testing correction across 12 months (and across cells if regional).

**Why it fits the challenge:**

- It directly addresses the seasonal-cycle consideration in the challenge.
- It produces a surprising, teachable finding that a single annual chart misses.
- It is cheap to build with POWER monthly data and a heatmap.
- It is a strong 30-second demo: "The annual average says nothing. September says everything."

**48-hour scope:**

- One place, one variable, 12 monthly tests.
- A heatmap plus a month drill-down.
- Optional: a regional map of September trends.

**Risks and mitigations:**

- **Multiple testing:** 12 months × many cells inflates false positives. Mitigation: FDR; show raw and corrected results.
- **Physical interpretation:** a monthly trend may be an artifact of data assimilation or land use. Mitigation: label as a data finding; add a caveat; do not claim a cause.
- **Seasonal definition:** "January" vs "DJF" matters. Mitigation: let the user switch between calendar month and meteorological season.

### 6.6 Concept 5 — Then & Now

**Pitch:** "Drag a timeline and watch your hometown change—then check whether it is a trend or just weather."

**Target user:** general public, museums, classrooms, social media.

**Core interaction:**

1. **Search a place.** A map flies to the place.
2. **Before/after.** A split-screen or swipe comparison of satellite imagery (e.g., 2000 vs 2025).
3. **Timeline.** Drag a year slider; the imagery and a small chart update.
4. **Trend check.** A button: "Is this a trend?" Opens an evidence card with the variable, period, trend, CI, and p-value.
5. **Story card.** A shareable image: "My hometown in 2000 vs 2025" plus the verdict.
6. **Explore more.** A "what else changed here?" button leads to Trend Radar.

**Required data/analysis:**

- NASA GIBS imagery tiles (MODIS true color, Blue Marble) for the visual.
- NASA POWER monthly data for the quantitative trend.
- Precomputed trends for a set of demo places; live fetch for others.
- Mann-Kendall/Theil-Sen for the evidence card.

**Why it fits the challenge:**

- It is the lowest-barrier entry point: a place the user knows, a visual change, a simple question.
- It is highly shareable, which supports Impact.
- It can lead the user into the deeper analysis (Trend Radar/Case Files).

**48-hour scope:**

- One imagery layer, one place, one variable.
- Precompute 5–10 "then and now" pairs.
- Use GIBS tiles; no image processing.

**Risks and mitigations:**

- **Imagery is qualitative:** a visual change can be seasonal or due to clouds. Mitigation: pair with a quantitative chart; label the imagery date and compositing period.
- **Bandwidth:** imagery can be heavy. Mitigation: low-data mode; pre-cached thumbnails.
- **Ethical:** do not use "then and now" to imply causation. Mitigation: "what the data shows" vs "what might explain it."

### 6.7 Concept 6 — Trend Check

**Pitch:** "Paste a climate claim. See what NASA data says—and what it does not."

**Target user:** scientifically literate public, journalists, students; a media-literacy tool.

**Core interaction:**

1. **Claim input.** A text box ("Is Dhaka getting hotter?") or a set of suggested claims.
2. **Disambiguation.** The app asks the user to confirm the place, variable, and period. It never silently chooses.
3. **Evidence card.** The same four cards (what/where/how much/significant), plus:
   - "What the claim gets right."
   - "What the claim leaves out."
   - "What would change the verdict."
4. **Sources.** Dataset, method, and 1–2 citations.
5. **Share.** A claim-check card with the verdict and caveats.

**Required data/analysis:**

- A precomputed catalog of common claims/places/variables, plus live POWER for new places.
- MK/Sen/CI; seasonal removal; record-length check.
- An LLM can parse the claim into structured fields (place, variable, period) but **must not compute or state numbers**. The app computes the numbers.
- A citation library for mechanisms.

**Why it fits the challenge:**

- It makes the tool relevant to everyday claims, which supports Impact.
- It teaches media literacy and uncertainty.
- It is a strong differentiator from a generic dashboard.

**48-hour scope:**

- 5–10 precomputed claims; text parsing can be a simple keyword/place matcher, not an LLM.
- One claim-check card template.
- No free-form natural language if time is short.

**Risks and mitigations:**

- **Political framing:** climate claims can be contested. Mitigation: focus on verifiable, place-specific claims; avoid ideology; show the data and caveats.
- **Parsing errors:** a wrong place/variable produces a misleading verdict. Mitigation: require confirmation before analysis.
- **LLM hallucination:** never let the model generate numbers. Mitigation: structured output only; numbers come from the stats engine.

### 6.8 Concept 7 — Classroom Detective

**Pitch:** "A 45-minute investigation lab where every student leaves with a defensible verdict."

**Target user:** high-school/college teachers and their students.

**Core interaction:**

1. **Teacher landing page.** Choose a case, a grade level, and a language; get a share link and a lesson plan.
2. **Student flow.** Open the link (no login) → read the briefing → make a prediction → step through the evidence → write a verdict → answer "what would change your mind?"
3. **Detective notebook.** A one-page worksheet with fields for question, place, variable, period, evidence, verdict, and caveat.
4. **Class board.** Students submit their verdicts; the teacher sees a map/list of claims and can discuss differences.
5. **Exit ticket.** Three questions: What is a trend? What does "statistically significant" mean? What would you need to be more sure?
6. **Answer key.** Sample answers for the teacher.

**Required data/analysis:**

- 3 cached cases with precomputed data and statistics.
- MK/Sen/CI; seasonal removal; one non-significant case.
- CSV/PNG export; print stylesheet.
- No accounts; share links; low-data mode; bilingual option.

**Why it fits the challenge:**

- It is the clearest Impact story: a teacher can use it on Monday.
- It matches the named audience exactly.
- It differentiates from the dashboard field.
- It creates a natural 7-slide narrative: the classroom is the user, the case is the demo, the evidence card is the output.

**48-hour scope:**

- One case, one worksheet, one class board (a simple list).
- A teacher page with a lesson plan and answer key.
- Use cached data; no live API in the classroom flow.

**Risks and mitigations:**

- **Content risk:** a lesson plan takes time. Mitigation: one polished case; reuse the Case Files content.
- **Assessment risk:** don't overclaim learning outcomes. Mitigation: describe it as a pilot; show the exit ticket.
- **Privacy:** no student accounts or personal data. Mitigation: local-only case board; no names required.

### 6.9 How the concepts combine

These are not mutually exclusive. The strongest product is likely:

> **Case Files** as the shell, **Trend Radar** as the "find something to investigate" step, **Opposite Trends** and **Season Sleuth** as signature case views, and **Classroom Detective** as the distribution model.

A minimal build could be:

1. Case Files shell with 3 cases (Seoul warming, Bangladesh seasonal flip, West Africa opposite trends).
2. One Trend Radar scan for any point (8–12 POWER variables).
3. A shareable evidence card and a teacher worksheet.

That is enough to demonstrate the full four-step chain, a signature interaction, and a credible impact story.

---

## 7. Recommendations

### 7.1 Recommended product shape

Build **Case Files** as the product shell, with **Trend Radar** as the discovery step and **one signature contrast view** (Opposite Trends or Season Sleuth) as the memorable finding. Add a one-page **teacher worksheet** and a shareable **evidence card**. This combination is more original than another dashboard, more feasible than a 10-feature platform, and more aligned with the named audience.

**One-sentence product definition:**

> "Trend Detective is a guided investigation tool that turns NASA Earth data into a plain-language verdict about what is changing in a place the user knows — and shows the evidence, the uncertainty, and what the data cannot tell."

**The three strongest directions, in order:**

1. **Case Files** — best audience fit, best story, best 30-second demo. Build 3 cases: a clear warming trend, a seasonal flip, and a non-significant result.
2. **Trend Radar** — best answer to NASA's "too many variables" problem. Scan 8–12 POWER variables at a point, rank by signal-to-noise, correct for multiple testing.
3. **Opposite Trends** — best scientific contrast and visual surprise. Use a 10°×10° box with both significant wetting and drying cells.

**If the team can build only one:** build Case Files with three polished cases and one scan button. It covers the full challenge, the audience, and the demo.

### 7.2 48-hour build plan (suggested)

| Window | Goal | Output |
|---|---|---|
| 0–3 h | Lock the story, the audience, and the three cases. Choose the two demo sites (official Wisconsin + local Jakarta). | One-page product brief and demo script |
| 3–8 h | Data layer: POWER point/regional fetch, CSV parsing, cache for the three cases. Verify missing values and units. | `data/` cache + fetch script |
| 8–14 h | Statistics: seasonal removal, annual/monthly series, Mann-Kendall, Theil-Sen, CI, start-year sensitivity; validate against SciPy/pymannkendall. | `stats` module + tests |
| 14–22 h | Case Files UI: case gallery, briefing, evidence board, verdict card, chart, map. | Working flow for one case |
| 22–28 h | Add the other two cases and the Trend Radar scan. | Full demo flow |
| 28–34 h | Polish: mobile, keyboard, colorblind palette, loading/error/empty states, "show the evidence" drawer. | Demo-ready app |
| 34–40 h | 7-slide deck and 30-second video; record backup; test logged-out links. | Submission assets |
| 40–44 h | Submission page: summary, NASA data, references, AI disclosure; final test. | Submitted project |
| 44–48 h | Buffer: fix the demo, sleep, rehearse. | Calm team |

### 7.3 Demo plan

**7-slide deck:**

1. Title + team + challenge + live verdict screenshot.
2. Problem: raw seasonal data vs deseasonalized trend; "a slope is not a trend."
3. User experience: three screenshots — case, evidence board, verdict.
4. Data and method: POWER/MERRA-2 + CERES, seasonal removal, MK + Sen + CI + validation.
5. Finding: Jakarta all three variables significant, or the seasonal flip, or opposite trends.
6. Honesty: Wisconsin T2M p = 0.10 and precipitation p = 0.39; "not significant" explanation; validation.
7. Vision: classroom mode, more variables, live URL, GitHub.

**30-second video:**

- 0:00–0:04: "Is Jakarta's air getting cleaner or dirtier? Is the rain changing?"
- 0:04–0:08: "Trend Detective uses 25 years of NASA data to answer that — for any place."
- 0:08–0:14: Raw monthly chart, then toggle the seasonal cycle off; the trend appears.
- 0:14–0:20: Verdict cards for Jakarta AOD, temperature, rainfall; all significant, with rates and p-values.
- 0:20–0:25: Switch to Wisconsin; temperature and rainfall are not significant. "We say so."
- 0:25–0:30: Classroom/worksheet; URL and QR code.

**Live demo backup:**

- Pre-cache all demo data.
- Record a 30-second screen capture as a fallback.
- Have a static PNG of the verdict card.
- Do not rely on a live Giovanni/AppEEARS call.

### 7.4 Decision checklist

Before building, the team should answer these in one sentence each:

1. **Who is the primary user?** (Recommendation: high-school/college students and their teachers.)
2. **What is the one signature interaction?** (Recommendation: a case file that ends in a verdict.)
3. **What is the one finding the demo will show?** (Recommendation: Jakarta's three significant trends, or Bangladesh's seasonal flip, or a West African opposite-trends pair.)
4. **What is the one honesty moment?** (Recommendation: Wisconsin T2M p = 0.10 / precipitation p = 0.39.)
5. **What is the one data source we will not compromise on?** (Recommendation: NASA POWER/MERRA-2, with CERES AOD; cite the exact product.)
6. **What will we cut if time runs out?** (Recommendation: cut the 3D globe, accounts, AI chat, forecasting, and extra variables. Keep the case flow, the stats, and the evidence card.)
7. **What will the judge remember?** (Recommendation: "The annual average hid the story. The detective found the month.")

### 7.5 Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The app looks like every other 2026 entry | High | High | Case Files framing; one signature contrast; distinctive visual identity; teacher worksheet. |
| A headline trend is a data artifact | Medium | High | Label as screening; show method and uncertainty; sanity-check with a second dataset or expert; avoid causal claims. |
| Live API fails during demo | Medium | High | Pre-cache all demo cases; recorded backup; static verdict card. |
| Stats are wrong or overconfident | Medium | High | Validate against SciPy/pymannkendall; autocorrelation correction; FDR; show CI; include a non-significant case. |
| Scope creep | High | High | Three cases, one scan, one worksheet; cut 3D/AI/forecasting. |
| Mobile/classroom unusable | Medium | Medium | Mobile-first layout; no login; low-data mode; test at 360 px. |
| Submission missing references/AI disclosure | Medium | High | Checklist in Section 4.6; submit early; re-submit after changes. |

---

## 8. Candidate demo cases (quick screening, not final validated results)

The following numbers come from a quick screening of NASA POWER monthly data (1981–2025, or the period shown), using annual means, a two-sided Mann-Kendall test with tie correction, and the Theil-Sen slope. They are useful for choosing a demo case, but they are **not** a final validated analysis: no autocorrelation correction, no area weighting, no expert review. Recompute with the team's validated stats module before using them in the submission.

| Case | Place / variable | Period | Slope per decade | MK p | Why it is useful |
|---|---|---|---|---|---|
| Clear warming | Seoul, air temperature (T2M) | 1981–2025 | **+0.39°C per decade** | < 0.001 | Robust across most months; simple, intuitive, visually clear. |
| Not significant | Seoul, precipitation (PRECTOTCORR) | 1981–2025 | +0.07 mm/day per decade | 0.36 | A visible slope that is not significant; teaches "not significant ≠ no change." |
| Seasonal flip | Bangladesh grid (104 cells), September T2M | 1981–2025 | **median +0.16°C per decade** | 72/104 cells p < 0.05; 72/104 survive BH FDR | The annual mean is mixed, but September warms in every significant cell. A great "average hides the story" case. |
| Seasonal flip, opposite month | Bangladesh grid, January T2M | 1981–2025 | **median −0.30°C per decade** | 67/104 cells significant decrease | Pairs with September to show how the annual mean cancels opposite monthly trends. |
| Opposite trends | West Africa box (10–20°N, 0–10°E), annual precipitation | 1981–2025 | one cell **+0.030**, another **−0.030 mm/day per decade** | 1.5×10⁻⁵ and 0.021 | Both significant, opposite signs, same variable and region. Directly illustrates NASA's background statement. |
| Strong local story | Jakarta, AOD_55 / T2M / PRECTOTCORR | 2000/2001–2025 | **+0.0378 / +0.214 / +0.795 per decade** | all < 0.001 | All three variables significant; strong local narrative; matches the team's verified POWER table. |
| Official continuity | Wisconsin, AOD_55 | 2001–2025 | −0.010 per decade | 0.003 | Reproduces the challenge video's site/product family (CERES vs MODIS caveat). |
| Official non-significant | Wisconsin, T2M / precipitation | 2000–2025 | +0.19°C / +0.046 mm/day per decade | 0.10 / 0.39 | The honesty slide; both are plausible-looking but not significant. |

**How to use this table:**

- Pick **one** primary case for the 30-second video and **one** honesty case.
- For a Jakarta team, the strongest pairing is **Jakarta (all three significant)** + **Wisconsin (two not significant)** + the official Wisconsin AOD example.
- For a global audience, the strongest pairing is **Seoul warming** + **Bangladesh seasonal flip** + **West Africa opposite trends**.
- Do not put all of these in the app. Three cases is enough.

---

## 9. Source list and further reading

### Official challenge and event

- Challenge page: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
- 2026 hackathon page: https://www.spaceappschallenge.org/2026/
- 2026 challenges index: https://www.spaceappschallenge.org/2026/challenges/
- 2025 global winners: https://www.spaceappschallenge.org/2025/awards/global-winners/
- 2024 global winners: https://www.spaceappschallenge.org/nasa-space-apps-2024/awards/global-winners/
- Official challenge video (Indonesian): https://www.youtube.com/watch?v=Cd9Q48LhNbo
- Local Jakarta technical meeting PDF: `2026 Technical Meeting NASA Space Apps Jakarta.pdf` (repo root)

### Challenge resources

- Giovanni: https://giovanni.gsfc.nasa.gov/
- Giovanni user guide: https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html
- Hydrology Time Series: https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
- AppEEARS: https://appeears.earthdatacloud.nasa.gov/
- NOAA Climate Data Online: https://www.ncei.noaa.gov/cdo-web/
- SeaWiFS chlorophyll time-series article: https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf
- KNMI Climate Explorer: https://climexp.knmi.nl/
- Statistical test methods article: https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b
- Statistical significance guide: https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance
- CSA RCM data: https://donnees-data.asc-csa.gc.ca/en/dataset/rcm
- Geo.ca: http://geo.ca/
- SWOT: https://www.asc-csa.gc.ca/eng/satellites/swot/

### Public tools

- NASA Giovanni: https://giovanni.gsfc.nasa.gov/giovanni/
- KNMI Climate Explorer: https://climexp.knmi.nl/
- Climate Engine: https://climateengine.org/ and https://app.climateengine.org/climateEngine
- Trends.Earth: https://www.trends.earth/ and https://docs.trends.earth/en/latest/
- Google Earth Engine apps: https://developers.google.com/earth-engine/apps
- Our World in Data climate change: https://ourworldindata.org/climate-change
- OWID temperature anomalies grapher: https://ourworldindata.org/grapher/global-temperature-anomalies-by-month
- NASA Worldview: https://worldview.earthdata.nasa.gov/
- NASA POWER: https://power.larc.nasa.gov/data-access-viewer/ and https://power.larc.nasa.gov/docs/services/api/
- NASA GIBS: https://www.earthdata.nasa.gov/engage/open-data-services-and-software/api/gibs

### 2026 same-challenge prior art

- Slope and Signal: https://github.com/seunghyeon1004/slope-and-signal ; https://seunghyeon1004.github.io/slope-and-signal/
- AtmoSpy: https://github.com/TanvirMahmudTushar/AtmoSpy_Autonomous-Multi-Agent-Discovery-of-Environmental-Change
- TrendLens: https://github.com/yashodha7tech/trendlens
- EarthTrend Detective: https://github.com/iammalik884/earthtrend-detective ; https://iammalik884.github.io/earthtrend-detective/
- Terra Bangla: https://github.com/yasar-sys/TERRA_BANGLA-final ; https://terrabangla.yasar.earth/
- My Climate Story: https://github.com/Shafiur0/my-climate-story ; https://my-climate-story.vercel.app
- Earth System Fingerprints: https://github.com/sushmiNeela/FrontierX-Earth-System-Fingerprints
- GlobTraceX: https://github.com/oceantraceproject-hub/GlobtraceX ; https://www.youtube.com/watch?v=xIbB9IFUlws
- NEIA: https://www.youtube.com/watch?v=3N2vCDW5Buk
- ImpactLens: https://github.com/INmahi/impactLens-by-team-Meteors
- Earth Pulse: https://github.com/cyberhatc/earth-pulse
- TerraDetective: https://github.com/BELALANSARI07/TerraDetective
- TrendScope: https://github.com/lZXGl/trendscope
- AstroLogic MCI: https://github.com/TanvirHosenNishat01-blip/AstroLogic-Megacity-Climate-Intelligence ; https://www.youtube.com/watch?v=ifttH-iTz4o
- Terra Bangla video: https://www.youtube.com/watch?v=g3T5h9Zs05g
- Case Files / SpaceJammers: https://www.youtube.com/watch?v=JtVXxtEgTTw

### Earlier Space Apps and other hackathon projects

- WaterMatters (2019): https://www.youtube.com/watch?v=LE8i8oeTLXM
- airsat (2019): https://www.youtube.com/watch?v=TsFtGYooGm4
- AEDES (2019): https://www.youtube.com/watch?v=UTAar03Sa2g
- AsturExplorers (2024): https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/asturexplorers/
- GaamaRamma (2024): https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/gaamaramma/
- NVS-knot (2024): https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/nvs-knot/
- TerraTales (2024): https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/terratales/
- QUEÑARIS (2025): https://www.spaceappschallenge.org/2025/find-a-team/watana-project/
- ClimaLens (2025): https://www.youtube.com/watch?v=oGYux-d5ZTM
- BloomWatch / Bloomee (2025): https://github.com/bloomee-app/bloomee-web
- ChronoWeather (Devpost): https://devpost.com/software/chronoweather
- AgriSense (Devpost): https://devpost.com/software/agrisense-hst54k
- EarthScope (2026): https://www.youtube.com/watch?v=REyTSsFwvOY
- Earth Case Files (2026): https://www.youtube.com/watch?v=FmtnRkGppiE


### Related team documents

- `docs/problems/earth-system-trend-detective.md` — challenge dossier, data feasibility, verified trend table, product implications.
- `docs/problems/jakarta-technical-meeting.md` — timeline, submission mechanics, judging, eligibility.
- `docs/problems/brainstorm-brief.md` — product brainstorm and recommended narrative.
- `docs/problems/_raw/trend-notes.md` — statistical method notes, library APIs, simulation evidence.
- `docs/problems/assets/power_trend_results.csv` — full verified trend table.
- `docs/problems/assets/power_monthly_jakarta.csv` and `power_monthly_wisconsin.csv` — monthly data.
- `docs/problems/assets/power_trend_analysis.py` — analysis script.
- `docs/problems/assets/power_trend_jakarta.png` and `power_trend_wisconsin.png` — trend charts.

### Data and statistics references

- NASA POWER API docs: https://power.larc.nasa.gov/docs/services/api/
- ORNL DAAC MODIS REST API: https://modis.ornl.gov/rst/api/v1/
- GPM IMERG: https://gpm.nasa.gov/data/imerg
- GRACE/GRACE-FO: https://grace.jpl.nasa.gov/
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- Mann-Kendall / Sen's slope: see the challenge's statistical test article and the pymannkendall documentation.
- Hamed & Rao (1998); Yue & Wang (2004); Santer et al. (2000); Sen (1968); Benjamini & Hochberg (1995); Pettitt (1979); Weatherhead et al. (1998).

---

## 10. Bottom line

The challenge rewards a complete, honest, usable chain from NASA data to a significance verdict. The 2026 field is crowded with dashboards that already do the basic chain. To stand out:

1. **Make it an investigation, not a dashboard.** Case Files, evidence board, verdict.
2. **Make the science visible.** Raw vs deseasonalized, MK + Sen + CI, FDR when scanning, validation against SciPy/pymannkendall.
3. **Make honesty memorable.** Show a non-significant case and explain what it means.
4. **Make the demo a story.** One place, one variable, one surprise, one verdict, one vision.
5. **Make it usable by a real person.** No login, mobile, low bandwidth, a teacher worksheet, and a shareable evidence card.

The winning sentence is not "we built a dashboard." It is: **"We built a tool that helps a student find out whether their place is really changing — and shows them how to defend the answer."**
