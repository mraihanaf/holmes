# HOLMES — Earth System Detective

Holmes turns a searchable global city board into a reproducible NASA data investigation: a globe of city trends, a sourced evidence file, and a statistical verdict.

Built for the **NASA Space Apps Challenge 2026 — Be an Earth System Trend Detective!** (Jakarta).

![Holmes — hero](docs/screenshots/hero-1440.png)

See [`docs/verification.md`](docs/verification.md) for the Playwright verification log and more screenshots.

## What is in this repo

| Surface | What it does |
|---|---|
| **The Board** | MapLibre globe with **7,349 populated places in 228 countries** (Natural Earth 10m), grouped into 6,561 MERRA-2 cells. Cached cells are colored by a NASA POWER trend; gray cells are fetched when you inspect them. |
| **The Lens** | Variable filter, window presets (full, 35Y, 25Y, 15Y), season filter, and four map lenses: Effect, Evidence, Agreement, Coverage. |
| **City Search** | Search every city by name, country, or region. Results are ranked by population; the search bar sits at the bottom of the board. |
| **The File** | On first inspection, the backend fetches one NASA POWER series for the city's MERRA-2 cell, computes all 200 variable × window × season trends through the Python stats engine, and caches the result in Convex. The file shows key notes, verdict, evidence stack with sparklines, a uPlot time-series chart with trend + 95% CI, NASA GIBS Then & Now, and provenance. |
| **The Watch** | NASA FIRMS cached Indonesia snapshot, top clusters, heatmap, notices, and explicit “hot pixels are not confirmed wildfires” wording. |

## Quick start

Requirements: **Node 20+**, **pnpm 10+**, **Python 3.12+**, **uv**, and a Convex account.

```bash
cd holmes
pnpm install
npx convex dev            # first run creates/links a dev deployment
bash scripts/seed_convex.sh
pnpm dev                 # Vite SPA at http://localhost:5173
```

The SPA falls back to the 121 curated cities when Convex is unreachable. In normal mode it lists all 7,349 cities and caches new cells on demand.

The Python statistics service:

```bash
cd apps/stats-engine
uv sync
uv run pytest -q
STATS_SHARED_SECRET=dev-secret uv run uvicorn app.main:app --reload --port 8000
```

Set the Convex deployment variables so the live action can reach it:

```bash
npx convex env set STATS_BASE_URL https://<your-stats-service>
npx convex env set STATS_SHARED_SECRET <same-secret>
```

The SPA reads `VITE_CONVEX_URL` from `.env.local` (or the build environment).

## Architecture: global board, lazy cell cache

The old demo precomputed every trend for 121 cities and shipped an 8 MB JSON file. The global board cannot do that: 7,349 cities × 10 variables × 4 windows × 5 seasons is too much to download. Instead:

1. **Cities are static.** `apps/web/public/data/cities.json` carries every populated place plus its MERRA-2 `cellId`.
2. **The map is a cache view.** `trends:cachedBoard` returns compact rows for cells already in Convex. The SPA paints those cells and leaves the rest gray.
3. **A city inspection fills the cache.** `stats:ensureCity` checks the cell, fetches one NASA POWER monthly series (10 parameters, 1981–2025) if missing, calls the Python `/analyze/cell` endpoint for all 200 trend combinations, and writes the full records plus a compact `cellBoards` projection.
4. **q-values are local to the cache.** For a variable/window/season, Benjamini–Hochberg is applied across the cells currently cached, not a completed global scan. The UI says so.
5. **One POWER series serves a cell.** Every city in a 0.5° × 0.625° MERRA-2 cell shares the same reanalysis series, so the cache key is the cell.

This keeps the first load small (cities + metadata, no 8 MB monolith), makes every city inspectable, and avoids prefetching the planet.

## Project layout

```text
apps/web/                Vite + React 19 + TypeScript + Tailwind 4 SPA
  src/components/        GlobeMap, Header, VariableRail, RightPanel, CitySearch, …
  src/lib/               types, lazy Convex loader, trend helpers
  public/data/           cities, meta, fires, GIBS metadata, countries, curated fallback
apps/stats-engine/       FastAPI + NumPy/SciPy/statsmodels/pymannkendall
convex/                  schema, catalog, trends, stats action, cells, cases, fires
data/seed/global/        generated 7,349-city list and 6,561-cell list
scripts/                 build_global_cities.py, build_seed_cells.py, seed_convex.sh
docs/                    concept + technical + problem dossier
```

## Data pipeline

