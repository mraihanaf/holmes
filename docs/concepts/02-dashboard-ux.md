# 02 — Dashboard and UX

## 1. Design north star

**Osiris composition, Holmes purpose.**

Take the Osiris ingredients that make the screen feel like an instrument: a full-bleed globe, a near-black atmosphere, thin monospaced labels, glass panels at the edges, a status ticker, a slow idle spin, and a camera that moves like it is tracking something. Do not take the OSINT layer catalog, the 7px type, or the constant sci-fi decoration.

The globe is the hero. The HUD is the instrument panel. The center of the screen stays open for the planet and the question. Panels dock at the edges; they do not turn the page into a grid of cards.

## 2. Composition

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ HOLMES  EARTH SYSTEM DETECTIVE        CASE 014 · JAKARTA · T2M · 2001–25 │
│                                                    CACHED · 3 VARS · 96 CITIES · UTC │
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ VARIABLES     │                                          │ BRIEF FILE FIRE│
│               │                                          │               │
│ HEAT          │                 GLOBE                    │ JAKARTA       │
│  T2M      ●   │                                          │               │
│  T2M_MIN  ○   │       city halos · fire clusters         │ +0.21 °C/dec │
│ WATER         │                                          │ p < 0.001     │
│  PRECIP   ●   │                                          │               │
│  SOIL     ○   │                                          │ EVIDENCE      │
│ AIR           │                                          │  T2M  ▁▂▃▅  │
│  AOD      ○   │                                          │  RAIN ▂▅▃▇  │
│ LAND          │                                          │  SOIL ▅▃▂▁  │
│  SW_DWN   ○   │                                          │               │
│               │                                          │ [CHART]       │
│ TIMELINE      │                                          │               │
│  1981 ───●── 2025                                        │ PROVENANCE    │
│  [35Y] [25Y] [15Y] [CUSTOM]                              │               │
│               │                                          │               │
│ LEGEND        │                                          │               │
│  cool ◀─●─▶ warm                                         │               │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│  ASK HOLMES  “Is Jakarta getting warmer?”                    [ / ] [ ↑ ] │
├──────────────────────────────────────────────────────────────────────────┤
│ STATUS  NASA POWER · MERRA-2 · 300 months · p<0.001 · FIRE WATCH 3 CLUSTERS │
└──────────────────────────────────────────────────────────────────────────┘
```

Right panel tabs: **HOLMES BRIEF**, **CITY FILE**, **FIRE WATCH**. The chat input is the question box; the full answer opens in the brief. The left rail includes the Lens switch (`EFFECT / EVIDENCE / AGREEMENT / COVERAGE`).

Desktop is the primary target: 1280×720 minimum, 1920×1080 for the demo. The left rail is 240–280px; the right panel is 360–420px; the center is whatever remains. The chat is 560–720px wide and sits above the status ticker.

## 3. The globe

### 3.1 Base

- MapLibre GL 6 with `map.setProjection({ type: "globe" })`.
- CARTO Dark Matter or a custom dark monochrome style.
- `setSky` with a near-black sky, a soft horizon, and fog.
- CSS vignette and a very faint scanline overlay (0.02 opacity).
- No heavy bloom pass. Glow comes from marker design and CSS shadows.

### 3.2 Opening camera

- Center on the viewer’s rough longitude, latitude 20.
- Zoom 1.8, pitch 20, bearing 0.
- Ease into the pitch over about 1.2 seconds after `idle`.
- Slow idle spin at 0.5° per second when nothing is selected and the pointer is idle.
- Stop the spin on any pointer interaction, on selection, or under `prefers-reduced-motion`.

### 3.3 City markers

At global zoom, each city is a composite marker:

| Part | Meaning | Style |
|---|---|---|
| **Core dot** | The city location | 3–4px, bright, fixed screen size |
| **Halo** | Trend direction and magnitude | 18–28px soft radial glow, color from the diverging scale |
| **Ring** | Significance | 10–12px ring; solid if significant, dashed/dim if not, hollow if insufficient data |
| **Label** | City name | On hover, selection, or top-signal cities only |

The halo must not imply a geographic boundary. It is a screen-space signal, like a radar blip. At zoom 5 or higher, replace the halo with a hexagon marker around the city, a hairline border, and a label “MERRA-2 cell ≈ 55 × 69 km.” Do not draw a rectangle: the marker is a display abstraction, and the label carries the measurement support. At global zoom, the halo is the honest abstraction; at city zoom, the labeled cell is the honest geometry.

### 3.4 Marker density

- 60–100 city anchors for the MVP.
- At zoom below 3, show 30–40 anchor cities to avoid clutter.
- At zoom 3–5, show all cities.
- At zoom 5+, show the selected city’s cell and nearby cities.
- Use collision detection for labels, not for dots. Dots may overlap; labels may not.
- If two cities share a grid cell, merge them into one marker with a count badge.

### 3.5 Color semantics

Use a colorblind-safe diverging scale:

- **Decrease / cooling / drying:** blue `#5AA9FF`.
- **Neutral / no clear trend:** slate `#8FA6B2`.
- **Increase / warming / wetting:** amber `#F5B84B`.
- **Mixed signal:** desaturated neutral with a split-ring icon; do not use a confident color.
- **Insufficient data:** hollow gray ring; no fill.

