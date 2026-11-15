# 01 — Product concept

## 1. The pitch

> **Holmes is an Earth-system detective. Ask a question about a place, and it turns NASA data into a live evidence map of what is changing, where, and how sure we can be.**

The user does not start with a form. They start with a question:

- “Is Jakarta getting warmer?”
- “Where is rainfall falling?”
- “What changed in my city?”
- “Is there a fire in South Sulawesi?”

Holmes resolves the place, chooses the variables, sets the time window, computes the trend, and paints the answer onto a globe. The user can then open any city and inspect the evidence: the time series, the slope, the confidence interval, the p-value, the data source, and the caveats.

The globe is not a background illustration. It is the answer surface. The chat is not a chatbot bolted to a dashboard. It is the case intake. The city panel is not a tooltip. It is the case file.

**On the name.** Holmes is a working title. It frames the product as an investigator: question, evidence, verdict. The UI does not lean on the Sherlock costume — no deerstalker, no pipe. The name is a reminder that the product is about evidence, not oracle answers.

## 2. The problem

NASA’s challenge asks users to:

1. Identify a variable.
2. Acquire data for a region.
3. Visualize a time series.
4. Test whether the trend is significant.

Existing tools can do all four, but they ask the user to think like a data engineer first: choose a product, choose a parameter, choose a bounding box, choose a date range, choose an aggregation, choose a statistical test. That is a high barrier for the named audience: high-school and college students, teachers, and scientifically literate public.

The 2026 field is also crowded. A GitHub search for the exact challenge phrase found dozens of repositories, and most are “pick a place, pick a NASA POWER variable, plot it, run Mann–Kendall.” A generic dashboard will not stand out.

## 3. The gap

The strongest 2026 entries do one of three things well:

- **Guided inquiry** — a case file with a question, evidence, and a verdict.
- **Scanning** — rank many variables or places by signal strength.
- **A memorable finding** — a seasonal flip, an opposite trend, a surprising local signal.

Almost none combine **natural-language questions**, **global spatial comparison**, and **inspectable evidence** in one surface. That is the gap Holmes targets.

The product is not “AI answers climate questions.” It is “a question becomes a reproducible investigation, and the map shows the result.” The agent is a router and narrator, not the source of truth.

## 4. Why Holmes

### 4.1 The globe gives instant context

A time-series chart answers “what changed here?” A globe answers “where else is this happening?” That comparison is the difference between a local number and a spatial pattern. The globe also makes the product legible in a screenshot, which matters for a hackathon demo.

### 4.2 The chat lowers the barrier

A student does not need to know that `T2M` means air temperature at 2 meters. They can ask “is Jakarta getting warmer?” Holmes maps the question to the variable, place, and period, then shows the technical evidence. The user can learn the variable name by inspecting the result.

### 4.3 The city board makes local answers comparable

Every city marker uses the same method and the same period. A user can see that Jakarta is warming while another city is not, or that one city has a mixed signal. That is more honest than a single heroic chart.

### 4.4 The evidence panel keeps the agent honest

The chat answer is a one-line receipt. The right-panel brief and city file are the evidence. Every number in the answer must trace to a computed result. If the data is insufficient, the city file says so. If the trend is not significant, the ring and badge say so. The agent cannot invent a number because the numbers come from the stats engine.

### 4.5 FIRMS adds a timely, visceral layer

A trend is slow. A fire is now. NASA FIRMS active-fire detections give the globe a live, local signal that complements the climate trends. It also creates a strong demo moment: a fire notice appears while the user is exploring, and clicking it opens the detections, the date range, and the caveat.

## 5. Audience

| Audience | What they want | What Holmes gives them |
|---|---|---|
| **Curious citizen** | A straight answer about their city | Ask a question, get a verdict, open the chart |
| **Student** | To learn what a trend is and why significance matters | Compare cities, see error and uncertainty, inspect the method |
| **Teacher** | A classroom-ready investigation | Starter cases, share links, a city board for discussion |
| **Journalist / analyst** | A lead and a citation | Rank cities, export the evidence, copy the source and method |
| **Hackathon judge** | A complete, novel, valid product | A polished globe, a real question, a verified answer, a timely fire layer |

The primary demo audience is the judge, but the primary product audience is the curious citizen and the student. The interface should be understandable without a methods lecture, and deep enough for a scientist to inspect.