1. **Build the city list.** `pnpm cities:build` downloads nothing; it reads the Natural Earth 10m populated-places shapefile under `data/seed/raw/ne/` and writes `data/seed/global/cities.json` plus `cells.json`. Curated demo IDs (`jakarta`, `surabaya`, …) are preserved.
2. **Build the curated seed.** `pnpm seed:cells:build` converts the existing 121-city precomputed trends into `convex/data/seed-cells.jsonl` and `seed-cell-boards.jsonl`.
3. **Seed Convex.** `bash scripts/seed_convex.sh` imports cities, variables, the curated cells, cases, and fires, then refreshes the health counters.
4. **Inspect any city.** The `stats:ensureCity` action does the rest at runtime. The Python stats engine is the only place that computes trends.

The curated 121-city prewarm scripts (`scripts/prewarm.py`, `scripts/fetch_power.py`) remain for the offline fallback and the starter cases.

## What is real and what is cached

- **NASA POWER / MERRA-2** monthly values are fetched live for an uncached cell and cached in Convex. Source: NASA POWER monthly point API.
- **AOD_55** is CERES SYN1deg, not MODIS. The UI labels it correctly.
- **MODIS MYD08_M3** is a separate Resources-tab cross-check for Jakarta and Wisconsin, using the research CSV from the challenge assets.
- **NASA FIRMS** is a 5-day Indonesia snapshot (10–14 Nov 2026), confidence-filtered and clustered. It is not a live alert service.
- **NASA GIBS** images are cached MODIS Terra true/false color for Jakarta and Wisconsin, same calendar month, ±3 days where needed.
- **Curated cells** are precomputed; every other cell is computed on first inspection. The provenance panel says which path produced the file.

## Testing

```bash
pnpm test                         # web unit tests + stats tests via Nx
pnpm --dir apps/web exec vitest run
cd apps/stats-engine && uv run pytest -q
pnpm build                        # production SPA build
```

A reproducible browser smoke test lives in `scripts/verify_webapp.py`. It expects a server and a Python environment with Playwright (the webapp-testing skill environment):

```bash
pnpm dev &
python scripts/verify_webapp.py --url http://localhost:5173 --screenshots
```

The current build was verified with Playwright: all 7,349 cities list, 128 cached cells render, starter cases open, an uncached city (Ushuaia) fetches and caches live, and the console is clean.

## Convex functions

| Function | Purpose |
|---|---|
| `catalog.listVariables`, `catalog.getVariable` | Variable catalog |
| `catalog.listCities`, `catalog.getCity`, `catalog.searchCities`, `catalog.countCities` | City anchors and search |
| `trends.cachedBoard` | Compact board rows for cached cells, q across the cached set |
| `trends.cell`, `trends.cellForCity` | Full cached cell records |
| `trends.series` | One cached monthly series |
| `stats.ensureCity` | Lazy POWER fetch + `/analyze/cell` + cache write |
| `stats.runAnalysis` | One-series live analysis, cached in `analyses` |
| `stats.checkStats` | Python service health |
| `cases.list`, `cases.get` | Starter cases |
| `fires.latest` | FIRMS snapshot and clusters |
| `system.health` | Counts and method/version health |
| `seed.*` | Import helpers, board projection, counters |

## Limitations

- A city marker is a **MERRA-2 grid cell** (~55 × 69 km), not a weather station or an administrative boundary.
- A trend is a statistical association, not a causal attribution. Holmes does not forecast.
- p-values are not probabilities of truth. The Evidence Lens shows statistical evidence strength.
- q-values on the global board are FDR-adjusted across the cells currently cached. They are not a completed global scan; inspect more cities to grow the board.
- The `cellBoards` read model is about 13.7 KB per cell, so a single board read is comfortable up to roughly 1,000 cached cells. Shard or paginate the board read before caching thousands.
- Short records are noisy. The 15Y window is a comparison, not a headline.
- MODIS and CERES AOD are different products. Never mix them in one series.
- FIRMS hot pixels can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares.
- Satellite images are visual context, not a trend test. Clouds and seasons can mislead.
- The demo is desktop-first. Mobile supports the full-screen panel and bottom chat but is a stretch.

## Attribution

NASA POWER / MERRA-2 / CERES SYN1deg · NASA FIRMS NRT · NASA GIBS / MODIS Terra · Natural Earth (public domain) · MapLibre GL · CARTO Dark Matter reference · Osiris HUD (MIT) · React, Vite, Tailwind, uPlot, framer-motion, lucide-react, Convex.

No NASA logo or endorsement is implied. Holmes is an independent hackathon project.

## AI integrations installed

- Convex agent skills: `npx skills add convex/agent-skills --all -g` (also installed in `holmes/.agents/`)
- Anthropic webapp-testing skill: `npx skills add https://github.com/anthropics/skills --skill webapp-testing -g`

The application itself does **not** require an LLM key or an agent runtime.