Do not use red/green as the primary trend scale. Red is reserved for fire. Significance is encoded by the ring, not by color alone.

### 3.6 Selection

When a city is selected:

- Add a pulsing ring around the marker.
- Dim the other city halos slightly (opacity × 0.6) so the selected city reads.
- Fly to the city at zoom 5.5–6, pitch 25–35, duration 1.4–1.8s.
- Do not hide the rest of the globe; the comparison is the point.

When the chat changes the view:

- Show a small chip near the chat: “Holmes set T2M · 2001–2025 · [Undo].”
- The camera move is smooth and interruptible. A user scroll or drag cancels the flight.

### 3.7 Lens modes

The city board can be read through four lenses. The geometry does not change; the encoding does.

| Lens | Visual | Reading |
|---|---|---|
| **EFFECT** | Diverging halo (blue ↔ amber), ring = significance | “What is changing, and how fast?” |
| **EVIDENCE** | Sequential halo (gray → cyan → white), ring = direction | “How strong is the statistical evidence?” |
| **AGREEMENT** | Sequential halo (slate → cyan), hatch/split ring = mixed | “Do the selected variables agree?” |
| **COVERAGE** | Sequential halo (gray → white), hollow = insufficient | “Do we have enough data?” |

Rules:

- One lens at a time. The legend changes with the lens.
- In EVIDENCE mode, the ring color carries direction: amber rising, blue falling, slate mixed. A small arrow glyph makes it readable without color.
- In COVERAGE mode, a city with a short record is not “weak evidence”; it is “not enough evidence.” Use a hollow marker, not gray.
- Do not interpolate a continuous surface between cities. The marker is the data support.

### 3.8 Fire layer

- Off by default; toggled from the left rail or opened by a notice.
- All detections: heatmap, low opacity, ember colors.
- Top clusters: pulsing ring + tiny triangle or flame glyph.
- Cluster size scales with detection count; color scales with summed FRP.
- Keep fire markers visually distinct from city trend markers. Fire is angular and ember; trends are round and cool/warm.
- Do not auto-pan to a fire without user action. A notice can pulse and wait.

### 3.9 Optional layers

- Day/night terminator: cheap, high impact. Add it before data layers so markers stay bright.
- City labels: on hover/selection, plus top 10 signals.
- Country borders: low-contrast, optional.
- Satellite basemap: stretch. NASA GIBS raster tiles at zoom ≥ 5, with `TRUE COLOR` / `FALSE COLOR`. Never at global zoom; keep city markers above it.
- 3D terrain and buildings: not MVP. They add tile churn and do not help the trend story.
- Satellites, arcs, clouds, wind: not MVP. One signature pulse is enough.

## 4. Header and status

### 4.1 Left

```text
HOLMES
EARTH SYSTEM DETECTIVE
```

Wordmark in the HUD font, letter-spaced. A small mark can combine a latitude arc and a magnifier, but do not use a deerstalker or a pipe. The subtitle is functional: “EARTH SYSTEM DETECTIVE.” A third line, smaller: “DATA SOURCES: NASA POWER · GIBS · FIRMS.” Use factual attribution, not NASA branding.

### 4.2 Center

The active case breadcrumb:

```text
CASE 014 // JAKARTA // T2M // 2001–2025 // ANNUAL
```

It is a compact summary of the current state. Clicking a segment opens the corresponding control. If there is no case, show `NO CASE // ASK A QUESTION OR PICK A CITY`.

### 4.3 Right

Status chips, 9–10px HUD labels:

- `MODE: CACHED` or `LIVE`
- `LENS: EFFECT`
- `WINDOW: 2001–2025`
- `VARS: 3`
- `CITIES: 96`
- `FIRMS: 14 NOV 2026` or `FIRMS: OFF`
- `UTC 18:15:30`
- `[SHARE]`