## 6. Product principles

1. **Question first, controls second.** The chat is the entry point. The filters are there to refine, not to gate.
2. **Evidence over assertion.** Every answer has a chart, a number, a source, and a caveat. The agent never gets the final word.
3. **Spatial context, not spatial false precision.** A city marker is a data cell, not the whole city. The UI says so.
4. **One board, many depths.** The globe is the same surface at every level: global scan, city file, fire watch. The user does not change apps to go deeper.
5. **Honest uncertainty.** “Not significant” is a first-class result. “Mixed signal” is a first-class result. “Insufficient data” is a first-class result.
6. **Fast demo, graceful failure.** Cached data must render instantly. The agent must have a deterministic fallback. The fire layer must have a cached snapshot.

## 7. The five surfaces in detail

### 7.1 The Board

The globe is a MapLibre GL globe with a dark basemap, a soft atmosphere, and a slow idle spin. City markers are small halos with a core dot and a significance ring. The halo color encodes the selected trend; the ring encodes whether the trend is significant; the halo is fixed in screen space so it does not imply a geographic boundary.

At city zoom, the marker expands into the actual MERRA-2 grid cell footprint (about 0.5° × 0.625°). This is the honest “zone”: it shows the data support, not an invented city boundary. A label reads “MERRA-2 cell ≈ 55 × 69 km.”

### 7.2 The Lens

The left rail holds the variable filter, the timeline, the legend, and the layer toggles. The user can select one variable or several. With one variable, the legend is in real units (“°C per decade”). With several, the map uses a standardized composite and the legend says so (“σ per decade”). The city file always shows the real units.

The timeline is not a single slider. It has three controls:

- **Window** — the years used for the trend.
- **Season** — all months, DJF, MAM, JJA, SON, or one month.
- **Resolution** — monthly, annual, or seasonal for the chart.

“Per decade” is the reporting unit for the slope, not a separate time range. The time window determines the evidence; the slope is always expressed per 10 years.

### 7.3 The Question

The chat is the center of the composition. On first load it sits in the middle of the globe as a large prompt; after the first question or city selection it docks to the bottom center, wide enough to feel like a command bar but low enough not to cover the globe. When idle, it shows rotating example questions. When focused, it expands into a short thread. When running, it shows a compact tool trace: resolve place, load series, test trend, verify.

The full answer does not appear above the input. It opens in the right panel as a **Holmes Brief**: one headline, two or three key numbers, a key-notes list, and action chips. The chat shows a one-line receipt — “Answer in the right panel” — and keeps the thread for follow-ups. This keeps the center of the screen on the globe and makes the right panel the evidence surface.

### 7.4 The File

Clicking a city opens a right-hand panel. The header gives the city, country, coordinates, the MERRA-2 cell, and the period. Immediately below it is an **auto-generated key-notes summary**: “Air temperature: rising +0.21 °C/decade, significant,” “Rainfall: rising +0.70 mm/day/decade, significant,” “Maximum temperature: +0.12 °C/decade, not significant after FDR,” plus an evidence line and a caveat. The notes are generated from computed results, not from the LLM, so they are instant and safe.

Below the notes is the verdict and the evidence stack: one row per variable with a sparkline, the slope, the p-value, and a badge. The verdict shows both OLS HAC and Seasonal MK; if they disagree, a `METHOD-DEPENDENT` badge says so and the more conservative result leads. Clicking a row expands the chart with the raw monthly series, the trend line, the confidence band, and the deseasonalized toggle. Below the evidence stack is an optional **Then & Now** card: a satellite split comparison from the start to the end of the timeline, with true-color and false-color modes. It is visual context, not a trend test. The bottom of the panel is provenance: source, dataset, retrieval date, method, sample size, and caveats. This is the part that makes the product credible to a judge.

### 7.5 The Watch

The fire layer is a toggle, not a permanent overlay. When on, FIRMS detections appear as a heatmap, and the strongest clusters appear as pulsing rings. A notice card lists the top clusters in view, sorted by summed fire radiative power. Clicking a cluster flies to it and opens the fire watch panel with the detections, dates, satellite, confidence, and a clear caveat: hot pixels are not confirmed wildfires.

## 8. User journeys

### Journey A — “Does Jakarta get warmer?”

