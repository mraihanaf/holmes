# 04 — Holmes agent and NASA FIRMS fire watch

Holmes has two “live” behaviors: a tool-using analyst that answers questions, and a fire-watch layer that surfaces active-fire detections. They share the same rule: **the map can show a signal, but the evidence must be inspectable.**

## 1. The agent in one page

Holmes is not a general chatbot. It is a **tool-using analyst** with a narrow job:

- Translate a question into a place, variable set, window, and season.
- Call the same data and stats functions the UI uses.
- Answer with numbers that come from those functions.
- Move the map to the evidence and open the right-panel brief.
- Generate key notes for the inspected city.
- Admit when the question is outside scope.

The agent never computes a trend in prose. It calls a tool. It never invents a city, a date, a unit, or a source. It never claims causation.

### Product promise

> Ask a question. Holmes finds the data, runs the test, and opens the evidence in the right panel.

### What the agent is not

- Not a forecast model.
- Not a climate-policy advisor.
- Not a causal-inference engine.
- Not a web browser.
- Not a code interpreter.
- Not a source of numbers independent of the stats engine.
- Not a chat-only assistant. The full answer belongs in the right-panel brief.

## 2. Supported questions

The MVP supports seven core intents plus three evidence follow-ups. Anything else gets a clear “here is what I can do” response.

| Intent | Example | What the agent does |
|---|---|---|
| **City trend** | “Is Jakarta getting warmer?” | Resolve city, select variable, compute trend, fly, open the brief |
| **City scan** | “What changed in Jakarta?” | Scan selected variables, rank by standardized signal, open key notes |
| **City ranking** | “Where is rainfall falling?” | Rank cities by a variable and direction, open the top city |
| **Seasonal trend** | “Is Jakarta’s dry season getting hotter?” | Set season, compute seasonal trend, open the brief |
| **Fire check** | “Is there a fire in South Sulawesi?” | Query FIRMS clusters in the region, fly, open the fire panel |
| **View control** | “Show the last 20 years.” | Change the window or filters, confirm, undo |
| **Evidence check** | “How sure is that?” | Switch to the Evidence Lens, read the key notes, answer in the brief |
| **Agreement check** | “Do the variables agree?” | Switch to the Agreement Lens, show the mixed state |
| **Evidence ranking** | “Where is the evidence weak?” | Rank cities by evidence, open the weakest city |
| **Then & Now** | “What did Jakarta look like in 2001 vs 2025?” | Open the satellite comparison, label the sensor and dates, state the caveat |

### Out of scope

- “Why is Jakarta warming?” → The data can show the trend; it cannot establish cause. Offer a curated “possible explanations” card, clearly labeled as hypotheses, or suggest variables to inspect.
- “Will Jakarta be hotter in 2030?” → No forecast. Offer the historical trend.
- “Is climate change real?” → Answer with a specific place and variable; do not editorialize.
- “Which city is the most climate-resilient?” → Composite policy index; out of scope.
- “Show me the raw satellite image.” → Not a product surface; link to NASA Worldview if needed.

## 3. Architecture

```text
Chat input
  → Convex action `holmes.ask`
  → LLM with tool definitions + current view state
  → tool calls (Convex queries/actions + Python stats service)
  → structured answer + actions
  → verification step
  → UI opens the right-panel brief, flies the globe, and updates the tool trace
```

### Why Convex

The existing technical plan uses Convex for the app platform. The agent fits there:

- `holmes.ask` is an action with a timeout.
- Tool calls are internal queries/actions with validators.
- The thread and messages are stored per session (no accounts).
- The stats service remains the numerical engine.

If the team prefers a simpler stack, the same design works with a single serverless function and a Postgres table. The important part is the tool boundary, not the vendor.

### Deterministic fallback

Every supported intent has a non-LLM path:

1. Normalize the question (lowercase, strip punctuation).
2. Match place names from the curated list.
3. Match variable synonyms (“warmer” → `T2M`, “rain” → `PRECTOTCORR`, “soil” → `GWETROOT`).
4. Match intent patterns.
5. Run the same tools.
6. Render a template answer.

