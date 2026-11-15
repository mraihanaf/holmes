# Verification log

Verified 2026-11-15 against the local dev server, the production preview build,
the dev Convex deployment, and the production Convex deployment.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Web unit tests | `pnpm --dir apps/web test` | 11 passed |
| Stats unit + contract tests | `cd apps/stats-engine && uv run pytest -q` | 23 passed |
| TypeScript | `pnpm exec tsc -p apps/web/tsconfig.json --noEmit` | clean |
| Production build | `VITE_CONVEX_URL=... VITE_BASE_PATH=/holmes/ pnpm build` | clean; `dist/apps/web` |
| Stats health | `curl https://<stats>/healthz` | `{"status":"ok","method_version":"1.0.0"}` |
| Stats cell endpoint | `POST /analyze/cell` with 10 Jakarta series | 200 results in 1.75 s |
| Convex dev health | `npx convex run system:health` | 7,349 cities, 128+ cells, 10 variables |
| Convex prod health | `npx convex run --prod system:health` | 7,349 cities, 121 cells, 10 variables |
| Convex lazy fetch | `npx convex run --prod stats:ensureCity {ushuaia-ar}` | `source:live`, status ready |
| Convex cache hit | repeat Porto | `source:cache` in 1.9 s |
| Convex board | `trends:cachedBoard T2M/25y/all` | 121 unique rows, q/evidence strings |

## Playwright scenarios

The browser tests used headless Chromium with WebGL2 (SwiftShader).

1. **Global load** — `/holmes/` production preview loads 7,349 cities and 120+
   cached cells from Convex; no startup request for the 8 MB monolith.
2. **Starter case** — “Jakarta warming” opens the city file, shows `WARMING`,
   p < 0.001, n = 300, and the evidence stack.
3. **Uncached city** — search “Ushuaia” and open it. The header shows
   `FETCHING CITY DATA`; the action fetches POWER, runs `/analyze/cell`, stores
   the cell, and the cached-cell count increments. The file shows
   `METHOD-DEPENDENT` and qVar values.
4. **Second uncached city** — Yellowknife opens from cache after the first
   inspection path; the circle marker is colored and the notes show qVar.
5. **City search** — 7,349 cities; typing filters instantly and caps the
   rendered list at 40 results.
6. **Geometry** — curated cities use their Natural Earth/GeoBoundaries
   footprints; other cities use a circular display marker, never a rectangle.
7. **Console** — no page errors. Only Chromium SwiftShader performance warnings
   appear.

## Screenshots

- `screenshots/hero-1440.png` (older curated build)
- Local smoke: `/tmp/holmes-prod-globe.png`, `/tmp/holmes-prod-jakarta.png`,
  `/tmp/holmes-prod-yellowknife.png`

## Known limitations verified in the UI

- Gray circles are not cached yet; clicking one triggers the lazy fetch.
- q-values on the board are FDR-adjusted across cached cells only; the status
  ticker says this explicitly.
- A city marker is a MERRA-2 cell, not a station or administrative boundary.
- CERES AOD_55 and MODIS MYD08_M3 are separate products.
- FIRMS detections are hot pixels, not confirmed wildfires.
- Satellite imagery is visual context, not a trend test.
