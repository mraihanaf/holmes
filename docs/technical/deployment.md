# Deployment and operations

The app has three deployable pieces:

1. **Convex Cloud** — database, functions, file storage, scheduler, Agent, Workflow, Workpool.
2. **Static SPA** — Vite build on Vercel, Netlify, or Cloudflare Pages.
3. **Python stats service** — FastAPI on Fly.io or Render.

No Postgres, Redis, container orchestrator, or custom auth server.

## 1. Topology

```text
Browser
  │ HTTPS + websocket
  ▼
Convex Cloud
  │ HTTPS
  ├──► Python stats service (Fly/Render)
  ├──► NASA POWER
  ├──► MODIS / LAADS
  ├──► Meteomatics
  └──► LLM provider

Static SPA (Vercel/Netlify/Cloudflare Pages)
  │ loads from CDN
  └──► Convex Cloud
```

The SPA never calls the stats service or data sources directly.

## 2. Environments

| Environment | Purpose | Backend | Data mode | LLM |
|---|---|---|---|---|
| **local** | Development | Convex dev deployment | `live` | Optional |
| **preview** | Team review | Convex preview deployment | `cached` or `live` | Optional |
| **demo** | Judging | Convex production deployment | `cached` | On for agent demo |
| **fallback** | Bad network | Recorded video | — | — |

Convex supports separate dev and production deployments. Use `pnpm exec convex dev` for development and `pnpm exec convex deploy` for production. Do not point the demo at a dev deployment.

## 3. Environment variables

### Convex deployment

Set with `pnpm exec convex env set NAME value`.

| Variable | Purpose |
|---|---|
| `STATS_BASE_URL` | Python service URL |
| `STATS_SHARED_SECRET` | Shared secret for `/analyze` |
| `DEMO_MODE` | `cached`, `live`, or `off` |
| `EARTHDATA_USERNAME` | Giovanni/GES DISC build-time or optional |
| `EARTHDATA_PASSWORD` | Same |
| `LAADS_TOKEN` | MODIS LAADS |
| `METEOMATICS_USERNAME` | Meteomatics basic auth |
| `METEOMATICS_PASSWORD` | Meteomatics basic auth |
| `NOAA_CDO_TOKEN` | Optional NOAA CDO |
| `FIRMS_MAP_KEY` | Optional FIRMS |
| `LLM_PROVIDER` | `openai`, `anthropic`, `google`, etc. |
| `LLM_API_KEY` | Provider key |
| `LLM_MODEL` | Model id |
| `SENTRY_DSN` | Optional error reporting |

### SPA build

Only variables prefixed with `VITE_` are exposed to the browser.

| Variable | Purpose |
|---|---|
| `VITE_CONVEX_URL` | Convex deployment URL |
| `VITE_APP_VERSION` | Display version |

Never put source credentials or LLM keys in `VITE_*`.

### Python stats service

| Variable | Purpose |
|---|---|
| `STATS_SHARED_SECRET` | Must match Convex |
| `PORT` | Service port |
| `LOG_LEVEL` | `info` by default |

## 4. Deploy order

### 4.1 Convex

```bash
pnpm exec convex dev          # first run: create/link a deployment
pnpm exec convex deploy       # production
```

Set production environment variables before the first deploy with data access.

### 4.2 Python stats service

Fly.io example:

```bash
cd apps/stats-engine
fly launch --no-deploy
fly secrets set STATS_SHARED_SECRET=...
fly deploy
curl https://<service>/healthz
```

Render example: create a web service from `apps/stats-engine`, set the start command:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Use one always-on instance for the demo. Scale-to-zero cold starts are not worth the risk.

### 4.3 SPA

Vercel/Netlify/Cloudflare Pages:

- Root directory: repository root (so the pnpm workspace and Nx graph resolve)
- Build command: `pnpm nx build web`
- Output directory: `dist/apps/web`
- Environment: `VITE_CONVEX_URL`
- SPA fallback: rewrite all routes to `index.html`

### 4.4 Seed and prewarm

```bash
pnpm exec convex run seed:loadCatalog
pnpm exec convex run seed:loadCases
pnpm exec convex run seed:prewarm
```

`prewarm` must:

1. Resolve each case.
2. Ensure its series exist.
3. Run the default analysis.
4. Verify the chart data and verdict exist.
5. Mark the case published.