This fallback is used when the LLM is unavailable, over budget, or too slow. It is also the backup for the demo. The fallback is not a degraded product; it is a reliability feature.

## 4. Tools

Tools are typed functions. The agent cannot call arbitrary URLs, run code, or query the database directly.

| Tool | Input | Output | Side effects |
|---|---|---|---|
| `resolvePlace` | `{ text }` | `{ candidates: Place[] }` | None |
| `setView` | `{ placeId, zoom?, pitch? }` | `{ actionId }` | Camera fly-to |
| `setFilters` | `{ variableKeys, start, end, season }` | `{ actionId }` | Recolors board |
| `openCityFile` | `{ cityId, tab }` | `{ actionId }` | Selects the city, opens the right panel, flies |
| `setLens` | `{ mode }` | `{ actionId }` | Recolors the board, updates the legend |
| `getCityTrends` | `{ cityId, variableKeys, window }` | `TrendResult[]` | None |
| `getCityNotes` | `{ cityId, variableKeys, window }` | `CityNotes` | None |
| `scanCity` | `{ cityId, variableKeys, window }` | `RankedFinding[]` | None |
| `rankCities` | `{ variableKeys, window, direction, limit, lens? }` | `CityRank[]` | None |
| `getSeries` | `{ cityId, variableKey, window }` | `{ series, trend }` | None |
| `getFireClusters` | `{ bbox, days, minConfidence }` | `FireCluster[]` | None |
| `openFirePanel` | `{ clusterId }` | `{ actionId }` | Opens the fire watch tab, flies to the cluster |
| `getSatelliteComparison` | `{ cityId, startDate, endDate, mode }` | `SatelliteComparison` | None |
| `openSatelliteView` | `{ cityId, mode }` | `{ actionId }` | Opens the full-screen Then & Now compare |
| `explainMethod` | `{ method }` | `{ text, citations }` | None |
| `shareCase` | `{ question, filters, cityId }` | `{ url }` | None |

`tab` is `brief` or `file`; `mode` is `effect`, `evidence`, `agreement`, or `coverage`.

### Tool rules

- Every input is validated.
- Every output is typed and includes units, period, source, and method.
- Every result has an `id` so the answer can cite it.
- `setView` and `setFilters` return an action ID and are undoable.
- `rankCities` caps at 10 results in the answer; the panel can show more.
- `getFireClusters` caps at 20 clusters; the map can show all points.
- Tools never throw raw exceptions; they return typed errors (`not_found`, `insufficient_data`, `source_unavailable`).
- `resolvePlace` supports cities and regions. Trend tools use city IDs; fire queries can use a region bounding box.
- Every place-based answer must call `openCityFile` before returning. The right panel is the answer surface; the chat only shows a one-line receipt.
- `getCityNotes` uses deterministic templates over the computed results. The LLM may rephrase the brief, but it does not invent the notes.
- `getSatelliteComparison` returns `not_available` when the start date is before 2000 or the tiles are missing; do not invent an image date.
- `setLens`, `openCityFile`, and `openSatelliteView` return action IDs and are undoable.

## 5. Question-to-answer flow

### 5.1 “Is Jakarta getting warmer?”

```text
User: Is Jakarta getting warmer?

Holmes:
  1. resolvePlace("Jakarta") → Jakarta, Indonesia (-6.20, 106.85)
  2. inferVariable("warmer") → T2M
  3. getCityTrends(jakarta, [T2M], 2001–2025)
  4. getCityNotes(jakarta, [T2M, PRECTOTCORR, AOD_55, T2M_MAX], 2001–2025)
  5. setFilters([T2M], 2001–2025) + setLens("effect")
  6. openCityFile(jakarta, tab="brief")
  7. verify answer numbers against result
  8. render the brief in the right panel; send a one-line receipt to the chat
```

Answer:

```text
Yes — Jakarta is warming.

+0.21 °C per decade
Seasonal Mann–Kendall p < 0.001 · 95% CI in the city file
25 years · 300 months · NASA POWER / MERRA-2

[ OPEN JAKARTA ] [ SHOW ALL CITIES ] [ METHOD ]
```

### 5.2 “Where is rainfall falling?”

