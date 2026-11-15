# Architecture decision records

Each record uses the same shape: context, decision, consequences, alternatives, and the trigger that would make us revisit it. Status is `Accepted` unless noted.

---

## ADR-001: Browser SPA with Vite + React

**Status:** Accepted — 2026-11-14

**Context.** The submission needs a public link. The product is a single-page, terminal-style console with no SSR or SEO requirement. Osiris uses Next.js because it has API routes and server-rendered metadata, but Convex replaces the API routes and the SPA does not need SSR.

**Decision.** Build the client as a Vite + React 19 + TypeScript SPA. Serve it as static files. Use Convex as the only backend.

**Consequences.**
- Simpler deploy: static hosting plus Convex.
- No Next.js server process, no route handlers, no SSR cache.
- Convex React hooks handle data and realtime updates.
- The Osiris HUD components that depend on Next.js `Link` need small replacements.

**Alternatives considered.**
- Next.js static export: works, but adds Next.js machinery for no benefit.
- Next.js full stack + Convex: two backend surfaces; unnecessary.
- Literal TUI: cannot be the public submission link; poor demo ergonomics.

**Revisit if.** We need SSR, public SEO pages, or file-based API routes that Convex cannot express.

---

## ADR-002: Convex Cloud as the backend platform

**Status:** Accepted — 2026-11-14

**Context.** The app needs a reactive database, async jobs, file storage, scheduled work, an agent runtime, and strong type safety. The team wants the stack to be as agent-friendly as possible.

**Decision.** Use Convex Cloud for the database, queries, mutations, actions, file storage, scheduler, Agent component, Workflow component, and Workpool.

**Consequences.**
- One primary backend language: TypeScript.
- Generated types and schema validators give coding agents strong guardrails.
- Reactive queries remove manual WebSocket and polling code.
- Official AI-coding plugins, `llms.txt`, rules files, and an MCP server improve agent output.
- Server functions are TypeScript/JavaScript only; Python must be an external service.
- Node actions are capped at 10 minutes; data jobs must be chunked.
- Vendor lock-in is accepted for the hackathon. The backend is open source under FSL; self-hosting is possible but out of scope.
- Free tier (1M function calls/month, 0.5 GB database, 1 GB files) is enough for the demo.

**Alternatives considered.**
- FastAPI + SQLite: simple, but loses reactive UI, generated types, and built-in agent/workflow components.
- Supabase: Postgres and realtime, but more manual job/workflow/agent wiring.
- Restate + Postgres: stronger durable execution, but two runtimes and much more ops.
- Self-hosted Convex: possible, not a 48-hour task.

**Revisit if.** Convex action limits block a required workload, the team cannot accept FSL/vendor lock-in, or the app needs a long-lived daemon.

---

## ADR-003: Osiris HUD design system, adapted

**Status:** Accepted — 2026-11-14

**Context.** The user wants the Osiris client technical stack and HUD design. Osiris is MIT-licensed and has a mature dark-ops HUD: JetBrains Mono, glass panels, gold/cyan accents, status bar, command palette, dense panels, subtle scanlines.

**Decision.** Adopt the Osiris HUD tokens and component patterns, starting from its `TERMINAL` preset. Keep the terminal frame and glass panels, but increase small type sizes for legibility. Do not copy Osiris’s API routes or server code. The globe, camera, atmosphere, terrain, and custom-layer implementation details are in `osiris-globe-and-hud.md`.

**Consequences.**
- Distinctive, demo-friendly UI with little design invention.
- Need to keep the MIT license notice for copied code.
- Osiris’s 7px labels are too small; use 10–12px body and 11–13px chart labels.
- Some Osiris components depend on Next.js; replace `next/link` and server-only imports.

**Alternatives considered.**
- Build a new terminal design from scratch: slower, less coherent.
- Use a component library such as shadcn: useful, but Osiris’s HUD is the requested reference.

**Revisit if.** The HUD hurts readability or the team cannot maintain the custom components.

---

## ADR-004: Python stats microservice, not Rust

**Status:** Accepted — 2026-11-14

**Context.** The app needs Mann-Kendall, Sen’s slope, OLS with confidence intervals, seasonal adjustment, autocorrelation correction, and FDR. The workload is monthly series (hundreds to thousands of points), not global gridded analytics. A Rust implementation would require writing and validating the statistical tests.

