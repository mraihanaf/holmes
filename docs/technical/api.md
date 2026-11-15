# API and contract

Convex is the only API surface the browser uses. The Python stats service is an internal service called by Convex actions. Data sources are called only by Convex actions or build scripts.

Function names below are the target contract. Convex generates the actual TypeScript types; keep these names stable once the frontend starts using them.

## 1. Public Convex functions

### Queries

| Function | Input | Output | Notes |
|---|---|---|---|
| `catalog.listVariables` | `{ sourceKey?: string }` | `Variable[]` | Sorted by label |
| `catalog.getVariable` | `{ key: string }` | `Variable \| null` | |
| `places.search` | `{ query: string, limit?: number }` | `Place[]` | Preset list first, geocoder second |
| `analyses.get` | `{ cacheKey: string }` | `AnalysisView \| null` | Includes series, stats, provenance |
| `jobs.get` | `{ jobId: string }` | `JobView \| null` | Reactive progress |
| `cases.list` | `{}` | `CaseSummary[]` | Published cases only |
| `cases.get` | `{ slug: string }` | `CaseView \| null` | Includes chart series and verdict |
| `agent.getThread` | `{ threadId: string }` | `AgentThreadView` | Messages, tool calls, run status |
| `system.health` | `{}` | `HealthView` | Cache counts, job queue, mode |

### Mutations

| Function | Input | Output | Notes |
|---|---|---|---|
| `analyses.request` | `AnalyzeQuery` | `{ cacheKey, jobId? }` | Returns cached result or creates a job |
| `jobs.cancel` | `{ jobId: string }` | `{ ok: boolean }` | |
| `cases.createShare` | `{ slug: string }` | `{ url: string }` | URL-state share link |
| `agent.startInvestigation` | `{ caseSlug: string, question: string }` | `{ threadId, workflowId }` | Starts the Analyst workflow |
| `agent.sendMessage` | `{ threadId: string, text: string }` | `{ messageId: string }` | |
| `agent.approve` | `{ workflowId: string, event: string, payload?: unknown }` | `{ ok: boolean }` | Sends a Workflow event |

### Actions

| Function | Input | Output | Notes |
|---|---|---|---|
| `data.ensureSeries` | `SeriesQuery` | `{ seriesId, cacheKey, status }` | Cache-first; may enqueue |
| `stats.analyze` | `{ seriesId, options }` | `{ analysisId, result }` | Calls Python service |
| `agent.runInvestigation` | `{ threadId, caseSlug }` | `{ workflowId }` | Starts the durable workflow |

## 2. Core types

```ts
type AnalyzeQuery = {
  variableKey: string;
  region: Region;
  period: { start: string; end: string };
  frequency: "monthly" | "annual";
  seasonal: "raw" | "deseasonalize" | "annual";
  test: "mann_kendall" | "ols";
  autocorrelation: "none" | "hamed_rao";
};

type AnalysisView = {
  cacheKey: string;
  series: {
    points: Array<{ ts: string; value: number | null; qc?: string }>;
    units: string;
    frequency: "monthly" | "annual";
    start: string;
    end: string;
    provisional: boolean;
  };
  stats: StatsResult;
  provenance: Provenance;
  caseSlug?: string;
};

type JobView = {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage: string;
  done: number;
  total: number;
  error?: string;
  resultAnalysisId?: string;
};
```

`StatsResult` is defined in `stats.md`. `Provenance` is defined in `data-and-cache.md`.

## 3. Stats service HTTP contract

### `POST /analyze`

Request:

```json
{
  "series_id": "series_123",
  "variable_key": "T2M",
  "units": "°C",
  "frequency": "monthly",
  "aggregation": "mean",
  "points": [{"ts": "2000-01-01T00:00:00Z", "value": 26.1}],
  "options": {
    "seasonal": "deseasonalize",
    "test": "mann_kendall",
    "autocorrelation": "hamed_rao",
    "confidence": 0.95,
    "min_years": 10
  }
}
```