Use color only for state: cyan for live, muted for cached, ember for fire watch. Do not animate every chip.

## 5. Left rail

### 5.1 Variable filter

Group variables by theme, not by NASA parameter code:

```text
HEAT
  Air temperature          T2M
  Minimum temperature      T2M_MIN
  Maximum temperature      T2M_MAX
WATER
  Rainfall                 PRECTOTCORR
  Root-zone soil wetness   GWETROOT
AIR
  Aerosol optical depth    AOD_55
  Wind speed               WS2M
ENERGY
  All-sky shortwave        ALLSKY_SFC_SW_DWN
```

Each row has:

- A checkbox or chip for selection.
- The plain-language name and the NASA code.
- A coverage dot: green = full window, amber = partial, gray = insufficient.
- A small unit label on hover.

Multi-select is allowed. The rail shows a count: `3 VARIABLES`. A `SELECT ALL` action selects the eight MVP variables; `CLEAR` resets to the default `T2M`.

When a variable is selected, the rail shows a small badge with its current city value if a city is selected: `+0.21`. This makes the rail feel connected to the board.

### 5.2 Mode switch

```text
MODE  [ SINGLE VARIABLE ]  [ COMBINED SIGNAL ]
```

- **Single variable:** the map uses the actual slope in real units. The legend shows the variable’s unit and domain.
- **Combined signal:** the map uses a standardized composite across the selected variables. The legend shows “σ per decade.” Mixed cities get a neutral split-ring.

The mode switch is disabled when only one variable is selected, with a tooltip: “Select two or more variables to combine.”

### 5.3 Lens switch

The **Lens** is separate from the variable mode. Mode decides what is combined. Lens decides how the map encodes the result.

```text
LENS  [ EFFECT ]  [ EVIDENCE ]  [ AGREEMENT ]  [ COVERAGE ]
```

| Lens | Question | Color encodes | Ring / mark encodes |
|---|---|---|---|
| **EFFECT** | What is changing, and how fast? | Diverging slope | Significance |
| **EVIDENCE** | How strong is the statistical evidence? | Sequential gray → cyan → white | Direction (amber rising / blue falling) |
| **AGREEMENT** | Do the selected variables agree? | Sequential agreement score | Mixed = hatch / split ring |
| **COVERAGE** | Do we have enough data? | Sequential record length | Insufficient = hollow |

The default is **EFFECT**. **EVIDENCE** is the signature gap feature and should ship with the MVP. **AGREEMENT** and **COVERAGE** are stretch. The legend changes with the lens; never show two encodings at once.

A `METHOD-DEPENDENT` result cannot be `STRONG`. Downgrade one level and show the badge; the user can open the methods drawer.

### 5.4 Timeline

```text
WINDOW
  1981 ─────────●──────── 2025
  [FULL 1981–2025] [35Y] [25Y] [15Y] [CUSTOM]

SEASON
  [ALL] [DJF] [MAM] [JJA] [SON] [MONTH ▾]

RESOLUTION
  [MONTHLY] [ANNUAL] [SEASONAL]
```

- The window controls the years used for the trend.
- The season controls which months are analyzed.
- The resolution controls the chart, not the trend method.
- AOD selection forces the start to 2001 or later. Show a note: “AOD coverage starts 2001.”
- A short window shows a warning: “15 years is noisy. Compare with the full record.”
- A custom window computes from cached monthly series; if the range is outside the cache, show a job and fetch POWER (stretch).

### 5.5 Legend

Single variable:

```text
T2M TREND  °C per decade
COOLING ◀───●───▶ WARMING
-0.5      0      +0.5
○ not significant   ● significant
```

Combined:

```text
COMBINED SIGNAL  σ per decade
DECREASING ◀───●───▶ INCREASING
-0.5      0      +0.5
◐ mixed signal   ○ not significant
```

Evidence lens:

```text
EVIDENCE AFTER FDR
WEAK ◀───●───▶ STRONG
gray       cyan / white
↗ rising   ↘ falling   ◐ mixed
○ insufficient data
```

The legend is always visible. It is the contract between color and meaning. In the Evidence lens, add a one-line tooltip: “Statistical evidence strength, not the probability that the trend is true.”

### 5.6 Layers

```text
LAYERS
  [x] City signals
  [ ] Fire watch
  [x] Labels
  [ ] Night side
  [ ] Country borders
  [ ] Satellite view (zoom ≥ 5)  [TRUE / FALSE]
```

Keep the list short. Each toggle has a keyboard shortcut shown on hover. The satellite basemap is a stretch; it only appears at city zoom, never at global zoom.