1. The app opens on the globe with a slow spin and city halos.
2. The user types: “Does Jakarta get warmer?”
3. Holmes resolves Jakarta, sets the variable to air temperature (`T2M`), and uses the current window.
4. The globe flies to Jakarta. The city marker pulses. The right panel opens automatically and inspects Jakarta. The rest of the board stays visible.
5. The **Holmes Brief** in the right panel says: “Yes — Jakarta is warming. +0.21 °C per decade, Seasonal Mann–Kendall p < 0.001, 25 years (2001–2025).”
6. The city file and key notes sit behind the brief: the T2M chart, the other variables, and the auto-generated summary.
7. The user clicks “Show all cities.” The globe recolors by T2M trend. Jakarta is one point in a global pattern.
8. The user asks a follow-up: “What about rainfall?” Holmes keeps the city and changes the variable.

**Why this works:** the first answer is local and specific; the second view is global and comparative; the city file is the evidence. The user learns the variable name without being asked to choose it first.

### Journey B — “Where is rainfall falling?”

1. The user asks: “Where is rainfall falling?”
2. Holmes sets `PRECTOTCORR`, direction “decreasing,” and the current window.
3. The globe recolors. The right panel shows a ranked list of the strongest drying cities, with significance badges.
4. The user clicks the top city. The right panel opens the city file with the rainfall chart, the auto-generated key notes, and the caveat: “This is a grid-cell trend, not a station measurement.”
5. The user toggles “significant only.” The list shrinks. The answer is more honest.

**Why this works:** the question is spatial, not local. The globe is the natural answer surface. The ranking gives the user a next step.

### Journey C — “What changed in Jakarta?”

1. The user selects four variables, or asks: “What changed in Jakarta?”
2. Holmes scans the selected variables and ranks them by standardized signal strength.
3. The right panel opens the **Holmes Brief** and the city key notes: temperature, rainfall, aerosol, maximum temperature, with significance and evidence strength.
4. The map switches to composite mode. Cities are colored by the average standardized trend; cities with mixed signals get a neutral color and a split-ring icon.
5. The user clicks a mixed city and sees which variables drive the color and which are weak.
6. The user clicks **HOW SURE?** The globe switches to the Evidence Lens; the same city board recolors by evidence strength, and the notes re-sort.

**Why this works:** it directly answers NASA’s “too many variables” problem. It also makes the composite honest: the user can see the disagreement instead of a single misleading color.

### Journey D — “Is there a fire in South Sulawesi?”

1. The user asks, or a fire notice appears in the ticker.
2. Holmes finds FIRMS clusters in the region’s bounding box and flies to the strongest one.
3. The fire watch panel shows the detection count, summed FRP, date range, satellite, and the nearest city or province.
4. The answer says: “FIRMS detected 76 hot pixels in a 0.1° cluster in South Sulawesi, 10–14 November 2026, summed FRP 1,672 MW. This is a detection, not a confirmed wildfire.”
5. The user clicks “Open in FIRMS” for the authoritative map.

**Why this works:** it is timely, local, and visually dramatic, but the wording stays honest. It does not claim a wildfire incident.

### Journey E — “Show me the last decade”

1. The user drags the timeline or picks “2011–2025.”
2. The city halos recolor in under a second. The status line updates.
3. The city file’s chart and verdict update to the new window.
4. A small note says: “Shorter windows are noisier. Compare with the full record.”

**Why this works:** the timeline is a first-class control, not a filter buried in a settings panel. It teaches that the answer depends on the window.

### Journey F — “What did it look like?”

1. The user asks “What did Jakarta look like in 2001 versus 2025?” or clicks `THEN & NOW` in the city file.
2. The right panel opens the city file and scrolls to a split satellite comparison.
3. The left side is August 2001; the right side is August 2025. The sensor is MODIS Terra.
4. The user drags the handle and toggles `TRUE COLOR` / `FALSE COLOR`. True color shows urban growth; false color shows vegetation and burn scars.
5. The card says “Visual context, not a trend test.” The chart remains the evidence.
6. The user clicks `SHARE` to send the comparison card.

**Why this works:** it makes the trend tangible without pretending the image is a significance test. It pairs naturally with the Evidence Lens: “what changed, how sure, and what does it look like?”

### Journey G — Share a case