```text
User: Where is rainfall falling?

Holmes:
  1. inferVariable("rainfall") → PRECTOTCORR
  2. inferDirection("falling") → decreasing
  3. rankCities([PRECTOTCORR], 2001–2025, decreasing, 10)
  4. setFilters([PRECTOTCORR], 2001–2025)
  5. openCityFile(topCity, tab="brief")
  6. render the ranked list in the brief; the map shows the top cities
```

Answer:

```text
The strongest drying signals in this window are in ...

1. City A  -0.18 mm/day per decade  p = 0.004  significant
2. City B  -0.12 mm/day per decade  p = 0.021  significant
3. City C  -0.09 mm/day per decade  p = 0.110  not significant

8 variables were tested; p-values are FDR-adjusted.
```

### 5.3 “What changed in Jakarta?”

```text
User: What changed in Jakarta?

Holmes:
  1. resolvePlace → Jakarta
  2. scanCity(jakarta, [T2M, PRECTOTCORR, AOD_55, T2M_MAX], 2001–2025)
  3. rank by |z| and significance
  4. setFilters(all selected, 2001–2025, combined)
  5. getCityNotes(jakarta, selected, 2001–2025)
  6. openCityFile(jakarta, tab="brief")
  7. render the key notes and evidence stack
```

Answer:

```text
A four-variable scan of Jakarta shows:

1. Air temperature   +0.21 °C/decade   p < 0.001
2. Rainfall          +0.70 mm/day/dec   p < 0.001
3. Aerosol           +0.038/decade     p < 0.001
4. Maximum temp.     +0.12 °C/decade   p = 0.019 · q = 0.38

3 of 4 are significant after FDR. The composite is increasing; maximum
temperature is the weak signal.
```

### 5.4 “Is there a fire in South Sulawesi?”

```text
User: Is there a fire in South Sulawesi?

Holmes:
  1. resolvePlace → South Sulawesi
  2. getFireClusters(bbox around region, 5 days)
  3. rank by summed FRP
  4. setView(cluster centroid) + enable fire layer
  5. openFirePanel(clusterId)
  6. render the notice and fire watch panel
```

Answer:

```text
FIRMS detected a cluster of 76 hot pixels in South Sulawesi,
10–14 November 2026, summed FRP 1,672 MW.

This is an active-fire detection, not a confirmed wildfire. Hot pixels can
include peat burning, land clearing, agricultural burns, or industrial flares.

[ VIEW CLUSTER ] [ OPEN IN FIRMS ]
```

### 5.5 “Show the last 20 years.”

```text
User: Show the last 20 years.

Holmes:
  1. setFilters(current variables, 2006–2025, current season)
  2. confirm: “Window set to 2006–2025.”
  3. show undo chip.
```

This is a view action, not an analysis. The answer is one line; the board does the talking.

### 5.6 “How sure is that?”

```text
User: How sure is that?

Holmes:
  1. setLens("evidence")
  2. getCityNotes(jakarta, [T2M, PRECTOTCORR, AOD_55, T2M_MAX], 2001–2025)
  3. openCityFile(jakarta, tab="brief")
  4. answer in the brief: “Evidence is strong overall: 3 of 4 variables
     significant; maximum temperature is weak after FDR.”
```

The globe stays on the same city board. The color encoding changes from effect size to evidence strength. The key notes re-sort by evidence level. This is the signature follow-up: **what → how sure**.

Related follow-ups:

| Question | Action |
|---|---|
| “Do the variables agree?” | `setLens("agreement")` |
| “Is the record long enough?” | `setLens("coverage")` |
| “Where is the evidence weak?” | `rankCities(..., lens="evidence")`; open the weakest city |

### 5.7 “What did Jakarta look like in 2001 vs 2025?”

```text
User: What did Jakarta look like in 2001 vs 2025?

Holmes:
  1. resolvePlace("Jakarta") → Jakarta, Indonesia
  2. getSatelliteComparison(jakarta, 2001-08-15, 2025-08-15, "true")
  3. openSatelliteView(jakarta, "true")
  4. answer: “Here is Jakarta in August 2001 and August 2025,
     MODIS Terra true color. This is visual context, not a trend test.”
```