### 5.7 Collapse

At widths below 1100px, the left rail collapses to a vertical icon strip. Clicking an icon opens a drawer with the same controls. The map never shrinks below 60% of the viewport.

## 6. Center chat

### 6.1 Idle state

On first load, with no case selected, the chat is a large prompt centered over the globe. This is the hero moment: the planet is the backdrop, and the question is the entry point. After the first question or city selection, the chat docks to the bottom center so the city file and the globe stay usable.

In the docked state, a single-line input sits above the status ticker:

```text
┌──────────────────────────────────────────────────────────────┐
│  ASK HOLMES  Is Jakarta getting warmer?              [ / ] [↑] │
└──────────────────────────────────────────────────────────────┘
```

Below it, three rotating suggestion chips:

- “Is Jakarta getting warmer?”
- “How sure is that?”
- “Where is rainfall falling?”
- “What changed in my city?”
- “Is there a fire near me?”

The suggestions rotate every 6 seconds, paused on hover. They are not decorative; clicking one runs the question.

### 6.2 Focused state

On focus, the input expands to a 2–3 line composer. The suggestions remain. `Enter` sends; `Shift+Enter` adds a newline; `Esc` collapses. `/` focuses the input from anywhere. `?` opens the shortcut overlay.

### 6.3 Running state

Above the input, show a compact tool trace:

```text
HOLMES  resolving place … Jakarta, Indonesia
        loading NASA POWER … T2M, 2001–2025
        testing trend … Seasonal Sen + Seasonal Mann–Kendall
        opening city file … Jakarta
        rendering brief … verifying numbers …
```

Each line is a small HUD row with a status dot. The trace is collapsible. It is not a fake terminal; it reflects real tool calls. If the agent is using cached data, say `CACHE HIT` instead of `LIVE`.

### 6.4 Answer state

The full answer opens in the **right panel**, not above the input. The chat shows a one-line receipt so the thread remains readable:

```text
HOLMES → RIGHT PANEL
Jakarta is warming. [ OPEN BRIEF ]
```

The right panel opens the **HOLMES BRIEF** tab automatically. The city is already selected, the globe has flown to it, and the city key notes are loaded in the `CITY FILE` tab. The brief contains the headline, two or three key numbers, a short key-notes list, and action chips:

```text
HOLMES BRIEF · JAKARTA
Yes — Jakarta is warming.

+0.21 °C per decade
Seasonal Mann–Kendall p < 0.001 · 25 years · NASA POWER / MERRA-2

KEY NOTES
• Air temperature: rising +0.21 °C/decade, significant.
• Rainfall: rising +0.70 mm/day/decade, significant.
• Aerosol: rising +0.038/decade, significant.
• Maximum temperature: +0.12 °C/decade, not significant after FDR.
EVIDENCE: STRONG overall · 3 of 4 significant.

[ CITY FILE ] [ HOW SURE? ] [ SHARE ]
```

Rules:

- The full answer lives in the brief; the chat keeps only the question and the receipt.
- Headline first, number second, method third.
- No more than 80 words in the prose.
- Every number has a unit and a period.
- Every answer has a source tag.
- Every answer has a caveat if the record is short, the result is not significant, or multiple testing applies.
- The answer never says “caused.” It says “associated with” or “consistent with.”
- The brief is dismissible, but the receipt remains clickable.

### 6.5 Follow-up state

Follow-ups stay in the same thread. The thread grows upward to a maximum of 40% of the viewport; then it scrolls. The user can dismiss the thread with a small `×`; the filters and the city file remain.

Examples:

- “What about rainfall?” → keeps the city, changes the variable.
- “Since 2000?” → keeps the city and variable, changes the window.
- “How sure?” → switches to the Evidence Lens and re-sorts the key notes.
- “Do they agree?” → switches to the Agreement Lens.
- “Is the record long enough?” → switches to the Coverage Lens.
- “Where else?” → runs a city ranking.
- “Why?” → explains the method or offers a curated “possible explanations” card, clearly labeled as hypotheses.

### 6.6 Actions and undo

The agent can:

- Set the variable filter.
- Set the window and season.
- Fly to a city and open the right-panel brief.
- Switch the Lens (Effect / Evidence / Agreement / Coverage).
- Open the city file.
- Toggle the fire layer.
- Rank cities.

Every action is visible in the trace and reversible:

```text
HOLMES CHANGED THE VIEW  T2M · 2001–2025  [UNDO]
```

Do not let the agent silently change the user’s view. Do not let it hide the city file or clear a selection without an undo.