**Decision.** Build a stateless Python 3.12 FastAPI service using NumPy, SciPy, statsmodels, and pymannkendall. Call it from Convex actions over HTTPS with a shared secret. Cache results in Convex.

**Consequences.**
- Validated statistical libraries and fast iteration.
- One extra small service to deploy and monitor.
- A typed request/response contract is required.
- Results must include `method_version`; cache keys include it.
- Python is not in the Convex runtime; every analysis is an external HTTP call.

**Alternatives considered.**
- Rust service: faster, but no demo benefit and much higher correctness risk.
- Rust compiled to WASM in a Convex Node action: build complexity and numerical-library gaps.
- TypeScript stats: one runtime, but requires reimplementing and validating the tests.
- Precompute only: insufficient for arbitrary places and live POWER queries.

**Revisit if.** The app moves to global gridded analysis, or a single hot path needs Rust/WASM for throughput.

---

## ADR-005: Convex Workflow + Workpool, not Restate

**Status:** Accepted — 2026-11-14

**Context.** Slow data sources need retries, concurrency limits, progress, and crash recovery. The agent needs durable multi-step execution with sleeps and human approval. Restate is a stronger durable-execution platform, but it is a separate stateful runtime and does not provide the database, reactive UI, or agent memory.

**Decision.** Use Convex Workpool for data fan-out and Convex Workflow for multi-step investigations. Do not add Restate for the MVP.

**Consequences.**
- One platform, one deployment, reactive workflow status.
- Data jobs must be chunked to fit Convex action time limits.
- Workflow handlers must be deterministic; side effects live in action steps.
- The Workflow component is newer than Restate; pin versions and test.
- No long-lived daemon; use scheduled functions and workflows.

**Alternatives considered.**
- Restate: better for unbounded long-running, polyglot, multi-service orchestration; too much ops for 48 hours.
- Celery + Redis: classic queue, but another service and no durable workflow semantics.
- Temporal: mature, but heavier than Restate for this scope.

**Revisit if.** An agent step must run longer than the Convex action ceiling, Python services need durable orchestration, or we need exactly-once coordination across multiple services.

---

## ADR-006: One narrow Analyst agent

**Status:** Accepted — 2026-11-14

**Context.** The product should show live agents doing analysis, but a general autonomous agent is risky, expensive, and hard to verify in 48 hours.

**Decision.** Build one “Analyst” agent with a fixed investigation loop and 4–6 typed tools. It runs on Convex Agent + Workflow. It is available on curated cases first; arbitrary-place investigations are a stretch.

**Consequences.**
- Memorable demo: the agent plans, fetches, analyzes, ranks, narrates, and verifies.
- Reuses the same tools as the deterministic UI.
- Requires strict guardrails: no invented numbers, citations for claims, no causal language.
- Agent cost and latency must be capped.
- The deterministic flow must work with the agent disabled.

**Alternatives considered.**
- Multi-agent system: more impressive on paper, much harder to debug.
- Python LangGraph + Restate: better for long-running Python agents, but more infrastructure.
- No agent: safer, but misses a requested differentiator.

**Revisit if.** The agent cannot meet the verification bar, or the demo needs to run without an LLM key.

---

## ADR-007: Cache-first series store with prewarmed cases

**Status:** Accepted — 2026-11-14

**Context.** The user wants to hit each API once. Historical Earth-science series are effectively immutable, and slow sources make live queries unreliable during a demo.

**Decision.** Cache normalized series, not raw HTTP responses. Fetch the full available history once per `(source, dataset version, variable, canonical geometry, frequency, aggregation, units)`. Slice any date range locally. Prewarm all curated cases and store their analyses.

**Consequences.**
- One upstream fetch per unique data need, not per user request.
- Date-range changes are instant.
- Historical entries have no TTL; the current month gets a short TTL.
- Need single-flight locks to avoid duplicate fetch on simultaneous misses.
- Need a prewarm script and a cached demo mode.
- Raw snapshots can be kept in file storage for provenance and debugging.

**Alternatives considered.**
- HTTP response cache: cannot serve a different date range or aggregation from one fetch.
- Per-request fetch: slow and unreliable.
- Precompute only: cannot support arbitrary places.

**Revisit if.** Data sources become mutable or real-time, or storage grows beyond Convex limits.

---

## ADR-008: No user accounts; URL state and export files

**Status:** Accepted — 2026-11-14

**Context.** The product must be usable instantly, with no sign-in or sign-up.