Related follow-ups:

| Question | Action |
|---|---|
| “Show false color” | `getSatelliteComparison(..., mode="false")` |
| “Find a clearer day” | retry ±7 days; update the dates |
| “What does the trend say?” | open `CITY FILE` for the chart and verdict |

## 6. Grounding and verification

The verification step is deterministic and mandatory. It runs before the answer is shown.

### Checks

1. **Number trace:** every number in the answer appears in a tool result, within the displayed rounding.
2. **Place match:** the city, coordinates, and country match the resolved place.
3. **Variable match:** the variable code and unit match the result.
4. **Period match:** the start/end years and season match the result.
5. **Source match:** the source and dataset in the answer match the series provenance.
6. **No causal verbs:** reject “caused,” “because of,” “due to,” “proves,” “proves that.”
7. **No “no change”:** use “no significant trend in this window.”
8. **Fire wording:** reject “wildfire” as a confirmed fact; use “active-fire detection” or “possible wildfire.”
9. **Caveat:** include one if the record is short, the result is not significant, variables were multiple-tested, or the data is a grid cell.
10. **Word limit:** 80 words for the prose, excluding the data line and chips.
11. **Right-panel match:** the brief’s city and window match the resolved place and the tool result.
12. **Notes match:** every key note appears in `getCityNotes`; no note is invented by the LLM.
13. **Chat receipt:** the chat contains only the question and a one-line receipt, not a duplicate of the full answer.
14. **Evidence wording:** “statistical evidence” or “evidence strength,” never “probability that the trend is true.”
15. **Satellite wording:** the dates, sensor, and resolution match the comparison result; the answer includes “visual context, not a trend test.”
16. **Method wording:** if `methodDependent` is true, say “method-dependent” and do not describe the result as strong or clear.

If verification fails, regenerate once with the failed checks as instructions. If it fails again, show the deterministic result and a `NEEDS REVIEW` tag. Never publish unverified prose as fact.

### Assumptions

If the question is ambiguous, the agent may state an assumption and proceed:

> “I interpreted ‘warmer’ as air temperature (`T2M`), seasonally adjusted. Change the variable if you meant something else.”

If the place is ambiguous, do not guess. Show candidates.

## 7. Prompt contract

### System prompt

```text
You are Holmes, an Earth-system trend analyst.

Use only the provided tools. Never invent a number, place, date, unit, or source.
When you resolve a place and compute a trend, call openCityFile so the right panel inspects it.
Put the full answer in the right panel. Keep the chat to a one-line receipt.
Answer in at most 80 words, then a data line, then at most three action chips.
Distinguish "no significant trend" from "no change."
Never claim causation. Say "associated with" or "consistent with."
If the user asks "how sure", switch to the evidence lens and use getCityNotes.
If the user asks what a place looked like, open the satellite comparison and say "visual context, not a trend test."
If the methods disagree, say "method-dependent" and show both.
If the data is insufficient, say so.
If the question is outside city trends or fire detections, say what you can do.
Every claim must cite a tool result.
```

### Structured output

```json
{
  "headline": "Yes — Jakarta is warming.",
  "summary": "Air temperature rose 0.21 °C per decade from 2001 to 2025.",
  "panel": "brief",
  "cityId": "jakarta",
  "lens": "effect",
  "numbers": [
    { "value": "+0.21", "unit": "°C per decade", "resultId": "trend_jakarta_t2m_2001_2025" },
    { "value": "p < 0.001", "unit": null, "resultId": "trend_jakarta_t2m_2001_2025" }
  ],
  "actions": [
    { "type": "open_brief", "cityId": "jakarta" },
    { "type": "set_lens", "mode": "effect" },
    { "type": "show_all_cities", "variableKeys": ["T2M"] }
  ],
  "citations": ["NASA POWER / MERRA-2"],
  "caveats": ["MERRA-2 grid cell, not a station."],
  "confidence": "high"
}
```

The UI renders the structured fields, not free-form markdown. This makes verification and layout predictable.

## 8. Limits and cost