### 6.7 The Holmes brief

The right panel has three tabs: **HOLMES BRIEF**, **CITY FILE**, and **FIRE WATCH**. Only one is visible at a time.

- An agent answer opens **HOLMES BRIEF** for the resolved city.
- A user click on a city opens **CITY FILE** with the auto-generated key notes.
- A fire notice opens **FIRE WATCH**.
- If the brief is open and the user clicks the same city, keep the brief.
- If the user clicks a different city, switch to **CITY FILE** for that city. The old brief is not shown against the new city.
- If there is no brief for the current city, the brief tab shows `ASK HOLMES ABOUT THIS CITY`.

The brief is a panel state, not a modal. It never covers the globe. On mobile, the panel becomes a bottom sheet with the same tabs.

### 6.8 Errors

- **Unsupported question:** “I can answer city trends and fire detections. I can’t forecast or attribute causes. Try: ‘Is Jakarta getting warmer?’”
- **Ambiguous place:** show two or three candidates with country and coordinates. Do not guess.
- **No data:** “NASA POWER has no T2M series for this place and window. Try a nearby city or a longer window.”
- **Agent offline:** show the deterministic brief in the right panel and a tag: `ANALYST OFFLINE · DETERMINISTIC RESULT`.
- **Source error:** show the cached result and a `STALE` tag with the retrieval date.

## 7. Right panel

The right panel has three tabs: **HOLMES BRIEF**, **CITY FILE**, and **FIRE WATCH**. Only one is visible at a time. The panel is 360–440px wide, glass, scrollable, and dismissible. The agent’s full answer always opens in this panel; the center of the screen stays on the globe.

### 7.1 City file header

```text
JAKARTA, INDONESIA                   [×]
-6.20°, 106.85° · MERRA-2 cell · 2001–2025
```

Optional small actions: `COMPARE`, `SHARE`, `ASK`.

Below the header, a thin **challenge trace** strip makes the challenge steps explicit:

```text
VARIABLE → REGION → SERIES → SIGNIFICANCE
T2M      → Jakarta → 2001–2025 → p < 0.001
```

This is the Relevance anchor. The globe and agent are enhancements; this strip shows the required investigation.

### 7.2 Key notes (auto-generated)

When the user clicks a city, the panel opens with a **Key Notes** summary generated from computed results, not from the LLM:

```text
HOLMES NOTES · AUTO-GENERATED
JAKARTA · 2001–2025 · MERRA-2 cell

• Air temperature: rising +0.21 °C/decade, significant (q = 0.004).
• Rainfall: rising +0.70 mm/day/decade, significant (q = 0.014).
• Aerosol: rising +0.038/decade, significant (q < 0.001).
• Maximum temperature: +0.12 °C/decade, not significant after FDR (q = 0.38).

EVIDENCE: STRONG overall · 3 of 4 significant · 2 strong, 1 moderate, 1 weak.
CAVEAT: MERRA-2 grid cell, not a weather station.

[ ASK HOLMES ] [ HOW SURE? ] [ COMPARE ]
```

Rules:

- Generated from the computed trend table with deterministic templates.
- Summarizes the city summary set; the map filter may be narrower.
- Sorted by variable category by default; `HOW SURE?` re-sorts by evidence strength.
- If no variable is significant: “No clear trend in this window. The strongest signal is … but it is not significant after FDR.”
- If variables disagree: “Mixed signals: temperature rising, rainfall falling.”
- If the record is short: “Short record: 12 years. Treat the verdict as provisional.”
- If there is not enough data: “Not enough data for a trend. Showing the available series.”
- The notes must match the chart and the verdict. They are not a separate analysis.
- The `HOW SURE?` action switches the globe to the Evidence Lens and re-sorts the notes by evidence.

### 7.3 Verdict card

```text
WARMING
+0.21 °C per decade
p < 0.001 · CI band on chart
25 years · 300 months · EVIDENCE: STRONG
```

The verdict uses a verb, a direction, and a number. If the result is not significant:

```text
NO CLEAR TREND
+0.04 °C per decade
p = 0.42
25 years · not significant
```

Do not write “no change.” Write “no clear trend in this window.”

If the two methods disagree:

```text
METHOD-DEPENDENT
-0.010 AOD/decade
Seasonal MK p = 0.002 · OLS HAC p = 0.128
35 years · EVIDENCE: WEAK · show both
```

The headline uses the more conservative verdict. The city file shows both methods and a short explanation. This is a Validity feature, not a footnote.

### 7.4 Evidence stack

