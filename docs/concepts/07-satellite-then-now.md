# 07 — Satellite Then & Now

## 1. Verdict

**Yes, this is feasible and worth adding — as a supporting feature, not the main differentiator.**

A **Then & Now** satellite comparison is a strong “show me” moment. It makes the trend tangible: the chart says what changed, the image shows what it looks like. True color and false color give two useful readings of the same scene.

But it should not replace the **Evidence Lens** as the signature gap feature. Competitors already use satellite imagery (AtmoSpy, Terra Bangla, My Climate Story), so imagery alone is not a differentiator. It is the first strong **stretch** feature after the core flow works.

**Recommendation:** ship a cached, city-level split comparison for 2–3 demo cities; add live date search and a satellite basemap only if time remains.

## 2. What the user sees

### 2.1 In the city file

A `THEN & NOW` card in the city file, below the evidence stack:

```text
THEN & NOW · JAKARTA
[ AUG 2001 ]        [ split swipe ]        [ AUG 2025 ]

[ TRUE COLOR ]  [ FALSE COLOR ]        [ OPEN FULL SCREEN ]

MODIS Terra · 250 m–1 km per pixel · NASA GIBS
Visual context, not a trend test.
```

- A draggable split handle compares the start and end images.
- Labels show the exact dates and the sensor.
- A `TRUE COLOR` / `FALSE COLOR` toggle re-renders both sides.
- `OPEN FULL SCREEN` expands to a large comparison for the demo.
- The caveat is always visible: the image is context, not evidence of a trend.

### 2.2 Full-screen comparison

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

Nice-to-haves:

- `PLAY CROSSFADE` animates between the two dates.
- `FIND CLEARER DAY` tries ±1–7 days and picks the least cloudy image.
- A small legend explains what the colors mean.
- A `SAME MONTH` default avoids seasonal mismatch.

### 2.3 Optional satellite basemap

A `SATELLITE` layer toggle at **zoom ≥ 5**:

- `TRUE COLOR` — natural-color imagery.
- `FALSE COLOR` — 7-2-1 / M11-I2-I1.
- The dark globe remains the default at global zoom.
- Do not make satellite imagery the global basemap. At low zoom it is low-resolution and often cloudy, and it competes with the city markers.

This basemap is a stretch. The comparison card is the higher-value feature.

## 3. Data source: NASA GIBS

NASA **GIBS** (Global Imagery Browse Services) serves the imagery behind NASA Worldview. It is public, no login, and fast.

### 3.1 Tested layers

| Reading | MODIS Terra | MODIS Aqua | VIIRS SNPP | VIIRS NOAA-20 |
|---|---|---|---|---|
| **True color** | `MODIS_Terra_CorrectedReflectance_TrueColor` | `MODIS_Aqua_CorrectedReflectance_TrueColor` | `VIIRS_SNPP_CorrectedReflectance_TrueColor` | `VIIRS_NOAA20_CorrectedReflectance_TrueColor` |
| **False color** | `MODIS_Terra_CorrectedReflectance_Bands721` | `MODIS_Aqua_CorrectedReflectance_Bands721` | `VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1` | `VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1` |

Coverage:

- MODIS Terra: from **2000-02-24**.
- MODIS Aqua: from **2002-07-03**.
- VIIRS SNPP: from **2015-11-24**.
- VIIRS NOAA-20: from **2018-01-05**.
- All are daily composites with occasional gaps.
- Max GIBS tile matrix: `GoogleMapsCompatible_Level9` for these layers (about 250–300 m per pixel at the equator).

### 3.2 Tile URL

```text
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{LAYER}/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg
```

Tested examples that return `200 image/jpeg`:

```text
MODIS_Terra_CorrectedReflectance_TrueColor
MODIS_Terra_CorrectedReflectance_Bands721
VIIRS_NOAA20_CorrectedReflectance_TrueColor
```

- No API key.
- CORS is open (`Access-Control-Allow-Origin: *`).
- GIBS sends `no-store`; cache your own snapshots for the demo.
- Attribute NASA GIBS / NASA Worldview and the sensor.

### 3.3 Why not a single global image

- At zoom 1–3, one pixel covers tens of kilometres. A city is a dot.
- Daily true color is often cloudy.
- The globe’s dark basemap is part of the product identity; a low-resolution satellite basemap would weaken it.
- Use imagery where it is strongest: a city-scale comparison, not a global wallpaper.

## 4. Date selection and the cloud problem

Clouds are the main risk. A single cloudy day can make a real change invisible.

### 4.1 Default: same month and day

Use the **same calendar month and day** in the start and end years:

```text
2001-08-15  vs  2025-08-15
```

This removes most seasonal mismatch. It does not remove clouds.

### 4.2 Fallback dates

If the tile is missing or very cloudy, try ±1–7 days around the target. Pick the first date that returns an image and passes a simple cloud check.

A simple cloud check:

1. Stitch the tile.
2. Count near-white pixels in the city bbox.
3. If the white fraction is above a threshold, try the next date.
4. Label the chosen date and the cloud score.

This is a heuristic, not a cloud mask. Say “clear-date helper,” not “cloud-free.”

### 4.3 Date controls

- `SAME MONTH` (default)
- `CUSTOM DATE` for either side
- `FIND CLEARER DAY`
- `RESET` to the timeline start/end

If the start year is before 2000, disable the comparison and show: “Satellite imagery starts in 2000. The trend chart uses the full POWER record.”

### 4.4 Sensor consistency

Prefer the same sensor at both ends:

1. MODIS Terra if both dates are ≥ 2000-02-24.
2. MODIS Aqua if both dates are ≥ 2002-07-03.
3. VIIRS SNPP if both dates are ≥ 2015-11-24.
4. VIIRS NOAA-20 if both dates are ≥ 2018-01-05.

