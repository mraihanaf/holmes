# Data, normalization, cache, and jobs

This document defines how Earth-science data enters the app, how it is normalized, and how the cache and job system work.

## 1. Design rules

1. **Cache series, not HTTP responses.** A raw API response is useful once; a normalized series can serve many date ranges and view modes.
2. **Fetch full history once.** When a series is missing, fetch the longest available record for that source/variable/location, then slice locally.
3. **Historical data is immutable.** No TTL for completed historical months. A dataset version change creates a new cache key.
4. **Only the current month is provisional.** Mark it and exclude it from trend tests by default. Refresh it with a short TTL.
5. **One upstream fetch per unique need.** Use single-flight locks so simultaneous misses do not duplicate work.
6. **Jobs are idempotent.** A job is keyed by the cache key. If a job exists, join it instead of starting another.
7. **Provenance is part of the data.** A series without source, version, retrieval date, citation, and license is incomplete.

## 2. Source strategy

| Source | Access | Latency | Use | Mode |
|---|---|---|---|---|
| **NASA POWER** | No auth; point API | 0.4–0.8 s typical | T2M, PRECTOTCORR, humidity, wind, soil wetness, AOD_55 and more | Live, cached |
| **Meteomatics** | Basic auth; 1,000 queries/day | ~49 s for 46 years × 8 params × 2 sites | ERA5 cross-check, CHIRPS rainfall, CAMS AOD/PM2.5 | Jobs, cached |
| **MODIS LAADS** | LAADS token | Seconds per monthly file | MYD08_M3 AOD | Prefetch/jobs |
| **MODIS ORNL DAAC** | No auth | Tens of seconds per request; ~10 dates/request | MOD13Q1 NDVI, MOD11A2 LST | Prefetch/jobs |
| **Giovanni** | Earthdata login | 40–112 s; asynchronous | Official Wisconsin AOD reference | Build-time only |
| **NOAA CDO** | Token | Fast, 5 req/s, 10k/day | Optional station data | Build-time/cached |
| **Geocoder** | Nominatim or preset list | <1 s | Place search | Live, cached |

**Do not** put Giovanni, MODIS, or Meteomatics on the demo critical path. The curated cases must be prewarmed.

**Global-award note:** NASA POWER is a NASA resource, but the challenge’s global-award rule refers to the Resources tab. Ship at least one case that uses Giovanni/MODIS AOD, AppEEARS, or GES DISC, and show that resource in the provenance panel.

### MVP variable set

| Key | Label | Units | Source | Aggregation |
|---|---|---|---|---|
| `T2M` | Air temperature at 2 m | °C | NASA POWER | monthly mean |
| `PRECTOTCORR` | Corrected precipitation | mm/day | NASA POWER | monthly mean of daily rate |
| `AOD_55` | Aerosol optical depth at 550 nm | dimensionless | NASA POWER / MODIS | monthly mean |
| `GWETROOT` | Root-zone soil wetness | fraction | NASA POWER | monthly mean |
| `WS2M` | Wind speed at 2 m | m/s | NASA POWER | monthly mean |

`AOD_55` exists in more than one source. Keep separate source-specific variable entries; never mix POWER and MODIS values in one series. The official Wisconsin case uses the MODIS/Giovanni AOD product, not the POWER value.

### Curated cases

| Slug | Question | Source | Purpose |
|---|---|---|---|
| `wisconsin-aod` | Is Wisconsin’s aerosol load changing? | MODIS MYD08_M3 / Giovanni | Official video example |
| `jakarta-temperature` | Is Jakarta warming? | NASA POWER | Local relevance, significant trend |
| `jakarta-rainfall` | Is Jakarta’s rainfall changing? | NASA POWER | Local relevance, significant trend |
| `jakarta-aod` | Is Jakarta’s air getting dirtier? | NASA POWER AOD_55 | Signature scan |
| `wisconsin-temperature` | Is Wisconsin warming? | NASA POWER | Honest non-significant or weak case |

All five must be prewarmed. The last one is the honesty case: a non-significant result is still a valid investigation.

## 3. Domain model

### Source