One row per selected variable:

```text
T2M      Air temperature       +0.21 °C/dec   p < 0.001   ●  ▁▂▃▅▆
PRECIP   Rainfall              +0.70 mm/d/dec p < 0.001   ●  ▂▅▃▇▆
T2M_MAX  Maximum temperature   +0.12 °C/dec   p = 0.019   ○  ▃▄▃▅▄
AOD      Aerosol               +0.038 /dec    p < 0.001   ●  ▁▂▃▄▅
```

`p` is the raw p-value; `q` is the FDR-adjusted value when the row came from a scan. The significance ring uses `q`. When the Evidence Lens is active, add an evidence badge (`STRONG`, `MODERATE`, `WEAK`, `INSUFFICIENT`) to each row and sort by evidence strength. Each row is clickable. The selected row expands into the full chart. The sparkline is enough for comparison; the full chart is the evidence.

### 7.5 Expanded chart

- A one-sentence verdict above the chart: “Air temperature: rising +0.21 °C per decade, significant (p < 0.001).”
- X axis: years, labeled.
- Y axis: variable units, labeled.
- Raw monthly values: thin line or dots.
- 12-month rolling mean: thicker line.
- Trend line: solid, with a 95% confidence band.
- Missing values: gaps, not zero.
- Toggle: `RAW` / `DESEASONALIZED` / `ANNUAL`.
- Footer: `n = 300 months · Seasonal Sen slope · Seasonal Mann–Kendall · NASA POWER`.
- Tooltip: date, value, unit, coverage, source.

If the result is `insufficient_data`, show the available series and replace the trend line with an explanation. Do not hide the data.

### 7.6 Provenance and caveats

```text
SOURCE      NASA POWER / MERRA-2 (T2M)
PARAMETER   T2M — Temperature at 2 m (°C)
PERIOD      2001–2025 · 300 months
RETRIEVED   2026-11-14
METHOD A    Seasonal Sen slope · Seasonal Mann–Kendall
METHOD B    OLS · HAC (12 lags)
METHOD CHECK agree · both significant
CITATION    NASA POWER (2026), ...
```

Source is per variable. Meteorology is MERRA-2; `AOD_55` is CERES SYN1deg. The panel must not label every variable as MERRA-2.

Caveats, in plain language:

- “This is a MERRA-2 grid cell, not a weather station.”
- “The trend is statistical, not causal.”
- “Multiple variables were tested; p-values are FDR-adjusted.”
- “A short window is noisier; compare with the full record.”

### 7.7 Actions

- `VIEW ALL VARIABLES` — expands the evidence stack to the full catalog.
- `HOW SURE?` — switches to the Evidence Lens and re-sorts the key notes.
- `THEN & NOW` — scrolls to the satellite comparison or opens it full screen.
- `ASK ABOUT THIS CITY` — prefills the chat.
- `COMPARE` — opens a second city slot (stretch).
- `SHARE` — copies a URL and a case card.
- `EXPORT` — CSV/PNG (stretch).

### 7.8 Then & Now satellite comparison

Below the evidence stack, a `THEN & NOW` card:

```text
THEN & NOW · JAKARTA
[ AUG 2001 ]        [ split swipe ]        [ AUG 2025 ]

[ TRUE COLOR ]  [ FALSE COLOR ]        [ OPEN FULL SCREEN ]

MODIS Terra · 250 m–1 km per pixel · NASA GIBS
Visual context, not a trend test.
```

- The split handle compares the start and end of the timeline.
- Default dates are the same calendar month in the start and end years.
- `TRUE COLOR` is natural color; `FALSE COLOR` is MODIS 7-2-1 or VIIRS M11-I2-I1.
- A visible legend explains false color: burn scars red-brown, vegetation green, water dark, clouds white.
- Show the sensor, date, resolution, and attribution.
- If the image is cloudy, show a `CLOUDY` badge and `FIND CLEARER DAY`.
- `OPEN FULL SCREEN` expands to a large split view with a crossfade.
- The caveat is always visible: “Visual context, not a trend test.”

The full-screen view:

```text
┌──────────────────────────────────────────────────────────────┐
│ JAKARTA · THEN & NOW                      [TRUE] [FALSE] [×] │
│                                                              │
│   AUG 2001                 │                 AUG 2025        │
│   MODIS Terra              │                 MODIS Terra      │
│                            │                                  │
│        ◀─────────── drag ──┼── handle ─────────────────▶      │
│                                                              │
│ [ PLAY CROSSFADE ]  [ FIND CLEARER DAY ]  [ SHARE ]          │
│ NASA GIBS · MODIS Terra · 250 m–1 km per pixel               │
│ Visual context, not a trend test.                            │
└──────────────────────────────────────────────────────────────┘
```