1. The user clicks “Share.”
2. The URL encodes the question, variables, window, season, selected city, and layer.
3. A colleague opens the link and sees the same board and city file.
4. The shared page includes a static “case card” with the verdict, the chart, the source, and the caveat.

**Why this works:** no accounts, no database of users, and a shareable artifact for judges and teachers.

## 9. The signature loop

```text
Question
  → resolve place and intent
  → set variables, window, season
  → compute or load trends
  → recolor the globe
  → fly to the place
  → open the right-panel brief
  → inspect the city and generate key notes
  → answer with evidence
  → follow-up
```

This loop is the product. Every feature should make one step of the loop faster, clearer, or more honest. If a feature does not, it is scope creep.

### The gap feature: Evidence Lens

The prior-art research found that most trend maps answer “which direction?” but not “how strong is the evidence?” Holmes turns that gap into a first-class map mode. The **Evidence Lens** switches the globe between four questions:

```text
EFFECT     what is changing?
EVIDENCE   how strong is the statistical evidence?
AGREEMENT  do the selected variables agree?
COVERAGE   do we have enough data?
```

The default is EFFECT. When the user asks “how sure?”, the same city board recolors by evidence strength, the right-panel notes re-sort, and the agent explains what changed. It uses the FDR q-values, sample size, coverage, and agreement that the stats engine already computes. See [`06-gap-analysis-and-evidence-lens.md`](06-gap-analysis-and-evidence-lens.md).

## 10. Positioning

| Product shape | Entry point | Signature | Weakness |
|---|---|---|---|
| **Generic trend dashboard** | Variable form | Chart | High barrier; forgettable |
| **Case Files** | Curated case | Guided evidence board | Less open-ended; limited to authored cases |
| **Trend Radar** | Place | Ranked variable scan | Strong local answer; weak spatial context |
| **Holmes** | Question | Question → globe → city file | Ambitious; needs discipline |

Holmes is not a rejection of the earlier work. It is a shell that can contain it:

- **Case Files** become “starter cases” in a drawer: Jakarta warming, Wisconsin aerosol, a seasonal flip.
- **Trend Radar** becomes the city scan: rank variables for one city.
- **Opposite Trends** becomes a comparison view: two cities, same variable, opposite signs.
- **Season Sleuth** becomes a season filter and a monthly heatmap in the city file.

The differentiator is the **question-to-globe loop**. The globe is the answer, not the wallpaper.

### Challenge alignment: the Resources-tab rule

The city board uses NASA POWER, a NASA service that is **not** listed on the challenge Resources tab. That is fine for the product, but risky for global-award eligibility. To be safe:

- Ship at least one **starter case** exported via a listed resource: MODIS AOD via **Giovanni**, AppEEARS NDVI/LST, or GES DISC hydrology. The existing LAADS CSV is a cross-check, not the eligibility path.
- Put that case in the Case Files drawer and in the demo: “The city board runs on POWER; the official-style case runs on MODIS AOD, the same product as the challenge video.”
- Cite the listed resource and the dataset version in the case provenance.
- Treat FIRMS as a bonus layer, not a substitute for the Resources-tab requirement.

This keeps the global board fast while keeping a listed NASA resource in the submission.

## 11. Scope

### Must ship

- Full-bleed MapLibre globe with the Osiris HUD composition.
- 60–100 curated city anchors with precomputed trends.
- One variable fully polished (`T2M`), plus 7 more variables available in the filter.
- Single-variable map mode with a real-unit legend.
- Four timeline presets plus a season filter.
- Right-panel Holmes Brief + auto-generated city key notes.
- City file with sparklines, one expanded chart, provenance, and caveats.
- Evidence Lens with Effect + Evidence modes.
- Chat with 7 core intents + 3 evidence follow-ups and a deterministic fallback.
- Cached FIRMS Indonesia layer with top clusters and notices.
- One starter case from a listed NASA resource: MODIS AOD via Giovanni (listed) or LAADS (access path), AppEEARS NDVI/LST, or GES DISC hydrology.
- Share URL and a case card.

### Stretch

- Multi-variable composite mode.
- Evidence Lens: Agreement + Coverage modes.
- **Satellite Then & Now:** true-color and false-color comparison from NASA GIBS (see [`07-satellite-then-now.md`](07-satellite-then-now.md)).
- “Rank cities” answers for any selected variable.
- Live FIRMS for the current viewport.
- Decade animation.
- Compare two cities.
- Case card + teacher notes for distribution.
- Mobile layout.
- Saved cases in local storage.

