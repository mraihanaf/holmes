# 03 — Trend engine and data feasibility

This document answers the technical question behind the concept: **can the globe honestly color cities by trends, combine several variables, and respond to a timeline?** Yes, with a few important constraints. The constraints are scientific, not computational.

## 1. What the map is actually showing

A city marker is not a measurement of the whole city. NASA POWER returns a value for the **MERRA-2 grid cell** that contains the point, roughly 0.5° latitude × 0.625° longitude (about 55 × 69 km at the equator). The trend belongs to that cell and that time window.

This matters for the design:

- At global zoom, use a **screen-space halo** around the city. It is a signal blip, not a boundary.
- At city zoom, replace the halo with the **actual cell footprint**. Draw a translucent rectangle or hexagon with a hairline border and label it “MERRA-2 cell ≈ 55 × 69 km.”
- Never draw a filled polygon that looks like the city’s administrative boundary unless you actually have that boundary and a trend computed for it.
- The city file must say “MERRA-2 grid cell, not a weather station” near the provenance.

A continuous colored surface over the globe is **not** an MVP feature. NASA POWER’s regional endpoint returns a box average, not a grid of cells. A true surface would require gridded MERRA-2, GLDAS, or MODIS data, a preprocessing pipeline, and a tile layer. That is a different project.

## 2. Data sources and coverage

### 2.1 Primary: NASA POWER monthly point API

```
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=T2M,PRECTOTCORR,GWETROOT,AOD_55
  &community=AG
  &longitude=106.85
  &latitude=-6.2
  &start=2001
  &end=2025
  &format=JSON
```

- No login for the point endpoint.
- Up to 20 parameters per request.
- Missing values are `-999`.
- `ANN` is a 13th column; drop it before melting monthly data.
- A point is a MERRA-2 grid cell, not a station.
- CORS is open for simple GET requests; do not add custom headers.

### 2.2 Variable catalog for the MVP

| Plain name | POWER parameter | Unit | Coverage | Notes |
|---|---|---|---|---|
| Air temperature | `T2M` | °C | 1981–present | MERRA-2 |
| Minimum temperature | `T2M_MIN` | °C | 1981–present | MERRA-2 |
| Maximum temperature | `T2M_MAX` | °C | 1981–present | MERRA-2 |
| Rainfall | `PRECTOTCORR` | mm/day | 1981–present | MERRA-2, corrected |
| Root-zone soil wetness | `GWETROOT` | fraction | 1981–present | MERRA-2 |
| Surface soil wetness | `GWETTOP` | fraction | 1981–present | MERRA-2 |
| Relative humidity | `RH2M` | % | 1981–present | MERRA-2 |
| Wind speed at 2 m | `WS2M` | m/s | 1981–present | MERRA-2 |
| All-sky shortwave | `ALLSKY_SFC_SW_DWN` | MJ/m²/day | 1981–present | CERES/SRB |
| Aerosol optical depth | `AOD_55` | dimensionless | **2001–present** | CERES SYN1deg, not MODIS |

Recommended MVP set: `T2M`, `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`, `GWETROOT`, `AOD_55`, `WS2M`, `ALLSKY_SFC_SW_DWN`. That is eight variables: enough to feel rich, few enough to explain.

### 2.3 What is not in the live city layer

- **MODIS AOD**: the challenge video uses MODIS. POWER’s `AOD_55` is CERES SYN1deg. They are related but not the same product. If the demo needs MODIS AOD, use the precomputed MODIS files already in `docs/problems/assets/modis_aod/` for a curated Wisconsin/Jakarta case. Do not label `AOD_55` as MODIS.
- **MODIS NDVI/LST**: possible through ORNL DAAC or AppEEARS, but not a live per-city layer in 48 hours. Precompute a few cases if needed.
- **Ocean variables**: not in the standard POWER monthly point API. Do not put sea-surface temperature on the city board.
- **Station observations**: POWER is reanalysis, not a station. Do not claim “the weather station at Jakarta.”

### 2.4 Satellite imagery (supporting layer)