```ts
type Source = {
  key: string;                 // "nasa-power", "meteomatics-era5", "modis-myd08"
  name: string;
  datasetVersion: string;      // source version or retrieval generation
  homepage: string;
  license: string;
  citation: string;
};
```

### Variable

The variable catalog is the single source of truth for the UI and the adapters.

```ts
type Variable = {
  key: string;                 // "T2M", "PRECTOTCORR", "AOD_55"
  sourceKey: string;
  label: string;               // "Air temperature at 2 m"
  definition: string;          // one plain-language sentence
  units: string;               // "°C", "mm/day", "dimensionless"
  nativeFrequency: "daily" | "monthly";
  aggregation: "mean" | "sum";
  coverageStart: string;       // ISO date
  coverageEnd: string;         // ISO date, or "present"
  validRange: [number, number] | null;
  caveats: string[];
  resourcesTab: boolean;       // true if this variable's source is on the challenge Resources tab
};
```

### Region

```ts
type Region =
  | { kind: "point"; lat: number; lon: number; label?: string }
  | { kind: "bbox"; west: number; south: number; east: number; north: number; label?: string };
```

MVP supports points and bounding boxes. Named places resolve to one of these. Do not support arbitrary polygons until the core flow is stable.

### Series

```ts
type Series = {
  cacheKey: string;
  sourceKey: string;
  variableKey: string;
  geometry: Region;
  frequency: "monthly" | "annual";
  aggregation: "mean" | "sum";
  units: string;
  start: string;
  end: string;
  provisional: boolean;
  provenance: {
    sourceUrl: string;
    fetchedAt: string;
    datasetVersion: string;
    citation: string;
    license: string;
  };
  normalizationVersion: string;
};
```

### Series point

```ts
type SeriesPoint = {
  ts: string;                  // "2000-01-01T00:00:00Z" or "2000-01"
  value: number;
  qc?: "ok" | "estimated" | "missing" | "provisional";
};
```

## 4. Normalization rules

Normalization is a first-class module, not adapter glue. Every source goes through it.

### Time

- Store timestamps in UTC ISO 8601. Monthly series use the first day of the month.
- NASA POWER monthly data is keyed by year/month; map to `YYYY-MM-01T00:00:00Z`.
- Daily data aggregated to monthly must record the month key, not the last day.
- Do not mix local time and UTC. Document any source-specific convention.

### Units

Canonical units:

| Variable type | Canonical unit | Notes |
|---|---|---|
| Temperature | °C | Convert K to °C at the adapter boundary |
| Precipitation | mm/day | If the source gives monthly totals, divide by days in month |
| AOD | dimensionless | MODIS scale factor 0.001 applied |
| Soil moisture | m³/m³ | |
| Wind speed | m/s | |
| Radiation | W/m² | J/m²/day ÷ 86,400 |

Store canonical units. Convert only at display time.

### Missing values

- NASA POWER uses `-999` and similar sentinels. Filter them before aggregation.
- MODIS uses fill values; filter anything outside the valid range.
- Record the count of removed values in `qc`.
- A month with fewer than 90% valid days is `null`, not an average of a partial month.
- An annual value needs at least 10 of 12 valid months.

### Monthly means versus monthly sums

- Temperature, AOD, humidity, wind, soil moisture: monthly **mean**.
- Precipitation: the source may be a daily rate (`mm/day`) or a monthly total (`mm`). Store the canonical daily rate for trend analysis. If the UI shows a monthly total, multiply by the number of days in the month and label it clearly.
- Never compare a monthly mean of a rate with a monthly total of the same variable.

### Provisional data

- The current month is incomplete. Mark it `provisional`.
- Exclude provisional months from trend tests by default.
- Show a `provisional` badge if the user includes it.
- TTL for the current month: 6–24 hours. Historical months: no TTL.

### Geometry

- Point: round to 4 decimal places for the cache key; record the original coordinates.
- Bbox: snap to the source grid; record the snapped bbox and the cell count.
- Reject bboxes larger than a configured limit (MVP: 20° × 20° or 100 grid cells).
- Reject antimeridian-crossing and polar boxes in the MVP; show a clear error.
- Named place: resolve to a canonical point or bbox before hashing.