| Limit | Value |
|---|---|
| Tool calls per answer | 6 |
| LLM retries | 2 |
| End-to-end timeout | 20 seconds; 5 seconds for cached questions |
| Answer prose | 80 words |
| Ranked cities in answer | 10 |
| Fire clusters in answer | 3 |
| Concurrent runs per session | 1 |
| Cost per answer | configurable cap, default $0.05 |
| Cache | normalized question + view state, 24 hours |

Use a cheap model for intent parsing and tool selection; use a stronger model only for the final phrasing if the budget allows. The stats are deterministic, so the model’s job is small.

## 9. Right-panel response and key notes

The agent has one response surface: the **right panel**. The chat is the question box and the thread; it is not the answer surface.

### 9.1 What happens on a place-based answer

1. The agent resolves the place.
2. It computes or loads the trend.
3. It calls `openCityFile(cityId, tab="brief")`.
4. The globe flies to the city and selects the marker.
5. The right panel opens `HOLMES BRIEF` for that city.
6. The city key notes load in the `CITY FILE` tab; a short key-notes list appears in the brief.
7. The chat receives a one-line receipt: `HOLMES → RIGHT PANEL · Jakarta is warming. [OPEN BRIEF]`.

The brief is not a modal. It does not cover the globe. It is a tab in the same panel as the city file.

### 9.2 Brief layout

```text
HOLMES BRIEF · JAKARTA                 [BRIEF] [CITY FILE] [FIRE WATCH] [×]
2001–2025 · MERRA-2 cell · CITY SUMMARY · 4 variables

Yes — Jakarta is warming.

+0.21 °C per decade
Seasonal Mann–Kendall p < 0.001 · 25 years · NASA POWER / MERRA-2

KEY NOTES
• Air temperature: rising +0.21 °C/decade, significant.
• Rainfall: rising +0.70 mm/day/decade, significant.
• Aerosol: rising +0.038/decade, significant.
• Maximum temperature: +0.12 °C/decade, not significant after FDR.
EVIDENCE: STRONG overall · 3 of 4 significant.

[ HOW SURE? ] [ SHOW ALL CITIES ] [ SHARE ]
```

### 9.3 Key notes contract

`getCityNotes` returns a typed `CityNotes` object:

```json
{
  "cityId": "jakarta",
  "window": { "start": 2001, "end": 2025, "season": "annual" },
  "headline": "Jakarta is warming.",
  "notes": [
    { "variableKey": "T2M", "text": "Air temperature: rising +0.21 °C/decade, significant (q = 0.004).", "tone": "rising" },
    { "variableKey": "PRECTOTCORR", "text": "Rainfall: rising +0.70 mm/day/decade, significant (q = 0.014).", "tone": "rising" },
    { "variableKey": "AOD_55", "text": "Aerosol: rising +0.038/decade, significant (q < 0.001).", "tone": "rising" },
    { "variableKey": "T2M_MAX", "text": "Maximum temperature: +0.12 °C/decade, not significant after FDR (q = 0.38).", "tone": "weak" }
  ],
  "evidence": "STRONG overall; 3 of 4 significant",
  "caveat": "MERRA-2 grid cell, not a weather station.",
  "suggestedQuestions": ["How sure is that?", "Compare with another city", "Show rainfall"]
}
```

Rules:

- Deterministic templates over the computed result table. No LLM numbers.
- `variableKeys` is the **city summary set**, not necessarily the map filter. For a single-variable question, add three context variables (rainfall, aerosol, maximum temperature) so the notes explain the city, not just the answer.
- Sorted by variable category by default; `HOW SURE?` re-sorts by evidence strength.
- If no variable is significant: “No clear trend in this window. The strongest signal is … but it is not significant after FDR.”
- If variables disagree: “Mixed signals: temperature rising, rainfall falling.”
- If the record is short: “Short record: 12 years. Treat the verdict as provisional.”
- If there is not enough data: “Not enough data for a trend. Showing the available series.”
- The notes must match the chart, the verdict, and the brief. Verification checks this.

### 9.4 What the agent must not do