NASA **GIBS** provides the daily imagery behind NASA Worldview. It is public, no login, and suitable for browser tiles.

| Product | Layer | Start | Use |
|---|---|---|---|
| MODIS Terra true color | `MODIS_Terra_CorrectedReflectance_TrueColor` | 2000-02-24 | Urban growth, land cover, water |
| MODIS Terra false color | `MODIS_Terra_CorrectedReflectance_Bands721` | 2000-02-24 | Burn scars, vegetation |
| MODIS Aqua true color | `MODIS_Aqua_CorrectedReflectance_TrueColor` | 2002-07-03 | Backup sensor |
| MODIS Aqua false color | `MODIS_Aqua_CorrectedReflectance_Bands721` | 2002-07-03 | Backup sensor |
| VIIRS SNPP true color | `VIIRS_SNPP_CorrectedReflectance_TrueColor` | 2015-11-24 | Higher-resolution backup |
| VIIRS SNPP false color | `VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1` | 2015-11-24 | Burn scars, vegetation |
| VIIRS NOAA-20 true color | `VIIRS_NOAA20_CorrectedReflectance_TrueColor` | 2018-01-05 | Newer sensor |
| VIIRS NOAA-20 false color | `VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1` | 2018-01-05 | Burn scars, vegetation |

Tile URL:

```text
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg
```

Important limits:

- **Resolution:** about 250 m–1 km per pixel. This is not spy-satellite imagery.
- **Clouds:** daily composites are often cloudy. Use same-month dates, ±7-day fallback, and a clear-date helper.
- **Seasonality:** compare the same calendar month at both ends.
- **Coverage:** imagery starts in 2000. Do not show a “then” image for 1981.
- **Not a trend test:** the image is visual context. The chart and the significance test are the evidence.

## 3. City model

### 3.1 City list

Use a curated list of 60–100 cities:

- 30–40 global anchors: megacities across regions, so the globe does not look empty.
- 40–60 regional cities: Indonesia and Southeast Asia first, because the hackathon is in Jakarta and the local story matters.
- One city per MERRA-2 cell. If two cities fall in the same cell, keep the larger one and mark the other as an alias.

Suggested fields:

```json
{
  "id": "jakarta",
  "name": "Jakarta",
  "country": "Indonesia",
  "lat": -6.2,
  "lon": 106.85,
  "population": 10562088,
  "timezone": "Asia/Jakarta",
  "anchorRank": 1,
  "aliases": ["DKI Jakarta"]
}
```

Sources for coordinates: Natural Earth populated places (public domain) or a hand-curated CSV. Keep the list in the repo so the demo is reproducible.

### 3.2 Why 100 cities, not 10,000

- 100 markers render easily and stay legible.
- 100 cities × 8 variables × 45 years is a tiny dataset.
- The story is “compare cities,” not “map every pixel.”
- A live arbitrary-city query can be a stretch feature. The curated board is the demo.

## 4. The colored mark zone

### 4.1 Three levels of honesty

| Level | Visual | What it means | Verdict |
|---|---|---|---|
| **A. Halo** | Soft screen-space glow + core dot | “This city’s data cell has a trend” | MVP, global zoom |
| **B. Cell footprint** | Actual MERRA-2 rectangle/hex | “This is the data support” | MVP, city zoom |
| **C. Surface** | Continuous color field | “Every point has a trend” | Not MVP; needs gridded data |

Do **not** draw Voronoi cells around city points. A Voronoi tessellation invents boundaries and implies that the trend applies across the whole cell. It looks like a zone, but it is not a measurement. Use the halo or the actual MERRA-2 cell instead.

### 4.2 Marker anatomy

- **Core dot:** city location, 3–4px, bright.
- **Halo:** trend color, 18–28px, soft radial falloff. Fixed screen size, not geographic.
- **Ring:** significance. Solid if some selected evidence is significant; dashed/dim if not; hollow if insufficient data.
- **Split ring:** mixed signal across selected variables.
- **Label:** city name on hover, selection, or top signals.

