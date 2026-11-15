# Technical architecture — Earth System Trend Detective

**Status:** decisions locked 2026-11-14 for the NASA Space Apps 2026 Jakarta build.
**Scope:** 48-hour MVP, no user accounts, public demo link.
**Product surface:** browser SPA with a terminal-style HUD.

This folder is the implementation contract for the app. It records the stack, the data and cache model, the statistics contract, the agent workflow, the API surface, the frontend system, and the deployment plan. If a decision changes, update `decisions.md` first.

## 1. Product in one page

A visitor opens the app and immediately sees a terminal-style console. They pick a place, a NASA Earth-science variable, and a period. The app returns:

1. A monthly or annual time series.
2. A fitted trend and a robust slope.
3. A significance verdict with a p-value, sample size, and method.
4. The source, dataset version, retrieval date, and citation.
5. A shareable URL and an exportable case file.

The app also ships 3–5 **curated cases** that load instantly from prewarmed data. One of them is the official Wisconsin AOD example; one is a Jakarta case. A narrow **Analyst agent** can run the same investigation visibly: plan, fetch, analyze, rank, narrate, verify.

The product is not a general Earth-science platform. It is one polished investigation flow plus one signature scan.

## 2. Stack at a glance

| Layer | Choice | Notes |
|---|---|---|
| **Monorepo** | Nx + pnpm | `apps/web`, `apps/stats-engine`; one JS lockfile |
| **Frontend** | Vite + React 19 + TypeScript + Tailwind 4 | Nx project `web`; SPA, static hosting |
| **HUD** | Osiris design system and TERMINAL preset | MIT-licensed reference; adapt type sizes |
| **Map** | MapLibre GL + react-map-gl | Region point/bbox picker |
| **Charts** | uPlot or lightweight-charts | Time series, trend line, confidence band |
| **Motion / icons** | framer-motion, lucide-react | HUD transitions and icon set |
| **Backend** | Convex Cloud | Database, functions, storage, scheduler, agent, workflow |
| **Stats** | Python 3.12 + FastAPI + SciPy + pymannkendall | Nx project `stats-engine`; stateless service |
| **Agent** | Convex Agent + Workflow + Workpool | One narrow Analyst agent |
| **Data** | Cache-first series store in Convex | POWER live; MODIS/Meteomatics cached/jobs |
| **Deploy** | Convex Cloud + static SPA + Fly/Render stats | Two managed services, one small Python service |

## 3. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ SPA: Vite + React 19 + TypeScript + Tailwind 4              │
│                                                             │
│  Command bar · Variable rail · Map · Series chart           │
│  Verdict panel · Evidence feed · Analyst trace · Status line│
└───────────────────────────┬─────────────────────────────────┘
                            │ Convex React client (websocket)
┌───────────────────────────▼─────────────────────────────────┐
│ Convex Cloud                                                │
│                                                             │
│  queries / mutations / actions                              │
│  schema: sources, variables, series, points, jobs, analyses │
│  components: Agent, Workflow, Workpool, Rate Limiter        │
│  file storage: raw snapshots, exported case files           │
│  scheduler: prewarm, current-month refresh                  │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
┌───────────────▼──────────────┐   ┌────────────▼─────────────┐
│ External data adapters       │   │ Python stats service     │
│ NASA POWER · MODIS ·         │   │ FastAPI · NumPy · SciPy  │
│ Meteomatics · geocoder       │   │ pymannkendall · statsmodels│
└──────────────────────────────┘   └──────────────────────────┘
```

Convex is the app platform. The Python service is the numerical engine. The SPA never talks to the Python service or to data sources directly; it only talks to Convex.

## 4. Core flow

1. The SPA encodes the current view in the URL: `v=T2M&place=jakarta&from=2000&to=2025&agg=monthly&seasonal=deseasonalized`.
2. The SPA subscribes to `analyses.get(cacheKey)`.
3. **Cache hit:** Convex returns the series, trend result, and provenance. Cached demo cases must render in under one second.
4. **Cache miss:** a mutation creates an `analysisJobs` document and schedules an action. The action ensures the series is in the store, calls the Python stats service, and writes the analysis. The UI subscribes to the job and shows progress.
5. Slow sources (MODIS, Meteomatics) go through Workpool jobs. NASA POWER point queries can run synchronously with a short timeout.
6. The Analyst agent runs a Convex Workflow. It calls the same `ensureSeries`, `analyze`, and `rank` tools as the UI. It writes a brief with result IDs and citations; a verification step checks every number before publishing.

## 5. MVP and non-goals

### Must ship

- No-login SPA with a terminal-style HUD.
- Place selection: preset places, coordinates, and map point/bbox.
- Variable catalog with plain-language definitions, units, source, and coverage.
- 3–5 curated cases, prewarmed and available in cached mode.
- Live NASA POWER point queries for a supported variable set.
- Monthly and annual time series with a trend line and units.
- OLS slope + confidence interval, Sen's slope, Mann-Kendall p-value, verdict.
- Deseasonalized toggle.
- Provenance panel: source, dataset version, retrieval date, citation, license.
- Share URL and export case JSON.
- Job progress for slow sources.
- One narrow Analyst agent on curated cases, with a visible trace.
- Cached demo mode and a recorded video fallback.

### Non-goals

- User accounts, payments, saved user profiles.
- Global gridded live analysis for every variable.
- Real-time satellite ingestion.
- Multi-agent autonomous system.
- Mobile native app.
- Custom model training.
- Claims of causality from a trend.
- A literal terminal TUI as the primary submission surface.

## 6. Repository layout

```text
apps/
  web/                     # Vite SPA (Nx project: web)
    src/
    project.json
  stats-engine/            # Python FastAPI service (Nx project: stats-engine)
    app/
      main.py
      models.py
      methods.py
    tests/
    pyproject.toml
    uv.lock
    project.json