Run prewarm after every deploy and before the demo. A failed case fails the command.

### 4.5 Smoke test

```bash
curl https://<convex-site>/api/health   # if exposed; otherwise use `system.health`
curl https://<stats>/healthz
```

Then open the public SPA in a logged-out incognito window and check:

- Jakarta case loads.
- Wisconsin case loads.
- Share URL restores the view.
- Cached mode badge is visible.
- No console errors.

## 5. Demo mode

`DEMO_MODE=cached`:

- Disables all external data calls.
- Serves prewarmed series and analyses.
- Shows `CACHED SNAPSHOT`.
- Is the mode used for the 30-second video.

`DEMO_MODE=live`:

- Allows live NASA POWER.
- Falls back to cached data on error.
- Shows `LIVE` or `STALE`.

`DEMO_MODE=off`:

- Development only.
- All sources allowed.

Cached mode removes external data dependencies, not the network dependency on Convex. **The recorded video is the true offline fallback.** If the venue network is unreliable, test with a phone hotspot and keep the video ready.

If true offline operation is mandatory, self-host Convex on the demo laptop and run the SPA locally. That is an extra deployment target and is not recommended for the 48-hour build.

## 6. Security

- No user authentication; the app is public by design.
- Per-IP rate limits: 60 reads/min, 10 analyses/min, 2 active jobs.
- Global queue cap: 100 jobs.
- Max bbox: 20° × 20° or 100 grid cells.
- Validate every input with Convex validators and Pydantic.
- Secrets live only in Convex env and the stats service env.
- The stats service requires `X-Stats-Secret`; `/healthz` is public.
- The agent tools are an allowlist; no arbitrary URLs.
- Treat source text as data, not instructions. Do not let prompt injection change tools or permissions.
- Log request IDs and job IDs, not secrets or full source payloads.
- CORS: the SPA uses the Convex client; no direct browser calls to the stats service or sources.

## 7. Observability

### Convex

- Use the Convex dashboard for function logs, errors, and slow queries.
- Log job transitions: `queued → running → succeeded/failed`, with cache key and source.
- Log cache hits/misses and upstream latency.
- Keep a `system.health` query for queue depth, cache counts, and demo mode.

### Python stats service

- `/healthz` returns status and `method_version`.
- Log request ID, series count, duration, and status; never log the full series.
- Return structured errors with codes.
- Optional Sentry for exceptions.

### Frontend

- Log only client errors and route changes; no personal data.
- Show a visible error boundary with a reload action.
- Show the app version and Convex deployment in the footer or status line.

## 8. Runbook

| Symptom | Check | Action |
|---|---|---|
| Case page is empty | `cases.list`, `cases.get`, prewarm logs | Re-run prewarm; verify series and analysis |
| Cached chart does not render | `analyses.get` for the cache key | Rebuild the analysis; check method version |
| Live query is slow | Job status and source latency | Wait; show progress; fall back to cached |
| Source 429 | Source quota and job logs | Back off; use cached; reduce concurrency |
| Stats service 5xx | `/healthz`, Fly/Render logs | Restart; cached analyses still work |
| Agent fails | Workflow status, LLM quota | Use deterministic verdict; disable agent panel |
| Share URL broken | URL params and route fallback | Fix SPA rewrite; test incognito |
| Demo network fails | Hotspot and video | Switch to recorded video; do not debug live |

## 9. Cost

Expected hackathon cost:

- **Convex Free:** 1M function calls/month, 0.5 GB database, 1 GB files. Enough for the demo; monitor function calls if the UI polls (it should not).
- **Static SPA:** free tier on Vercel/Netlify/Cloudflare Pages.
- **Fly.io/Render:** one small always-on machine, roughly $5–10/month.
- **LLM:** a few dollars at most if the agent is capped; use a cheap planning model.
- **Data sources:** free tiers / hackathon accounts.

No Redis, Postgres, or orchestration cluster.

## 10. Deployment acceptance criteria

- The public SPA loads in a logged-out browser.
- `DEMO_MODE=cached` makes zero external data calls.
- All curated cases load from prewarmed data.
- The stats service is reachable only with the shared secret (except `/healthz`).
- No secret appears in the built SPA.
- A failed source does not break cached cases.
- The 30-second demo video is recorded and stored separately.
- The team has a phone hotspot and a local fallback plan.