### 4.3 Color scale

Single variable:

- Map the per-decade slope `B` to a diverging scale.
- Domain: symmetric around zero, using the 5th–95th percentile of `|B|` across cities for that variable and window. This adapts to the variable’s natural range.
- Example: `T2M` domain might be ±0.5 °C/decade; `PRECTOTCORR` might be ±1.0 mm/day/decade; `AOD_55` might be ±0.05/decade.
- Show the actual numbers in the legend.

Multi-variable:

- Map the composite `Z` (standardized) to the same diverging scale.
- Domain: ±0.5 σ/decade, or the 5th–95th percentile of `|Z|`.
- Label the legend “σ per decade,” not a physical unit.

Colors: blue for decreasing, slate for neutral, amber for increasing. Red is reserved for fire. Do not use red/green as the trend scale.

If most cities share the same sign, the map still encodes magnitude, but the contrast may be subtle. A “relative to global median” toggle is a useful stretch: it subtracts the median trend across cities so local outliers stand out. Keep the absolute scale as the default.

### 4.4 Significance ring

For a single variable:

- Solid ring: FDR-adjusted `p < 0.05`.
- Dashed/dim ring: not significant.
- Hollow ring: fewer than the minimum years, or no data.

For multiple variables:

- Solid ring: at least one selected variable has FDR-adjusted `p < 0.05` and its sign matches the composite.
- Split ring: the variables disagree (`agreement < 0.67`).
- Hollow ring: none of the selected variables has enough data.
- The city file shows the exact count: “2 of 3 variables significant.”

The ring is not a claim that the composite itself has a p-value. The composite is a summary; the evidence is per variable.

### 4.5 Clutter

- 30–40 anchors at zoom < 3.
- All cities at zoom 3–5.
- Selected city + neighbors at zoom > 5.
- Labels collide; dots may overlap.
- Merge cities in the same cell.
- Do not animate every halo. Only the selected city pulses.

### 4.6 Evidence Lens

The Evidence Lens is a second way to read the same city board. It does not add a data source; it re-encodes the statistics already computed.

| Lens | Color encodes | Ring / mark encodes |
|---|---|---|
| **EFFECT** | Signed slope (diverging) | Significance |
| **EVIDENCE** | Evidence level after FDR (sequential) | Direction (amber rising / blue falling) |
| **AGREEMENT** | Agreement score (sequential) | Mixed = hatch / split ring |
| **COVERAGE** | Valid years / expected years (sequential) | Insufficient = hollow |

Evidence levels for one variable:

| Level | Rule |
|---|---|
| **STRONG** | `q < 0.01` and at least 20 years |
| **MODERATE** | `q < 0.05` |
| **WEAK** | `q >= 0.05` but at least 10 years |
| **INSUFFICIENT** | fewer than 10 years or too many gaps |

For multiple variables:

```text
evidence = significant variables that agree with the composite / selected variables
```

| Level | Rule |
|---|---|
| **STRONG** | at least two-thirds are significant after FDR and agree with the composite |
| **MODERATE** | at least one-third are significant and agree |
| **WEAK** | some evidence, but less than one-third |
| **MIXED** | variables disagree |
| **INSUFFICIENT** | no variable has enough data |

`MIXED` is a flag shown with the split ring, not a replacement for the evidence level. A city can have “STRONG evidence” for a composite that mixes a rising temperature and a falling rainfall; the split ring and the notes explain the disagreement.

The exact thresholds are tuning parameters. Put them in the methods drawer and the legend tooltip.

**Do not call this a probability.** A p-value is not the probability that the trend is true. The UI says “statistical evidence strength,” not “confidence” or “chance.” The city file says “EVIDENCE: STRONG,” not “90% sure.”

The result object already has what the lens needs: `q`, `nYears`, `coverage`, `z`, and `agreement`. Add a derived `evidenceLevel` field so the client does not reimplement the thresholds. The right-panel key notes use the same levels and thresholds.

See [`06-gap-analysis-and-evidence-lens.md`](06-gap-analysis-and-evidence-lens.md) for the prior-art rationale.