- Do not answer only in the chat. The full answer belongs in the right panel.
- Do not open a city file without flying to and selecting the city.
- Do not show key notes for city A while the right panel is on city B.
- Do not generate key notes with the LLM. The LLM may rephrase the brief, but the notes come from `getCityNotes`.
- Do not open the `CITY FILE` tab when the user asked a question; open `HOLMES BRIEF`. The city file is one click away.
- For a Then & Now question, open the satellite compare as an overlay, but keep the city file and trend evidence behind it. The image is not the evidence.
- Do not let the brief cover the globe or hide the chat input.

## 10. Demo safety

The demo must work even if the LLM is slow, the network is flaky, or FIRMS is down.

### Prewarm these questions

1. “Is Jakarta getting warmer?”
2. “How sure is that?”
3. “What changed in Jakarta?”
4. “Where is rainfall falling?”
5. “Where is the evidence weak?”
6. “Is there a fire in South Sulawesi?”
7. “What did Jakarta look like in 2001 vs 2025?”
8. “Show the last 20 years.”

### Fallbacks

- **LLM offline:** deterministic intent router + template answer + `openCityFile`, so the brief still opens on the right.
- **POWER offline:** cached city trends; tag `CACHED`.
- **FIRMS offline:** committed Indonesia snapshot; tag `CACHED SNAPSHOT`.
- **Stats service offline:** show the series and a `TREND UNAVAILABLE` notice; do not invent a verdict.
- **Map offline:** a static fallback image with the same right-panel brief is not ideal; the recorded video is the true fallback.

### Demo rule

Never debug live. If a tool fails, the fallback should produce the same headline and number from cache. The audience should not see a spinner on stage.

## 11. NASA FIRMS fire watch

### 10.1 What FIRMS provides

NASA FIRMS (Fire Information for Resource Management System) distributes near-real-time (NRT) active-fire detections from MODIS and VIIRS. Each detection is a hot pixel with:

- latitude, longitude
- acquisition date and time
- satellite and instrument
- confidence
- brightness temperatures
- fire radiative power (FRP, MW)
- day/night flag

FIRMS is designed for active-fire monitoring. It is not a confirmed wildfire incident database. A detection can be a wildfire, peat burning, land clearing, agricultural burning, or an industrial flare.

### 10.2 API

Area API:

```text
https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{WEST,SOUTH,EAST,NORTH}/{DAYS}/{DATE}
```

- `SOURCE`: `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, `VIIRS_SNPP_NRT`, or `MODIS_NRT`.
- `DAYS`: 1–5 for NRT.
- `DATE`: optional start date; defaults to the latest.
- `MAP_KEY`: from `FIRMS_MAP_KEY`; signup is free.
- The API returns CSV. Cache every response.

The repo already contains a 5-day Indonesia snapshot:

- `docs/problems/assets/firms/indonesia_fires_5d_filtered.csv` — 8,881 high/nominal-confidence detections, 10–14 November 2026.
- `docs/problems/assets/firms/indonesia_fire_clusters_top.csv` — top 0.1° clusters.
- `docs/problems/assets/firms/indonesia_fires_by_province.csv` — province ranking.

Use the snapshot for the demo. Use the live API for the current viewport if time allows.

### 10.3 Processing

1. **Fetch** — bbox + 5 days + one or more sources.
2. **Normalize** — unify confidence (`l/n/h` vs 0–100), parse dates, keep FRP.
3. **Filter** — drop low-confidence detections. Keep MODIS confidence ≥ 30 and VIIRS nominal/high. Tune with the data.
4. **Deduplicate** — optional: merge detections within ~1 km and ~1 hour from overlapping satellites to avoid double counting.
5. **Cluster** — group by 0.1° or 0.25° cell, or DBSCAN with `eps ≈ 0.1°`. For each cluster: count, summed FRP, max FRP, centroid, date range, nearest city/province.
6. **Rank** — by summed FRP, then count.
7. **Publish** — top 20 clusters + heatmap points.

### 10.4 Thresholds

Suggested starting points, tune on the Indonesia snapshot:

- A cluster is **notable** if `count >= 20` or `sumFRP >= 300 MW`.
- A cluster is **near a city** if the centroid is within 150 km.
- Show at most 3 notices at once; the panel can list more.
- A single detection is not a notice. It can still appear in the heatmap.

The snapshot’s top South Sulawesi cluster has 76 detections and 1,672 MW, so it clears both thresholds comfortably. That is a good demo cluster.

### 10.5 Map rendering

- **All detections:** heatmap layer, low opacity, ember palette.
- **Top clusters:** circle layer with a pulsing ring; size by count, color by summed FRP.
- **Selected cluster:** a ring + a small callout with the nearest city.
- **Fire panel:** list of clusters in view, sorted by FRP.
- **Notice card:** appears at the right edge or above the ticker; dismissible; does not move the camera.
- **Ticker:** one line, e.g. `FIRE WATCH // SOUTH SULAWESI // 76 DETECTIONS // 1,672 MW // 10–14 NOV 2026`.