convex/                    # schema, queries, mutations, actions, components (Nx project)
  schema.ts
  catalog.ts
  data.ts
  analyses.ts
  jobs.ts
  agent.ts
  workflows.ts
  project.json
data/seed/                 # curated cases and cached series
scripts/                   # prewarm, validation, data checks
docs/technical/            # this folder
nx.json                    # Nx project graph, targets, cache
pnpm-workspace.yaml        # pnpm workspace definition
pnpm-lock.yaml             # single JS lockfile
package.json               # Nx and JS dependencies
```

Nx owns task orchestration for every project in the graph. pnpm is the only JavaScript package manager; do not add a second JS lockfile. Python dependencies stay inside `apps/stats-engine` and are managed by `uv`.

## 7. Data and demo strategy

- **NASA POWER** is the primary live, no-auth, point-query source. It is usually fast (0.4–0.8 s). Use it for any place, but cache every result.
- **MODIS, Meteomatics, and Giovanni** are not live dependencies. MODIS and Meteomatics run through jobs and are cached. Giovanni is build-time reference only; its requests take 40–112 s and are asynchronous.
- **Curated cases** are fetched at build/deploy time and stored in Convex. They must work with `DEMO_MODE=cached`, which disables all external data calls.
- **At least one shipped case must use a NASA resource from the challenge Resources tab** (Giovanni/MODIS AOD, AppEEARS, or GES DISC). NASA POWER alone may not satisfy the global-award rule.
- Every series and result carries provenance. The UI must show it without opening a modal.

## 8. Key decisions

| ADR | Decision |
|---|---|
| [ADR-001](decisions.md) | Browser SPA with Vite + React, not Next.js |
| [ADR-002](decisions.md) | Convex Cloud as the backend platform |
| [ADR-003](decisions.md) | Osiris HUD system, adapted for legibility |
| [ADR-004](decisions.md) | Python stats microservice, not Rust |
| [ADR-005](decisions.md) | Convex Workflow + Workpool, not Restate |
| [ADR-006](decisions.md) | One narrow Analyst agent, not a multi-agent system |
| [ADR-007](decisions.md) | Cache-first series store with prewarmed cases |
| [ADR-008](decisions.md) | No user accounts; URL state and export files |
| [ADR-009](decisions.md) | Source strategy: POWER live, MODIS/Meteomatics cached |
| [ADR-010](decisions.md) | Deployment: Convex Cloud + static SPA + Fly/Render stats |
| [ADR-011](decisions.md) | Nx monorepo with pnpm; `apps/web` and `apps/stats-engine` |

## 9. Target commands

These are the intended commands once the repository is scaffolded.

```bash
# Install all JavaScript dependencies from the repo root
pnpm install

# Frontend + Convex
pnpm nx serve web             # Vite dev server on apps/web
pnpm exec convex dev          # sync functions and generated types

# Python stats service
pnpm nx run stats-engine:serve
# or directly: cd apps/stats-engine && uv sync && uv run uvicorn app.main:app --reload

# Tests
pnpm nx run-many -t test    # all projects in the Nx graph
pnpm nx affected -t test    # only projects changed since the base branch

# Deploy
pnpm exec convex deploy
pnpm nx build web           # static SPA in apps/web/dist
cd apps/stats-engine && fly deploy
```

## 10. Assumptions and constraints

- The submission needs a public link; the browser SPA is the primary surface.
- "Terminal dashboard" means terminal-style UX, not a literal TUI.
- The team is small and the build window is ~48 hours.
- Convex Cloud is acceptable for the hackathon; vendor lock-in is a conscious trade.
- One external Python service is acceptable; more services are not.
- `DEMO_MODE=cached` removes external data dependencies, but the SPA still needs Convex Cloud and network. A recorded 30-second video is the true offline fallback.
- The app must not expose Earthdata, LAADS, Meteomatics, NOAA, or LLM credentials to the browser.

## 11. Reading order

1. This page.
2. `decisions.md` — why the stack looks like this.
3. `data-and-cache.md` — sources, normalization, cache keys, jobs.
4. `stats.md` — statistical methods and the Python contract.
5. `api.md` — Convex functions, stats HTTP API, errors, limits.
6. `frontend.md` — Osiris HUD adaptation, layout, commands, charts.
7. `osiris-globe-and-hud.md` — reverse-engineered globe, atmosphere, camera, terrain, and HUD implementation details.
8. `agent.md` — Analyst workflow, tools, guardrails.
9. `deployment.md` — topology, env vars, deploy, demo runbook.

Research context lives in `../problems/`: the challenge dossier, data access notes, trend-analysis guide, and prior-art research.