## 5. Trend computation

### 5.1 Series preparation

For each city, variable, and window:

1. Load monthly values.
2. Replace `-999` with missing.
3. Keep the monthly series. Do not aggregate before the trend test.
4. Use **Seasonal Mann–Kendall** with `period = 12`. It compares each calendar month only with the same month in other years, so the seasonal cycle is handled without subtracting a climatology.
5. Require at least 10 valid years (120 months) for a trend; prefer 20+.
6. For display, also compute annual means and seasonal means. The chart toggle uses those, but the headline test stays Seasonal MK.

### 5.2 Slope and significance

Use two methods: Seasonal Sen/MK here, and OLS HAC in 5.5.

- **Seasonal Sen slope**: compute Sen’s slope within each calendar month, then take the median across months. Robust to outliers.
- **95% confidence interval** for the slope (Sen’s monthly CI or a bootstrap; label which).
- **Seasonal Mann–Kendall** test for monotonic trend.
- **Hamed–Rao correction** or a correlated-seasonal test for autocorrelation when the implementation supports it.
- Convert the slope to **per decade**: `B = 10 × slope_per_year`.

Unit trap: `mk.original_test(monthly_values).slope` is per **month**, while `mk.seasonal_test(monthly_values, period=12).slope` is per **year**. Test the unit once with a synthetic series of known slope. Multiply by 10 only when the slope is per year.

OLS with HAC standard errors is the second method in 5.5. When the methods disagree, show both and use the conservative verdict. Do not run five tests and pick the one that looks best.

### 5.3 Minimum data

| Condition | Behavior |
|---|---|
| < 10 valid years | `insufficient_data`; show the series, no trend line |
| 10–14 years | Compute, but show a “short record” caveat |
| 15+ years | Normal display |
| AOD start < 2001 | Shift the window to 2001; show a note |
| Gaps > 20% of months | Show a coverage warning |

### 5.4 Multiple testing

The globe tests many cities and variables. Without correction, some will look significant by chance.

- For a single variable across cities: Benjamini–Hochberg FDR across the cities in the current board.
- For a city scan across variables: BH FDR across the selected variables.
- For a single city-variable question: show the raw p-value and note that it is one test; if it came from a scan, show the FDR-adjusted value too.
- The city file should display both when relevant: `p = 0.003 · q = 0.021`.

Do not hide the number of tests. A line like “8 variables tested, FDR-adjusted” is a credibility signal.

### 5.5 Method cross-check

A trend verdict should not depend on one test. Use two methods and show when they disagree.

**Method A — Seasonal Mann–Kendall + Sen slope.** Robust, non-parametric, handles seasonality by comparing each month with the same month in other years.

**Method B — OLS with HAC standard errors.** Fit a linear trend on the deseasonalized monthly series (monthly anomalies or month dummies), with Newey–West HAC standard errors (e.g., 12 lags) for autocorrelation.

Rules:

- Report both slopes and both p-values in the city file.
- Headline verdict uses the **more conservative** method when they disagree at the 5% level.
- Set `methodDependent = true` when one method is significant and the other is not.
- Show a `METHOD-DEPENDENT` badge and a short explanation: “The verdict depends on the test. Both are shown.”
- The Evidence Lens should not show `STRONG` for a method-dependent result. Downgrade one level or show a split badge.

Example from the research:

```text
Wisconsin AOD
OLS p = 0.056 · HAC p = 0.128 · Seasonal MK p = 0.0015 · Sen p < 0.05
Verdict: METHOD-DEPENDENT — do not call it a clear trend.
```

Jakarta T2M is significant under both methods; it can be `STRONG`. Wisconsin AOD is method-dependent; it should be `MODERATE` or `WEAK` with a `METHOD-DEPENDENT` badge.

This is a direct Validity improvement. It also makes the Evidence Lens more honest: evidence strength includes method agreement, not just one p-value.

### 5.6 Effect size versus significance

A trend can be statistically significant but practically small. Show both:

- The slope in real units.
- The confidence interval.
- A plain-language magnitude: “about +0.2 °C per decade.”
- The record length.

Avoid “important” or “dangerous” unless a cited threshold supports it. The app reports the trend; it does not judge policy.

## 6. Combining multiple variables

### 6.1 Why raw averages are wrong

You cannot average °C/decade, mm/day/decade, and a dimensionless aerosol trend. The units are incompatible, and a variable with a large numerical range would dominate. The combination must be **standardized**.

### 6.2 Standardized slope

For variable `v`:

```
B_v = Sen slope per decade
s_v = 1.4826 × MAD(detrended annual means)
z_v = B_v / s_v
```

`z_v` is the change per decade in robust standard deviations of the detrended annual series. It is dimensionless. It answers: “How large is the trend compared with the variable’s normal year-to-year variability?” The trend test itself stays Seasonal Mann–Kendall on the monthly series; annual means are used only for the scale.

A value of `z = 0.3` means the trend moves about 0.3 standard deviations per decade. That is a useful, comparable signal.

### 6.3 Composite

```
Z = Σ(w_v × z_v) / Σ(w_v)
```

- `w_v = 1` for variables with enough data.
- If a variable is missing, renormalize the weights.
- Do not weight by p-value; that would bias the composite toward significant variables.
- Optional: weight by coverage (0.5–1.0) so a series with many gaps counts less.

### 6.4 Agreement and mixed signals

```
agreement = |Σ sign(z_v)| / n_v
```

- `agreement = 1`: all variables move in the same direction.
- `agreement = 0`: half up, half down.
- `mixed` if `agreement < 0.67`.

The map shows a mixed city as neutral with a split ring. The city file lists the variables and their signs. This is better than forcing a confident color onto a disagreement.

### 6.5 Significance for a composite

Do not invent a p-value for `Z`. Instead:

- Count how many selected variables are significant after FDR.
- Check whether their signs agree with `Z`.
- Show “2 of 3 variables significant” and “composite direction: warming.”
- If none are significant, show “no clear composite signal.”

This is honest and easy to explain.

### 6.6 Worked examples

**Jakarta (illustrative, from the existing research):**

| Variable | Slope per decade | p | Direction |
|---|---:|---:|---|
| `T2M` | +0.214 °C | < 0.001 | warming |
| `PRECTOTCORR` | +0.795 mm/day | < 0.001 | wetter |
| `AOD_55` | +0.0378 | < 0.001 | more aerosol |

All three are significant and positive. The composite is strongly positive, and the agreement is 1.0. The city file can say: “Jakarta’s selected variables are all moving in the increasing direction.”

Across the 14 POWER variables tested in the existing research, 11 were significant after FDR in Jakarta, versus 0 in Wisconsin. That contrast is the kind of story the city scan can surface: a broad local signal in one place, and a mostly null result in another.

**A hypothetical mixed city:**

| Variable | Slope per decade | p | Direction |
|---|---:|---:|---|
| `T2M` | +0.30 °C | 0.002 | warming |
| `PRECTOTCORR` | -0.20 mm/day | 0.04 | drying |
| `GWETROOT` | -0.02 fraction | 0.01 | drying |

Temperature rises while water availability falls. The composite may be near zero; the agreement is 0.33; the map shows “mixed.” The city file explains the trade-off. This is a feature, not a bug.

**Wisconsin (illustrative, from the existing research):**

- `T2M` +0.19 °C/decade, p = 0.10 → not significant.
- `AOD_55` -0.010/decade, p = 0.003 → significant decrease (CERES; MODIS may differ).

This is a useful “not everything is significant” case. It keeps the demo honest.

## 7. Timeline semantics

### 7.1 Three controls

| Control | What it changes | Example |
|---|---|---|
| **Window** | The years used for the trend | 1991–2025 |
| **Season** | Which months are analyzed | JJA only |
| **Resolution** | The chart aggregation | Monthly / annual / seasonal |

“Per decade” is the unit of the slope, not a time range. The window decides the evidence; the slope is always reported per 10 years.