## 5. Cache key

The cache key is a SHA-256 hash of the canonical inputs:

```text
source.key
source.datasetVersion
variable.key
geometry canonical JSON
frequency
aggregation
units
normalizationVersion
```

Example canonical JSON:

```json
{"kind":"point","lat":-6.2000,"lon":106.8500}
```

The analysis cache key adds:

```text
series.cacheKey
stats.methodVersion
options.seasonal
options.test
options.autocorrelation
```

Changing any of these creates a new entry. Do not mutate a cached series in place when the normalization version changes; write a new series document.

## 6. Convex schema sketch

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sources: defineTable({
    key: v.string(),
    name: v.string(),
    datasetVersion: v.string(),
    homepage: v.string(),
    license: v.string(),
    citation: v.string(),
  }).index("by_key", ["key"]),

  variables: defineTable({
    key: v.string(),
    sourceKey: v.string(),
    label: v.string(),
    definition: v.string(),
    units: v.string(),
    nativeFrequency: v.union(v.literal("daily"), v.literal("monthly")),
    aggregation: v.union(v.literal("mean"), v.literal("sum")),
    coverageStart: v.string(),
    coverageEnd: v.string(),
    validRange: v.union(v.array(v.number()), v.null()),
    caveats: v.array(v.string()),
    resourcesTab: v.boolean(),
  }).index("by_key", ["key"]).index("by_source", ["sourceKey"]),

  series: defineTable({
    cacheKey: v.string(),
    sourceKey: v.string(),
    variableKey: v.string(),
    geometry: v.object({
      kind: v.union(v.literal("point"), v.literal("bbox")),
      lat: v.optional(v.number()),
      lon: v.optional(v.number()),
      west: v.optional(v.number()),
      south: v.optional(v.number()),
      east: v.optional(v.number()),
      north: v.optional(v.number()),
      label: v.optional(v.string()),
    }),
    frequency: v.union(v.literal("monthly"), v.literal("annual")),
    aggregation: v.union(v.literal("mean"), v.literal("sum")),
    units: v.string(),
    start: v.string(),
    end: v.string(),
    provisional: v.boolean(),
    provenance: v.object({
      sourceUrl: v.string(),
      fetchedAt: v.string(),
      datasetVersion: v.string(),
      citation: v.string(),
      license: v.string(),
    }),
    normalizationVersion: v.string(),
  }).index("by_cache_key", ["cacheKey"]).index("by_variable", ["variableKey"]),

  points: defineTable({
    seriesId: v.id("series"),
    ts: v.string(),
    value: v.union(v.number(), v.null()),
    qc: v.optional(v.string()),
  }).index("by_series_ts", ["seriesId", "ts"]),

  jobs: defineTable({
    cacheKey: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    stage: v.string(),
    done: v.number(),
    total: v.number(),
    attempts: v.number(),
    error: v.optional(v.string()),
    resultAnalysisId: v.optional(v.id("analyses")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]).index("by_status", ["status"]),

  analyses: defineTable({
    cacheKey: v.string(),
    seriesId: v.id("series"),
    methodVersion: v.string(),
    result: v.any(), // replace with an explicit validator in implementation
    createdAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]).index("by_series", ["seriesId"]),

  cases: defineTable({
    slug: v.string(),
    title: v.string(),
    question: v.string(),
    placeLabel: v.string(),
    variableKeys: v.array(v.string()),
    period: v.object({ start: v.string(), end: v.string() }),
    seedSeriesIds: v.array(v.id("series")),
    narrative: v.string(),
    published: v.boolean(),
  }).index("by_slug", ["slug"]),
});
```

Notes:

- Convex documents are limited to 1 MiB. The `points` table avoids putting a long daily series in one document.
- Convex arrays are limited to 8,192 elements. A daily series longer than that must use the `points` table or chunks.
- Queries should read only the range they need: `points.by_series_ts` with `ts >= start` and `ts <= end`.
- Replace `v.any()` for analysis results with a concrete validator before shipping.

## 7. Job model

### States

```text
queued → running → succeeded
                 → failed
        → cancelled