Do not put the comparison behind a separate top-level tab. It belongs in `CITY FILE`, because it is part of the city evidence. The full-screen view is an overlay, not a new page.

### 7.9 Fire watch panel

```text
FIRE WATCH                          [×]
3 clusters in view · FIRMS NRT · 10–14 Nov 2026

SOUTH SULAWESI                      76 detections
1,672 MW · 10–14 Nov · South Sulawesi province
[ VIEW ] [ OPEN IN FIRMS ]

NORTH MALUKU                        95 detections
1,319 MW · 10–14 Nov · North Maluku province
[ VIEW ] [ OPEN IN FIRMS ]
```

The panel is a list, not a map. The map shows the clusters; the panel explains them. The caveat sits at the bottom, always visible:

> FIRMS detects hot pixels. They can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. This is not a confirmed incident. Check BNPB/local authorities.

## 8. Bottom ticker

A thin line above the bottom edge, inspired by the Osiris status ticker. It rotates every 6–8 seconds, pauses on hover, and is static under reduced motion.

Items:

- `JAKARTA T2M +0.21 °C/decade · p<0.001`
- `96 CITIES · 3 VARIABLES · 2001–2025`
- `LENS: EVIDENCE · 3 STRONG · 1 WEAK`
- `FIRMS // SOUTH SULAWESI // 76 DETECTIONS // 1,672 MW // 10–14 NOV 2026`
- `NASA POWER / MERRA-2 · RETRIEVED 2026-11-14`
- `METHOD: SEN SLOPE · MANN–KENDALL · FDR`

Each item is clickable. A city item opens the city file; a fire item opens the fire panel; a method item opens the methods drawer. The ticker is informative, not decorative.

## 9. Visual system

### 9.1 Palette

| Token | Value | Use |
|---|---|---|
| `--bg-void` | `#04070A` | Page, map background |
| `--bg-panel` | `rgba(5, 20, 16, 0.86)` | Glass panels |
| `--border` | `rgba(0, 255, 156, 0.16)` | Panel borders |
| `--accent` | `#00FF9C` | HUD identity, active controls |
| `--accent-dim` | `#00B36B` | Secondary HUD |
| `--cyan` | `#6FE7FF` | Data, live status, source tags |
| `--amber` | `#F5B84B` | Increase / warming / wetting |
| `--blue` | `#5AA9FF` | Decrease / cooling / drying |
| `--slate` | `#8FA6B2` | Neutral / no clear trend |
| `--ember` | `#FF5C3A` | Fire detections |
| `--text` | `#D7F7E8` | Primary text |
| `--text-dim` | `#7FA995` | Secondary text |
| `--text-muted` | `#3F6656` | Labels |

The Osiris green is the identity. Amber, blue, and ember are data colors. Do not use amber for UI chrome; it would compete with the trend scale.

### 9.2 Typography

- HUD: `JetBrains Mono`, 10–12px, uppercase, letter-spacing 0.12–0.18em.
- Body: `Inter`, 13–14px.
- Chart labels: 11px minimum.
- Verdict numbers: 20–24px, tabular numerals.
- No text below 10px. Osiris’s 7px labels are not acceptable for a projector.

### 9.3 Panels

```css
background: rgba(5, 20, 16, 0.86);
backdrop-filter: blur(20px) saturate(1.2);
border: 1px solid rgba(0, 255, 156, 0.16);
border-radius: 10px;
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
```

Use few panels. A full-width card grid would destroy the globe composition. Panels should feel like instruments floating over the planet.

### 9.4 Tags

Small bordered tags for state:

- `CACHED` (muted)
- `LIVE` (cyan)
- `SIGNIFICANT` (green)
- `NOT SIGNIFICANT` (slate)
- `INSUFFICIENT` (gray)
- `FIRE WATCH` (ember)
- `STALE` (amber)

Do not tag every sentence. Tags are for state, not decoration.

### 9.5 Charts

- Dark background, no gridlines except a faint zero line.
- Trend line in the variable’s map color.
- Confidence band at 12–18% opacity.
- Raw data in a muted gray; the rolling mean in white.
- No chartjunk, no 3D pies, no radar charts.
- One axis per chart. If two units are needed, use two stacked charts, not a dual axis.

## 10. Motion