### 7.2 Presets

- `FULL` 1981–2025
- `35Y` 1991–2025
- `25Y` 2001–2025
- `15Y` 2011–2025
- `CUSTOM`

If `AOD_55` is selected, the earliest window is 2001. Show a small note: “AOD coverage starts 2001; the window has been adjusted.”

### 7.3 Season

- `ALL` — all months, Seasonal Mann–Kendall with `period = 12`.
- `DJF`, `MAM`, `JJA`, `SON` — only those months, tested across years.
- `MONTH` — one calendar month, tested across years.

Seasonal trends are useful but noisier. The city file should show the season and the number of years.

### 7.4 Decade comparison

A separate chart in the city file:

```text
1980s  1990s  2000s  2010s  2020s
  26.1   26.3   26.6   26.9   27.2  °C
         +0.2   +0.3   +0.3   +0.3  change vs previous decade
```

This is a decadal mean comparison, not a trend test. Label it clearly. It is a good “wow” chart for a city file, and it is cheap to compute.

### 7.5 Animation

Optional. A play button steps through decades and recolors the city board by **decadal mean anomaly**, not by a 10-year trend. A 10-year trend window is too noisy to animate honestly. If the team wants a trend animation, use a trailing 20-year window and label it.

## 8. Precompute and cache

### 8.1 Data volume

- 100 cities × 8 variables × 45 years × 12 months = 432,000 values.
- JSON size: roughly 4–8 MB uncompressed, less with gzip.
- Trend results: 100 × 8 × 4 windows × 5 seasons ≈ 16,000 rows. Small.

This is a laptop-sized dataset. The compute is not the bottleneck; the design and data validation are.

### 8.2 Pipeline

1. **Fetch** — one POWER point request per city, all 8 parameters, monthly, 1981–2025.
2. **Parse** — drop `ANN`, replace `-999`, record coverage.
3. **Store** — a compact per-city JSON or a Convex table with the monthly series.
4. **Compute** — Seasonal Sen slope, CI, Seasonal Mann–Kendall, OLS HAC, FDR, standardized slope, composite, `methodDependent`.
5. **Precompute** — four windows × five seasons for each city/variable.
6. **Validate** — compare Jakarta `T2M` to the known +0.214 °C/decade; compare a non-significant case; check AOD start.
7. **Publish** — a `cityTrends` index that the client can load once and filter instantly.

### 8.3 Suggested result shape

Shape only; numbers are illustrative and must be replaced by validated results.

```json
{
  "cityId": "jakarta",
  "window": { "start": 2001, "end": 2025, "season": "annual" },
  "cell": { "lat": -6.2, "lon": 106.85, "size": "0.5x0.625" },
  "variables": {
    "T2M": {
      "slopePerDecade": 0.215,
      "unit": "C/decade",
      "ci95": [0.10, 0.32],
      "p": 0.0001,
      "q": 0.004,
      "nYears": 25,
      "z": 0.42,
      "coverage": 0.99,
      "methodDependent": false,
      "evidenceLevel": "strong"
    },
    "PRECTOTCORR": {
      "slopePerDecade": 0.701,
      "unit": "mm/day/decade",
      "ci95": [0.30, 1.10],
      "p": 0.0003,
      "q": 0.014,
      "nYears": 25,
      "z": 0.31,
      "coverage": 0.98,
      "methodDependent": false,
      "evidenceLevel": "moderate"
    }
  },
  "composite": {
    "z": 0.36,
    "agreement": 1.0,
    "significantCount": 2,
    "selectedCount": 2,
    "mixed": false,
    "methodDependent": false,
    "evidenceLevel": "strong"
  }
}
```

### 8.4 Client-side versus server-side

- **Client-side:** filtering among precomputed windows/seasons; recoloring markers; switching variables; composite calculation from precomputed `z` values; switching the Evidence Lens from precomputed `q`, `nYears`, `coverage`, and `agreement`. This is instant.
- **Server-side:** custom date ranges; arbitrary cities; new variable combinations that need fresh stats. Cache the result by a deterministic key.
- **Live POWER:** only for a city outside the curated list, or a manual refresh. Show a job ticker and a `LIVE` tag.