**Decision.** No authentication. Encode the view in the URL. Persist nothing per user. Provide share links and JSON case exports.

**Consequences.**
- Zero onboarding friction.
- The URL is the only saved state; no “my cases” page.
- The open API needs per-IP rate limits and job caps.
- No personal data is stored.
- Convex auth is not configured.

**Alternatives considered.**
- Anonymous sessions: adds cookie/state complexity for little value.
- Optional accounts: violates the “instant use” constraint.

**Revisit if.** Users need saved workspaces or collaboration.

---

## ADR-009: Source strategy

**Status:** Accepted — 2026-11-14

**Context.** Data sources differ wildly in latency, authentication, and reliability. Giovanni is 40–112 s and asynchronous; MODIS is tens of seconds per request; POWER is under a second.

**Decision.**
- **NASA POWER:** live point queries, cached forever for historical ranges.
- **Meteomatics:** jobs/cached; one long-series request is acceptable, but not on the demo critical path.
- **MODIS LAADS / ORNL DAAC:** prefetch or jobs; never a live dependency.
- **Giovanni:** build-time reference and citation only.
- **NOAA CDO:** optional, build-time or cached.
- **Geocoder:** cached; preset places first.

**Consequences.**
- The demo works with `DEMO_MODE=cached`.
- The app can still say it uses live NASA data through POWER.
- At least one curated case must use a challenge Resources-tab NASA resource for global-award eligibility.

**Alternatives considered.**
- All-live data: too slow and fragile.
- All-precomputed: safe but not a real tool.

**Revisit if.** A source adds a fast, reliable API or the demo scope changes.

---

## ADR-010: Deployment topology

**Status:** Accepted — 2026-11-14

**Context.** The app needs a public URL, a backend, and a Python numerical service. The team is small and the event is 48 hours.

**Decision.** Deploy Convex Cloud for the backend, a static SPA on Vercel/Netlify/Cloudflare Pages, and the Python stats service on Fly.io or Render. No Postgres, Redis, or container orchestrator.

**Consequences.**
- Two managed services plus one small Python machine.
- Convex handles database, realtime, jobs, storage, and agent state.
- The Python service is stateless and replaceable.
- `DEMO_MODE=cached` removes external data dependencies; the recorded video is the true offline fallback.

**Alternatives considered.**
- Single VPS with Docker Compose: more control, more ops.
- Vercel serverless for stats: cold starts and Python packaging pain.
- Self-hosted Convex: too much setup for the event.

**Revisit if.** The team needs a single deploy target or true offline operation.

---

## ADR-011: Nx monorepo with pnpm

**Status:** Accepted — 2026-11-14

**Context.** The deliverable combines a TypeScript SPA, Convex functions, a Python stats engine, and data/seed scripts. They share API and data contracts and change together during a 48-hour build. Separate repositories or ad-hoc root scripts would scatter configuration, commands, and dependency versions.

**Decision.** Manage the repository as an Nx monorepo with pnpm as the JavaScript package manager. The applications are `apps/web` (Vite + React SPA) and `apps/stats-engine` (Python 3.12 FastAPI service). Convex functions stay in the root `convex/` directory as their own Nx project. Python dependencies stay inside `apps/stats-engine` and are managed by `uv`; Nx orchestrates the project's `serve`, `test`, and `lint` targets through the Nx Python plugin (`@nxlv/python`). Use a single root `pnpm-lock.yaml` for all JavaScript dependencies.

**Consequences.**
- One `pnpm install` at the root and one JS lockfile.
- Nx exposes consistent targets (`serve`, `build`, `test`, `lint`) for every project.
- Nx caching and `nx affected` keep repeated checks fast.
- The Python service keeps its `uv` environment while joining the Nx project graph.
- Contributors need pnpm and Nx; commands are `pnpm nx ...` rather than per-app shell scripts.
- Nx adds configuration overhead, so keep the project set small: two apps, the Convex project, and shared libraries only when a real shared need appears.

**Alternatives considered.**
- Plain pnpm workspaces: simpler, but no task graph, caching, or unified Python targets.
- Turborepo: good JS task runner, weaker Python integration.
- Separate repositories: cleaner isolation, but worse for a shared 48-hour contract.
- Yarn or npm workspaces: workable, but pnpm is the team choice and enforces stricter dependency boundaries.

**Revisit if.** Nx configuration costs more time than it saves, or the Python plugin blocks the `uv` workflow.