### Non-goals

- A continuous global trend surface.
- Arbitrary Earth-science variables outside the POWER catalog.
- Causal attribution.
- Forecasting.
- User accounts.
- A real-time wildfire alert service.
- A probability-of-truth score. The Evidence Lens shows statistical evidence strength, not the chance that a trend is true.
- An autonomous agent with arbitrary web or code access.
- A full 3D terrain/building/satellite stack.

## 12. Demo story (45–60 seconds)

| Time | Visual | Voice / text |
|---|---|---|
| 0:00 | Globe spins; city halos pulse | “Every city is a witness. Holmes asks NASA what it saw.” |
| 0:05 | Type “Is Jakarta getting warmer?” | “One question. No forms.” |
| 0:10 | Globe flies to Jakarta; right-panel brief | “+0.21 °C per decade. Significant. Twenty-five years of NASA data.” |
| 0:18 | Click “How sure?”; globe switches to Evidence Lens | “Most maps show the trend. Holmes shows how much to trust it.” |
| 0:26 | Click “Show all cities” | “The same signal, everywhere.” |
| 0:33 | Switch to rainfall + soil; composite; mixed city | “When variables disagree, Holmes says so.” |
| 0:41 | Fire notice appears; click | “And when the planet is burning right now, FIRMS shows it.” |
| 0:48 | Fire caveat card | “Detections, not claims. Evidence, not guesses.” |
| 0:54 | Timeline to 1981–2025 | “The window changes the answer. Holmes shows you why.” |
| 0:60 | Wordmark | “Holmes. Ask the planet a question.” |

Optional 5-second beat for the deck or a longer cut: open **Then & Now**, show true color, toggle false color, and say “The chart says what changed; the image shows what it looks like.” Keep it out of the 60-second cut unless the core flow is already fast.

The demo should be recorded in cached mode with a live-data backup. The agent should have a deterministic fallback for every demo question.

## 13. Product risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **“Another dashboard”** | Judges have seen many | Lead with the question-to-globe loop, not the feature list |
| **“AI gimmick”** | Chat can look unserious | Show the tool trace, the computed numbers, and the verification |
| **Scientific overclaim** | A wrong claim destroys credibility | Grid-cell labels, FDR, caveats, no causal language |
| **Method-dependent verdict ignored** | One test can overstate a trend | Show OLS HAC + Seasonal MK; conservative verdict; `METHOD-DEPENDENT` badge |
| **Globe performance** | A slow globe kills the demo | MapLibre, 100 markers, precomputed data, no heavy WebGL layers |
| **Scope creep** | 48 hours is short | One variable polished; feature freeze at hour 40 |
| **Data gaps** | AOD starts in 2001; some cities have short records | Coverage badges, minimum-year checks, per-variable windows |
| **Fire false positives** | Hot pixels are not wildfires | “Active fire detections,” confidence filter, caveat card |
| **Clouds or seasonality hide the image change** | A cloudy or mismatched image can mislead | Same-month dates, ±7-day fallback, clear-date helper, caveat |
| **Imagery overclaims the trend** | A picture is not a significance test | “Visual context, not a trend test”; chart stays the evidence |
| **Resolution expectations** | Users may expect spy-satellite detail | “250 m–1 km per pixel”; label the sensor and date |
| **Right panel overload** | Too many tabs and notes bury the answer | Three tabs; short brief; city file one click away |
| **Evidence misread as truth probability** | Undermines the honesty feature | “Statistical evidence” label; methods tooltip; no “90% sure” |
| **Agent answers only in chat** | The user asked for the response on the right | `openCityFile` is mandatory; verification checks the panel state |
| **Agent failure** | LLM latency or outage | Deterministic fallback, prewarmed questions, cached mode |

## 14. Success criteria

The concept succeeds if a first-time user can:

1. Ask a question in plain language.
2. Get a correct, sourced answer in the right panel in under 5 seconds.
3. See where else the signal appears.
4. Click a city and read the auto-generated key notes before opening a chart.
5. Switch to the Evidence Lens and understand how strong the evidence is.
6. Understand one caveat without opening a methods document.
7. Share the view.

The judges should remember one sentence: **“It turned my question into a map of evidence.”**