### 8.5 Cache keys

```text
city:{cityId}:series:{parameter}:{start}:{end}
city:{cityId}:trend:{parameter}:{start}:{end}:{season}:{methodVersion}
city:{cityId}:composite:{vars}:{start}:{end}:{season}:{methodVersion}
```

Include a `methodVersion` so a method change invalidates old results.

## 9. Scientific caveats to surface in the UI

These are not fine print. They are part of the product.

1. **Grid cell, not city.** “MERRA-2 cell ≈ 55 × 69 km; not a station.”
2. **Reanalysis, not observations.** “Model-assimilated data; not a thermometer in your garden.”
3. **Statistical trend, not cause.** “The data shows an association with time; it does not explain why.”
4. **Multiple testing.** “8 variables tested; p-values are FDR-adjusted.”
5. **Short records.** “15 years is noisy; compare with the full record.”
6. **Autocorrelation.** “The test is corrected for autocorrelation where supported.”
7. **Effect size.** “Statistically significant is not the same as large or dangerous.”
8. **AOD coverage.** “AOD starts in 2001; the window is shorter.”
9. **Missing data.** “Gaps are gaps, not zeros.”
10. **Fire detections.** “Hot pixels are not confirmed wildfires.”
11. **Evidence is not probability.** “A p-value is not the chance that the trend is true. The Evidence Lens shows statistical evidence strength, not truth probability.”
12. **Evidence thresholds.** “Strong / moderate / weak are explicit rules, not a hidden score. The methods drawer lists them.”
13. **Imagery is not a trend test.** “Satellite images are visual context. Clouds, seasons, and resolution can mislead. The chart is the evidence.”
14. **Method sensitivity.** “A trend can be significant under one test and not another. The city file shows both; a `METHOD-DEPENDENT` badge means do not overclaim.”

## 10. Feasibility verdict

| Question | Answer |
|---|---|
| Can we color 100 cities by a trend? | Yes. Precompute Sen slopes; MapLibre circle layers. |
| Can we show a “zone” per city? | Yes, as a halo, and honestly as the MERRA-2 cell at city zoom. |
| Can we combine multiple variables? | Yes, with standardized slopes. The math is simple; the explanation is the work. |
| Can we change the timeline and recolor? | Yes, from precomputed windows in under 500ms. Custom windows need a server compute. |
| Can we support arbitrary cities? | Yes, but live POWER fetches are slower and need caching. Treat as a stretch. |
| Can we show uncertainty on the map? | Yes. The Evidence Lens reuses `q`, `nYears`, `coverage`, `z`, and `agreement`; no new data. |
| Can we show method sensitivity? | Yes. OLS HAC + Seasonal MK/Sen; set `methodDependent` when they disagree. |
| Can we auto-inspect a city and show notes? | Yes. Deterministic templates over the computed result table. |
| Can we show satellite imagery? | Yes. NASA GIBS true/false color, 2000+, no auth. Use cached city snapshots; clouds are the main risk. |
| Can we draw a continuous global surface? | Not in 48 hours with this data path. Would need gridded data and tiles. |
| Can we claim city-wide trends? | No. Say “the MERRA-2 cell containing the city.” |

**Effort:** medium. The stats and data are straightforward for a small team; the design of the composite and the honesty of the zones are the parts that need care.

## 11. References

- NASA POWER: https://power.larc.nasa.gov/
- NASA POWER monthly point API: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- NASA GIBS: https://gibs.earthdata.nasa.gov/
- NASA Worldview: https://worldview.earthdata.nasa.gov/
- MapLibre GL: https://maplibre.org/
- Osiris reference implementation: https://github.com/simplifaisoul/osiris
- Seasonal Mann–Kendall: Hirsch & Slack (1984); `pymannkendall` documentation.
- Sen’s slope and Mann–Kendall: see `docs/problems/trend-analysis-guide.md` for the full method notes.