If the start date is 2001 and the end date is 2025, MODIS Terra is the only common sensor. Label it.

## 5. True color and false color

### 5.1 True color

Natural-color RGB. Good for:

- Urban expansion.
- Coastline and water bodies.
- Vegetation cover.
- Snow and ice.
- Large land-cover change.

Legend:

> Natural color. Clouds are white, water is dark, vegetation is green, bare ground is brown.

### 5.2 False color

MODIS 7-2-1 or VIIRS M11-I2-I1. Good for:

- Burn scars (red/brown).
- Vegetation health (green).
- Water (dark).
- Clouds (white).
- Some urban/soil contrasts.

Legend:

> False color. Burn scars appear red-brown, vegetation green, water dark, clouds white. The colors are a band combination, not a different date.

False color is especially useful with FIRMS: a burn scar and active-fire detections tell a coherent story. It is also easy to misread, so the legend must be visible.

## 6. Image pipeline

### 6.1 For the demo: cached snapshots

Precompute a 2×2 or 3×3 tile mosaic for each demo city and date:

- Jakarta: 2001 vs 2025, true and false color.
- Wisconsin: 2002 vs 2025, true and false color (official example).
- One fire/burn-scar case: false color + FIRMS overlay.

Store the JPEGs in Convex storage or the repo. The demo works offline.

### 6.2 For arbitrary cities: on-demand stitch

1. Convert the city bbox to tile coordinates at zoom 9.
2. Fetch the 2×2 or 3×3 tiles from GIBS.
3. Stitch with Pillow (server-side) into a 512–768px image.
4. Cache by `{cityId}:{date}:{layer}:{zoom}:{bbox}`.
5. Return the image URL and metadata.

Do not fetch a whole-world image. Fetch only the city bbox.

### 6.3 Performance

- GIBS tiles are small; a 3×3 mosaic is a few hundred KB.
- Cache every snapshot.
- Use `<img>` for the split view, not a live map, for reliability.
- A full-screen interactive MapLibre raster view is a stretch; it adds two map instances and time-dimension handling.

## 7. Agent integration

Add one tool:

| Tool | Input | Output | Side effects |
|---|---|---|---|
| `getSatelliteComparison` | `{ cityId, startDate, endDate, mode }` | `{ startImage, endImage, dates, sensor, mode, cloudScore, attribution }` | None |
| `openSatelliteView` | `{ cityId, mode }` | `{ actionId }` | Opens the full-screen compare |

Supported question:

> “What did Jakarta look like in 2001 versus 2025?”

The agent opens the Then & Now view and says:

> “Here is Jakarta in August 2001 and August 2025, MODIS Terra true color. This is visual context; the trend test is in the city file.”

Guardrails:

- Do not say the image “proves” the trend.
- Do not compare different seasons without labeling it.
- Do not call a cloudy image “clear.”
- Always show the sensor, date, and resolution.
- False color is a band combination, not a different date.

## 8. Scope and effort

| Phase | What ships | Effort |
|---|---|---|
| **A. Cached demo** | 2–3 cities, true + false color, same-month dates, split view | **2–4h** |
| **B. Full-screen compare** | Split swipe, crossfade, date labels, share card | **2–3h** |
| **C. Live date search** | GIBS tile fetch, ±7-day fallback, cloud heuristic | **3–5h** |
| **D. Satellite basemap** | Zoom ≥ 5 raster layer, true/false toggle | **4–6h** |

**Recommendation:** ship A and B after the core flow is stable (roughly hour 36–40). C and D are true stretch.

## 9. Why it is a supporting feature, not the gap feature

The prior-art research already has “Then & Now” as a concept, and AtmoSpy, Terra Bangla, and My Climate Story use satellite imagery. Imagery is expected in a strong entry; it is not a unique wedge.

The unique wedge remains the **Evidence Lens**: making statistical uncertainty a first-class map mode. Then & Now supports it:

- Evidence Lens answers “how sure?”
- Then & Now answers “what does it look like?”
- Together: “what changed, how sure, and what does it look like?”

That is a strong trio. Do not let the imagery become the product’s main claim.

**Eligibility note:** GIBS is a NASA service, but it is not the listed Resources-tab case. Keep the Giovanni AOD starter case for the global-award story; the LAADS CSV is a cross-check. Then & Now is a bonus view.

## 10. Risks and guardrails

| Risk | Mitigation |
|---|---|
| Clouds hide the change | Same-month dates, ±7-day fallback, clear-date helper, cloud caveat |
| Seasonal mismatch | Same calendar month by default; label custom dates |
| False color misread | Visible legend; “band combination, not a different date” |
| Resolution expectations | “250 m–1 km per pixel; not a spy satellite” |
| Imagery overclaims trend | “Visual context, not a trend test”; keep the chart as evidence |
| Tile gaps / 404 | Try ±1–7 days; fall back to another sensor; cached snapshot |
| Performance | Static stitched images; cache; no global raster |
| Scope | Cached demo first; live search and basemap only if time |

## 11. Acceptance criteria

- A city file shows a Then & Now card with start/end dates and sensor.
- The split handle works with mouse, touch, and keyboard.
- True color and false color both render for the demo cities.
- The dates use the same month by default.
- A cloudy image shows a `CLOUDY` badge and a “find clearer day” action.
- The card says “visual context, not a trend test.”
- Attribution: NASA GIBS / NASA Worldview, sensor, resolution.
- The demo works from cached images with no network.
- No global satellite basemap at zoom < 5.

## 12. Bottom line

**Add it — as the first supporting stretch feature.** It is cheap for 2–3 cached cities, visually strong, and pairs well with the Evidence Lens and FIRMS. Do not make it the main differentiator, and do not let it replace the trend evidence.
