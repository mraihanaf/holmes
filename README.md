# HOLMES
Holmes turns a searchable global city board into a reproducible NASA data investigation: a globe of city trends, a sourced evidence file, and a statistical verdict.

Built for the **NASA Space Apps Challenge 2026 — Be an Earth System Trend Detective!** (Jakarta).

## What is in this repo

| Surface | What it does |
|---|---|
| **The Board** | MapLibre globe with **7,349 populated places in 228 countries** (Natural Earth 10m), grouped into 6,561 MERRA-2 cells. Cached cells are colored by a NASA POWER trend; gray cells are fetched when you inspect them. |
| **The Lens** | Variable filter, window presets (full, 35Y, 25Y, 15Y), season filter, four map lenses (Effect, Evidence, Agreement, Coverage), and a toggleable MERRA-2 grid with a highlighted selected cell. |
| **City Search** | Search every city by name, country, or region. Results are ranked by population; the search bar sits at the bottom of the board. |
| **The File** | On first inspection, the backend fetches one NASA POWER series for the city's MERRA-2 cell, computes all 200 variable × window × season trends through the Python stats engine, and caches the result in Convex. The file shows key notes, verdict, evidence stack with sparklines, a uPlot time-series chart with trend + 95% CI, live NASA GIBS Then & Now for any city, and provenance. |
| **The Watch** | NASA FIRMS global 7-day MODIS snapshot, top 40 clusters by country, heatmap, notices, and explicit “hot pixels are not confirmed wildfires” wording. |

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



## Data Sources

- **NASA POWER / MERRA-2** monthly values are fetched live for an uncached cell and cached in Convex. Source: NASA POWER monthly point API.
- **AOD_55** is CERES SYN1deg, not MODIS. The UI labels it correctly.
- **MODIS MYD08_M3** is a separate Resources-tab cross-check for Jakarta and Wisconsin, using the research CSV from the challenge assets.
- **NASA FIRMS** is a global 7-day MODIS C6.1 snapshot, confidence ≥ nominal, aggregated to 1° clusters and 0.5° heat cells. It is not a live alert service.
- **NASA GIBS** Then & Now works for every city. Jakarta and Wisconsin keep their cached curated pairs; every other city builds a live GIBS WMS request for the same calendar date in 2001 and 2025 (true and false color).
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

## SI Usage

- Convex agent skills
- Anthropic webapp-testing skill
- Prime Agent: A self improving RLM Harness