```

### Stages

```text
resolve_geometry
fetch_source
normalize
store_series
analyze
store_analysis
```

### Rules

- **Idempotency:** one active job per cache key. A mutation checks for an existing queued/running job and returns it.
- **Progress:** `done` / `total` and the current `stage`. For a single request, `total` can be 1; for 300 MODIS files, it is 300.
- **Retries:** transient errors (429, 5xx, timeout) retry with exponential backoff and jitter. Permanent errors (400, 404, invalid input) fail immediately.
- **Concurrency:** per-source limits. POWER 4, MODIS 2–4, Meteomatics 1, geocoder 1.
- **Quota guard:** Meteomatics 1,000 requests/day; NOAA 10,000/day. Track usage in a `sourceUsage` table or in-memory counter; refuse new jobs when the quota is near.
- **Cancellation:** set `status = cancelled`; the worker checks before each chunk.
- **Crash recovery:** Workpool/Workflow steps are durable. Each step must be safe to retry.
- **Time budget:** each action step must finish well under the 10-minute Convex Node action limit. Chunk large fetches.

### Workpool vs Workflow

- **Workpool:** data fan-out. Fetch batches of months/cells, retries, concurrency limits.
- **Workflow:** multi-step investigation. Plan → ensure data → analyze → rank → narrate → verify → publish.
- **Simple analysis request:** a mutation creates a job, schedules an action, and the action calls the stats service. A Workflow is not required for one series.

## 8. Prewarm and demo mode

### Seed manifest

`data/seed/cases.json` lists the curated cases:

```json
[
  {
    "slug": "wisconsin-aod",
    "title": "Wisconsin aerosol optical depth",
    "place": {"kind": "point", "lat": 43.07, "lon": -89.4, "label": "Wisconsin"},
    "variable": "AOD_55",
    "period": {"start": "2002-01", "end": "2025-12"},
    "source": "modis-myd08"
  },
  {
    "slug": "jakarta-temperature",
    "title": "Jakarta air temperature",
    "place": {"kind": "point", "lat": -6.2, "lon": 106.85, "label": "Jakarta"},
    "variable": "T2M",
    "period": {"start": "2000-01", "end": "2025-12"},
    "source": "nasa-power"
  }
]
```

### Prewarm

`scripts/prewarm.ts` (or a Convex action invoked by the CLI) must:

1. Resolve each case’s geometry.
2. Ensure each series exists. Fetch if missing.
3. Run the stats service with the default options.
4. Store the analysis.
5. Verify the chart data and verdict are present.
6. Mark the case `published`.

Run prewarm after every deploy and before the demo. A failed case must fail the prewarm script, not silently publish an empty page.

### Modes

- `DEMO_MODE=cached`: no external data calls. All case data and analyses come from the store. The UI shows `CACHED SNAPSHOT`.
- `DEMO_MODE=live`: allow live POWER queries. On source error, fall back to cached data and show `STALE` or `CACHED`.
- `DEMO_MODE=off`: development; all sources allowed.

Prewarmed data does not make the SPA work without network. It removes external data dependencies. The recorded 30-second video is the true offline fallback.

## 9. Failure handling

| Failure | Behavior |
|---|---|
| Source 429 / 5xx | Retry with backoff; after retries, fail the job with a retryable error |
| Source timeout | Same as 5xx |
| Partial month | Store `null` for that month; do not interpolate silently |
| Missing entire series | Job fails with `NO_DATA`; UI suggests another variable or period |
| Source version change | New `datasetVersion` → new cache key; old data remains readable |
| Stats service down | Cached analyses still render; live analysis shows an error with retry |
| LLM down | Deterministic analysis still works; agent panel shows unavailable |
| Convex down | No fallback; this is a platform dependency. Keep the demo video ready |

## 10. Acceptance criteria

- The same query requested twice performs one upstream fetch.
- A cached analysis returns in under 150 ms.
- Changing the date range of a cached series does not call the upstream source.
- A slow source shows a job with stage and progress.
- A cancelled job stops before the next chunk.
- `DEMO_MODE=cached` makes zero external data calls.
- Every series and analysis exposes source, version, retrieval time, citation, and license.
- A dataset version or normalization version change produces a new cache key, not a mutated old entry.