### 10.6 Notice logic

A notice is warranted when:

1. The fire layer is on, and a notable cluster is in the current viewport; or
2. A notable cluster is within 150 km of the selected city; or
3. The user explicitly asks about fires near a place.

A notice contains:

```text
FIRE WATCH
South Sulawesi · 76 detections · 1,672 MW
10–14 Nov 2026 · South Sulawesi province
Active-fire detections, not a confirmed wildfire.
[ VIEW ] [ OPEN IN FIRMS ] [ DISMISS ]
```

Do not auto-pan. Do not use the word “emergency.” Do not imply that the app is an official alert service.

### 10.7 Wording rules

| Don’t say | Say |
|---|---|
| “Wildfire at South Sulawesi” | “Active-fire detections in South Sulawesi” |
| “Confirmed fire” | “Possible wildfire or burning” |
| “Real-time” | “Near-real-time, 10–14 Nov 2026” |
| “Alert” | “Fire watch notice” |
| “The fire is in South Sulawesi” | “The cluster is in South Sulawesi province” |

The caveat is always one click away, and often visible:

> FIRMS detects hot pixels. They can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. This is not a confirmed incident. Check BNPB/local authorities.

### 10.8 Global versus Indonesia

- **MVP:** Indonesia snapshot. It matches the hackathon location, the existing data, and the strongest demo cluster.
- **Stretch:** global heatmap from a 1-day VIIRS snapshot, with regional notices. Global 5-day data is large; use viewport bbox and clustering.
- Do not fetch the whole world on every page load. Cache it.

## 12. Feasibility verdict

| Question | Answer |
|---|---|
| Can the agent answer city trend questions? | Yes. The tools are simple; the LLM only routes and phrases. |
| Can it answer “where is rainfall falling”? | Yes, with a precomputed city ranking. |
| Can it control the map? | Yes, through explicit actions with undo. |
| Can it avoid hallucinating numbers? | Yes, if numbers only come from tools and verification rejects unmatched numbers. |
| Can it handle every question? | No. Keep the scope to seven core intents plus three evidence follow-ups and say so. |
| Can it auto-inspect the region it checks? | Yes. `openCityFile` selects the city, flies the globe, and opens the right panel. |
| Can it show key notes on a city click? | Yes. `getCityNotes` uses deterministic templates over computed results. |
| Can it show uncertainty on the map? | Yes. The Evidence Lens uses the FDR q-values, sample size, coverage, and agreement already computed. |
| Can it show method sensitivity? | Yes. If OLS HAC and Seasonal MK disagree, set `methodDependent` and say so. |
| Can it show a satellite Then & Now? | Yes. NASA GIBS true/false color; cached city snapshots keep the demo reliable. |
| Can FIRMS show fires on the globe? | Yes. Heatmap + clusters; 10k–100k points is manageable. |
| Can FIRMS confirm a wildfire? | No. It detects hot pixels. The UI must say so. |
| Can this run in 48 hours? | Yes, if the agent is narrow and the fire layer uses the cached Indonesia snapshot. |

**Effort:** medium-high for the agent, medium for FIRMS, small–medium for the right panel, key notes, and Evidence Lens, small for cached satellite comparisons. The agent is the highest-risk feature because it combines LLM latency, tool orchestration, and demo pressure. Build the deterministic fallback first, then add the LLM.