- Splash: under 2 seconds if the map is ready; 7-second hard timeout.
- HUD reveal: staggered 0.15–0.6s after `idle`.
- Globe idle spin: 0.5°/s; stop on interaction.
- Fly-to city: 1.4–1.8s; interruptible.
- Selection pulse: 2s loop, subtle.
- Fire pulse: 2.4s loop, ember; only for top clusters.
- Timeline recolor: 150–250ms crossfade.
- Chart update: 200ms.
- No constant CRT flicker, no heavy bloom, no particle storm.

Under `prefers-reduced-motion`: no spin, no pulses, no long flights; use cuts or 150ms fades.

## 11. Responsive behavior

### Desktop (1280+)

Full composition: left rail, globe, right panel, chat, ticker.

### Tablet (768–1279)

- Left rail collapses to icons; drawer on tap.
- Right panel overlays the globe from the right; dismissible.
- Chat remains bottom center, 70% width.
- Header compresses: wordmark + mode + share.

### Mobile (<768)

- Globe full screen.
- Chat is a bottom bar; tapping expands a sheet.
- Holmes brief, city file, and fire watch are bottom sheets.
- Filters are a full-screen drawer.
- Hide the ticker or show one item.
- This is a stretch, not the demo target.

## 12. States

| State | What the user sees |
|---|---|
| **Loading** | Globe skeleton + `INITIALIZING EARTH DATA`; never a blank screen |
| **No case** | Globe + suggestion chips + `ASK A QUESTION OR PICK A CITY` |
| **City selected** | Right panel `CITY FILE` + auto key notes + verdict + evidence stack |
| **Agent answer** | Right panel `HOLMES BRIEF` + selected city + key notes; chat shows a receipt |
| **Lens switch** | Board recolors; legend updates; key notes re-sort |
| **Insufficient data** | Series + explanation; no trend line |
| **Then & Now loading** | Split-frame skeleton + `LOADING SATELLITE IMAGERY` |
| **Then & Now cloudy** | Image + `CLOUDY` badge + `FIND CLEARER DAY` |
| **Imagery starts after 2000** | `SATELLITE IMAGERY STARTS IN 2000`; trend chart still works |
| **Imagery error** | Cached snapshot + `STALE` tag + retry |
| **Source error** | Cached result + `STALE` tag + retry |
| **Agent running** | Tool trace + cancel |
| **Agent error** | Deterministic brief + `ANALYST OFFLINE` |
| **Fire watch off** | No fire markers; layer toggle visible |
| **Fire watch on, no fires** | `NO ACTIVE FIRE DETECTIONS IN VIEW` |
| **Share** | URL copied + case card preview |

## 13. Accessibility

- Contrast ratio at least 4.5:1 for body text.
- Focus rings on every interactive element; not color-only.
- Keyboard: `/` chat, `Esc` close, `Tab` through panels, `Enter` select, arrow keys for city list.
- `aria-live` for the brief headline, key notes, verdict, and fire notice.
- Do not encode significance by color alone; use the ring and the text badge.
- Evidence level also has a text badge (`STRONG`, `MODERATE`, `WEAK`, `INSUFFICIENT`).
- Do not use red/green as the primary trend scale.
- Charts have a text summary and a data table alternative.
- Satellite images have alt text with date, sensor, and location; the split handle is keyboard operable.
- Reduced motion respected.
- Map has a keyboard-accessible city list alternative.

## 14. Acceptance criteria

- The globe is visible in under 2 seconds on a warm deploy.
- A city click opens the file in under 1 second.
- Changing a variable recolors the board in under 250ms.
- Changing a timeline window recolors the board in under 500ms from cache.
- The right-panel brief appears in under 5 seconds for a cached question.
- An agent answer opens `HOLMES BRIEF` for the resolved city and flies the globe to it; the chat shows only a one-line receipt.
- A city click opens `CITY FILE` with auto-generated key notes in under 1 second.
- Switching the Lens recolors the board and updates the legend in under 250ms.
- Key notes match the computed results and the chart.
- The Evidence Lens says “statistical evidence,” never “probability of truth.”
- The Then & Now card shows start/end dates, sensor, resolution, attribution, and the “visual context, not a trend test” caveat.
- True color and false color both render; the split handle works with mouse, touch, and keyboard.
- The fire notice appears without moving the camera.
- No text is smaller than 10px.
- The layout works at 1280×720 and 1920×1080.
- The share URL restores the same question, variables, window, season, city, layer, and lens.
- The app works with `DEMO_MODE=cached` and no external data calls.
- No console errors when WebGL2 is unavailable; show a clear fallback.
- The HUD is readable from across a room; the Osiris 7px type is not copied.
