# Global city board: lazy cache architecture

The board lists every populated place in Natural Earth 10m (7,349 cities,
228 countries). It does NOT prefetch trends for all cities. Trend data is
fetched and computed only when a city is inspected, then cached in Convex.

Cities are grouped by MERRA-2 cell (0.5° x 0.625°): 6,561 unique cells. One
POWER series serves every city in a cell.

## City data

- `data/seed/global/cities.json` and `apps/web/public/data/cities.json`:
  `{id,name,country,region,lat,lon,timezone,population,cellId,aliases,curated,anchorRank}`
- `data/seed/global/cells.json`: `{id,lat,lon}` per cell.
- `apps/web/public/data/meta.json`:
  `{methodVersion,generatedAt,windows,seasons,cellCount,cityCount,source}`
  Do not ship a 7k-entry cell coordinate map in meta; the city row already
  carries `cellId` and lat/lon.

## Lazy cache flow

1. SPA loads cities, variables, meta, fires, cases, thenNow. `trends.cities`
   starts empty.
2. `ensureBoards(core, variableKeys, windowId, season)` calls the Convex
   query `trends:cachedBoard` for each variable. It returns compact rows for
   cached cells only. Merge each cell row into every city with that cellId.
3. Clicking a city calls the Convex action `stats:ensureCity` with
   `{cityId, variableKey, windowId, season}`.
   - If the cell cache is fresh, it returns immediately (`source:"cache"`).
   - If not, the action fetches the NASA POWER monthly series for the cell,
     calls the Python stats service `/analyze/cell`, stores the full records
     and gzipped series in the `cells` table, then returns
     `{source:"live"|"cache", cell, city}`.
   - The SPA merges the full records for that city and refreshes the board.
4. The map colors cached cells. Uncached cities stay gray and are labeled
   "NOT CACHED — CLICK TO FETCH". This is an explicit product state, not an
   error.

## Cell document

`cells` table row:
```
{
  cellId: string,
  lat: number,
  lon: number,
  records: {variable: {"window|season": TrendRecord}},
  seriesGz: string,              // base64(gzip(JSON.stringify({variable:[540 values]})))
  board: {variable: {"window|season": [slope, z, nYears, coverage, direction]}},
  pValues: {variable: {"window|season": p}},
  status: "ready" | "series_only" | "failed",
  methodVersion: string,
  fetchedAt: number,
  error?: string
}
```
`TrendRecord` keeps the existing TypeScript shape:
`status, slope, ci, p, pOls, olsSlope, significant, methodDependent,
direction, n, nYears, coverage, z, q, qVar, significantFdr,
significantVar, evidence, evidenceVar, effectiveStart`.

## FDR semantics

The cache is an exploratory board, not a completed global scan. For a
variable/window/season, q-values are Benjamini-Hochberg adjusted across the
cells currently cached for that board. `trends:cachedBoard` computes them on
read. The UI must say "q across N cached cells" and must not claim a global
FDR correction. The city file may additionally show `qVar` from BH across the
10 variables for that cell (computed by the stats service or Convex).

## Stats service extension

Add `POST /analyze/cell`:
```
{
  cell_id: string,
  series: [{variable_key, units, points:[{ts,value}]}],
  windows: [{id,start,end}],
  seasons: ["all","DJF","MAM","JJA","SON"],
  options?: {...}
}
```
Response:
```
{method_version, results:[{variable_key, window, season, result: TrendResult}]}
```
The service computes all combinations in one request. Convex sends one
request per uncached cell. 10 variables × 4 windows × 5 seasons = 200 tests,
about 1.5 s on the existing engine.

## Map density

`visibleCities` keeps the map fast:

- zoom < 3: population >= 5,000,000 (52 cities)
- zoom 3–4: population >= 500,000
- zoom 4–5: population >= 100,000
- zoom >= 5: all 7,349

Curated cities keep their Natural Earth footprints (121). Every other city
uses a circular display marker. The marker is not the MERRA-2 measurement support.