Response: `StatsResult` from `stats.md`.

### `POST /analyze/batch`

Request:

```json
{
  "series": [
    {
      "series_id": "series_123",
      "variable_key": "T2M",
      "units": "°C",
      "frequency": "monthly",
      "aggregation": "mean",
      "points": [{"ts": "2000-01-01T00:00:00Z", "value": 26.1}],
      "options": {"seasonal": "deseasonalize", "test": "mann_kendall", "autocorrelation": "hamed_rao"}
    }
  ],
  "fdr": {"alpha": 0.05, "method": "fdr_bh"}
}
```

Response:

```json
{
  "method_version": "1.0.0",
  "results": [
    {
      "series_id": "series_123",
      "status": "ok",
      "p_value": 0.00004,
      "p_adj": 0.00008,
      "significant": true,
      "significant_fdr": true
    }
  ]
}
```

### `GET /healthz`

```json
{"status": "ok", "method_version": "1.0.0"}
```

## 4. Error model

All Convex actions and the stats service return a consistent error shape:

```json
{
  "code": "SOURCE_RATE_LIMITED",
  "message": "NASA POWER returned 429. Retry in 30 seconds.",
  "retryable": true,
  "details": {"source": "nasa-power", "status": 429}
}
```

Codes:

| Code | Meaning | Retryable |
|---|---|---|
| `INVALID_INPUT` | Bad variable, region, period, or options | No |
| `NO_DATA` | The source has no data for this query | No |
| `INSUFFICIENT_DATA` | The series is too short or too incomplete | No |
| `SOURCE_RATE_LIMITED` | 429 from a source | Yes, with backoff |
| `SOURCE_UNAVAILABLE` | 5xx or timeout | Yes |
| `SOURCE_AUTH_FAILED` | Missing/invalid source credentials | No |
| `STATS_UNAVAILABLE` | Python service down or timed out | Yes |
| `JOB_CANCELLED` | User cancelled | No |
| `INTERNAL` | Unexpected error | Yes, once |

The UI maps codes to short messages and, where useful, a retry button.

## 5. Rate limits and abuse protection

No user accounts means the public API must be protected by simple limits.

| Limit | Value |
|---|---|
| Read requests per IP | 60/minute |
| Analysis requests per IP | 10/minute |
| Active jobs per IP | 2 |
| Global queued jobs | 100 |
| Max bbox | 20° × 20° or 100 grid cells |
| Max period | Full dataset range; no arbitrary future dates |
| Max batch | 500 series |
| Request body | 10 MB |

- Cache hits do not count toward heavy source quotas.
- Reject unknown variable keys and geometries.
- Never accept a URL from the client. Source URLs are allowlisted in adapters.
- Use Convex’s built-in rate limiting or a small `rateLimits` table.
- If deployed behind a proxy, read the forwarded client IP carefully; do not trust arbitrary headers.

## 6. Versioning

- `schemaVersion` in the Convex schema for migrations.
- `normalizationVersion` in each series.
- `methodVersion` in each analysis.
- Cache keys include all three where relevant.
- API function names are stable; add new fields instead of changing existing ones.
- Mark deprecated fields in the docs before removing them.

## 7. Security

- Secrets live in Convex environment variables, never in the SPA.
- The stats service requires a shared secret header.
- The SPA talks only to Convex; no CORS configuration for data sources.
- Validate every input with Convex validators and Pydantic models.
- Do not log secrets, full API responses, or LLM prompts containing user data.
- Agent tools are an allowlist. The agent cannot fetch arbitrary URLs.
- Treat tool outputs as data, not instructions; prompt injection from source text must not change the agent’s tools or permissions.

## 8. Acceptance criteria

- The frontend can render a cached analysis with one `analyses.get` subscription.
- A cache miss returns a job ID and the UI can follow progress reactively.
- Every error has a code, a human message, and a retryable flag.
- Unknown inputs fail fast with `INVALID_INPUT`.
- The stats service rejects requests without the shared secret.
- No secret is present in the built SPA bundle.
