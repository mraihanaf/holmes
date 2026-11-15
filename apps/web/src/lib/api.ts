import type {
  BoardMeta,
  CachedBoardResponse,
  CachedBoardRow,
  CachedCell,
  CaseEntry,
  City,
  CityTrends,
  EnsureCityResponse,
  FireData,
  Season,
  SeriesData,
  ThenNowData,
  TrendRecord,
  Variable,
  WindowDef,
  WindowId,
} from "./types";
import { compactRecord, mergeTrendRecord, recordKey } from "./trends";

const QUERY_TIMEOUT_MS = 15_000;
const ACTION_TIMEOUT_MS = 90_000;
const SERIES_START_YEAR = 1981;
const SERIES_MONTHS = 540;

export interface ModisTrend {
  series: { month: string; jakarta: number | null; wisconsin: number | null }[];
  trends: Record<
    string,
    {
      nYears: number;
      mean: number;
      slopePerDecade: number;
      p: number;
      ci: [number, number] | null;
      verdict: string;
    }
  >;
}

export interface BackendInfo {
  mode: "convex" | "static";
  health?: Record<string, unknown>;
}

export interface CoreData {
  cities: City[];
  variables: Variable[];
  trends: CityTrends;
  series: SeriesData;
  fires: FireData;
  thenNow: ThenNowData;
  cases: CaseEntry[];
  modis: ModisTrend | null;
  backend: BackendInfo;
  loadedBoards?: Record<string, boolean>;
  loadedCities?: Record<string, boolean>;
}

export const emptyFires: FireData = {
  snapshot: {
    start: "2026-11-10",
    end: "2026-11-14",
    source: "NASA FIRMS NRT",
    caveat:
      "FIRMS detects hot pixels. They can be wildfires, peat burning, land clearing, agricultural burns, or industrial flares. This is not a confirmed incident.",
  },
  points: [],
  clusters: [],
};

const FALLBACK_WINDOWS: WindowDef[] = [
  { id: "full", start: 1981, end: 2025, label: "FULL 1981-2025", short: "FULL" },
  { id: "35y", start: 1991, end: 2025, label: "35Y 1991-2025", short: "35Y" },
  { id: "25y", start: 2001, end: 2025, label: "25Y 2001-2025", short: "25Y" },
  { id: "15y", start: 2011, end: 2025, label: "15Y 2011-2025", short: "15Y" },
];

const FALLBACK_SEASONS: Season[] = ["all", "DJF", "MAM", "JJA", "SON"];

interface RecordUpdate {
  cityId: string;
  variableKey: string;
  key: string;
  record: TrendRecord;
}

let corePromise: Promise<CoreData> | null = null;
let convexDisabled = false;
const boardPromises = new Map<string, Promise<CachedBoardResponse | null>>();
const cityPromises = new Map<string, Promise<CoreData | null>>();


function convexUrl(): string | null {
  const configured = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim();
  return configured ? configured.replace(/\/+$/, "") : null;
}

export function hasConvexBackend(): boolean {
  return Boolean(convexUrl()) && !convexDisabled;
}

async function convexCall<T>(
  endpoint: "query" | "action",
  path: string,
  args: Record<string, unknown>,
  timeoutMs: number,
): Promise<T> {
  const url = convexUrl();
  if (!url) throw new Error("VITE_CONVEX_URL is not configured");
  let response: Response;
  try {
    response = await fetch(`${url}/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args, format: "json" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    convexDisabled = true;
    throw cause;
  }
  if (!response.ok) {
    if (response.status >= 500) convexDisabled = true;
    throw new Error(`Convex ${endpoint} ${path} failed: ${response.status}`);
  }
  const payload = (await response.json()) as {
    status?: string;
    value?: T;
    errorMessage?: string;
  };
  if (payload.status !== "success") {
    throw new Error(payload.errorMessage ?? `Convex ${endpoint} ${path} failed`);
  }
  return payload.value as T;
}

export function convexQuery<T>(path: string, args: Record<string, unknown> = {}): Promise<T> {
  return convexCall<T>("query", path, args, QUERY_TIMEOUT_MS);
}

export function convexAction<T>(path: string, args: Record<string, unknown> = {}): Promise<T> {
  return convexCall<T>("action", path, args, ACTION_TIMEOUT_MS);
}

function boardMetaFromHealth(
  health: Record<string, unknown> | null | undefined,
  cityCount: number,
): BoardMeta {
  const methodVersion =
    typeof health?.methodVersion === "string" ? health.methodVersion : "1.0.0";
  const cellCount = typeof health?.cellCount === "number" ? health.cellCount : 0;
  return {
    methodVersion,
    generatedAt: new Date().toISOString(),
    windows: FALLBACK_WINDOWS,
    seasons: FALLBACK_SEASONS,
    cellCount,
    cityCount,
    source: "convex cache",
  };
}

export function loadCoreData(): Promise<CoreData> {
  if (corePromise) return corePromise;
  corePromise = (async () => {
    if (!convexUrl()) {
      throw new Error(
        "VITE_CONVEX_URL is not configured; this build requires cached data from Convex",
      );
    }

    const [cities, variables, remoteFires, remoteCases, health] = await Promise.all([
      convexQuery<City[]>("catalog:listCities"),
      convexQuery<Variable[]>("catalog:listVariables"),
      convexQuery<FireData & { pointChunks?: FireData["points"][] }>("fires:latest"),
      convexQuery<CaseEntry[]>("cases:list"),
      convexQuery<Record<string, unknown> | null>("system:health"),
    ]);

    const meta = boardMetaFromHealth(health, cities.length);
    const trends: CityTrends = {
      methodVersion: meta.methodVersion,
      generatedAt: meta.generatedAt,
      windows: meta.windows,
      seasons: meta.seasons,
      cities: {},
    };
    const series: SeriesData = {
      startYear: SERIES_START_YEAR,
      months: SERIES_MONTHS,
      cities: {},
    };

    let fires = emptyFires;
    if (remoteFires?.clusters?.length) {
      const points = Array.isArray(remoteFires.pointChunks)
        ? remoteFires.pointChunks.flat()
        : remoteFires.points ?? [];
      fires = {
        snapshot: remoteFires.snapshot,
        points,
        clusters: remoteFires.clusters,
      } as FireData;
    }

    const order = [
      "jakarta-warming",
      "jakarta-scan",
      "wisconsin-aod",
      "jakarta-rainfall",
      "jakarta-air",
      "wisconsin-temperature",
    ];
    const cases = Array.isArray(remoteCases)
      ? [...remoteCases].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
      : [];

    return {
      cities: [...cities].sort((a, b) => a.anchorRank - b.anchorRank),
      variables,
      trends,
      series,
      fires,
      thenNow: {},
      cases,
      modis: null,
      backend: { mode: "convex", health: health ?? undefined },
      loadedBoards: {},
      loadedCities: {},
    };
  })();
  return corePromise;
}

function boardCacheKey(variableKey: string, windowId: WindowId, season: Season) {
  return `${variableKey}|${windowId}|${season}`;
}

function requestBoard(
  variableKey: string,
  windowId: WindowId,
  season: Season,
): Promise<CachedBoardResponse | null> {
  if (!hasConvexBackend()) return Promise.resolve(null);
  const key = boardCacheKey(variableKey, windowId, season);
  const existing = boardPromises.get(key);
  if (existing) return existing;
  const promise = convexQuery<CachedBoardResponse>("trends:cachedBoard", {
    variableKey,
    windowId,
    season,
  })
    .then((payload) =>
      payload ? { ...payload, rows: Array.isArray(payload.rows) ? payload.rows : [] } : null,
    )
    .catch((cause) => {
      console.info(`Cached board ${key} unavailable.`, cause);
      return null;
    })
    .finally(() => boardPromises.delete(key));
  boardPromises.set(key, promise);
  return promise;
}

function applyRecordUpdates(core: CoreData, updates: RecordUpdate[]): CoreData {
  if (!updates.length) return core;
  const byCity = new Map<string, Record<string, Record<string, TrendRecord>>>();
  for (const update of updates) {
    const variables = byCity.get(update.cityId) ?? {};
    const records = variables[update.variableKey] ?? {};
    records[update.key] = update.record;
    variables[update.variableKey] = records;
    byCity.set(update.cityId, variables);
  }
  const nextCities = { ...core.trends.cities };
  for (const [cityId, variables] of byCity) {
    const existing = nextCities[cityId] ?? {};
    const merged = { ...existing };
    for (const [variableKey, records] of Object.entries(variables)) {
      merged[variableKey] = { ...(existing[variableKey] ?? {}), ...records };
    }
    nextCities[cityId] = merged;
  }
  return { ...core, trends: { ...core.trends, cities: nextCities } };
}

function applySeriesUpdates(
  core: CoreData,
  updates: Record<string, Record<string, (number | null)[]>>,
): CoreData {
  const cityIds = Object.keys(updates);
  if (!cityIds.length) return core;
  const nextCities = { ...core.series.cities };
  for (const cityId of cityIds) {
    nextCities[cityId] = { ...(nextCities[cityId] ?? {}), ...updates[cityId] };
  }
  return { ...core, series: { ...core.series, cities: nextCities } };
}

/**
 * Merge a lazily loaded CoreData snapshot into the latest UI state. Board
 * fetches can finish after a city detail fetch; taking the field-level merge
 * keeps the detail fields and the cross-cell FDR board fields together.
 */
export function mergeCoreData(base: CoreData, patch: CoreData): CoreData {
  if (base === patch) return patch;
  const trendCities = { ...base.trends.cities };
  for (const [cityId, variables] of Object.entries(patch.trends.cities)) {
    const existingCity = trendCities[cityId] ?? {};
    const mergedCity = { ...existingCity };
    for (const [variableKey, records] of Object.entries(variables)) {
      const existingRecords = existingCity[variableKey] ?? {};
      const mergedRecords = { ...existingRecords };
      for (const [key, record] of Object.entries(records)) {
        const existing = existingRecords[key];
        mergedRecords[key] = existing ? mergeTrendRecord(existing, record) : record;
      }
      mergedCity[variableKey] = mergedRecords;
    }
    trendCities[cityId] = mergedCity;
  }

  const seriesCities = { ...base.series.cities };
  for (const [cityId, variables] of Object.entries(patch.series.cities)) {
    seriesCities[cityId] = { ...(seriesCities[cityId] ?? {}), ...variables };
  }

  return {
    ...patch,
    trends: { ...patch.trends, cities: trendCities },
    series: { ...patch.series, cities: seriesCities },
    loadedBoards: { ...(base.loadedBoards ?? {}), ...(patch.loadedBoards ?? {}) },
    loadedCities: { ...(base.loadedCities ?? {}), ...(patch.loadedCities ?? {}) },
    backend: patch.backend.mode === "convex" ? patch.backend : base.backend,
  };
}

function mergeBoardRows(
  core: CoreData,
  rows: CachedBoardRow[],
  variableKey: string,
  windowId: WindowId,
  season: Season,
): CoreData {
  if (!rows.length) return core;
  const citiesByCell = new Map<string, City[]>();
  for (const city of core.cities) {
    if (!city.cellId) continue;
    const cities = citiesByCell.get(city.cellId) ?? [];
    cities.push(city);
    citiesByCell.set(city.cellId, cities);
  }
  const key = recordKey(windowId, season);
  const updates: RecordUpdate[] = [];
  for (const row of rows) {
    const targets = citiesByCell.get(row.cellId);
    if (!targets?.length) continue;
    const record = compactRecord({
      slope: row.slope,
      z: row.z,
      q: row.q,
      p: row.p,
      nYears: row.nYears,
      coverage: row.coverage,
      direction: row.direction,
      evidence: row.evidence,
      methodDependent: row.methodDependent ?? false,
    });
    for (const city of targets) {
      updates.push({ cityId: city.id, variableKey, key, record });
    }
  }
  return applyRecordUpdates(core, updates);
}

export async function ensureBoards(
  core: CoreData,
  variableKeys: string[],
  windowId: WindowId,
  season: Season,
  force = false,
): Promise<CoreData | null> {
  const requested = [...new Set(variableKeys)];
  const missing = requested.filter(
    (variableKey) => force || !core.loadedBoards?.[boardCacheKey(variableKey, windowId, season)],
  );
  if (!missing.length) return null;

  let next = core;
  for (const variableKey of missing) {
    const response = await requestBoard(variableKey, windowId, season);
    if (response) {
      next = mergeBoardRows(next, response.rows, variableKey, windowId, season);
    }
  }
  const loadedBoards = { ...(core.loadedBoards ?? {}) };
  for (const variableKey of missing) loadedBoards[boardCacheKey(variableKey, windowId, season)] = true;
  return { ...next, loadedBoards };
}

async function decodeSeriesGz<T>(encoded: string): Promise<T> {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text) as T;
}

async function mergeCityDetail(
  core: CoreData,
  cityId: string,
  payload: EnsureCityResponse,
): Promise<CoreData | null> {
  const cell = payload.cell;
  if (!cell?.cellId) return null;
  const updates: RecordUpdate[] = [];
  for (const [variableKey, keys] of Object.entries(cell.records ?? {})) {
    for (const [key, record] of Object.entries(keys)) {
      const existing = core.trends.cities[cityId]?.[variableKey]?.[key];
      updates.push({
        cityId,
        variableKey,
        key,
        record: existing ? mergeTrendRecord(existing, record) : record,
      });
    }
  }
  let next = applyRecordUpdates(core, updates);
  let series = payload.series;
  if (!series && cell.seriesGz) {
    try {
      series = await decodeSeriesGz<Record<string, (number | null)[]>>(cell.seriesGz);
    } catch (cause) {
      console.info("Cell series could not be decoded.", cause);
    }
  }
  if (series && Object.keys(series).length) {
    next = applySeriesUpdates(next, { [cityId]: series });
  }
  return {
    ...next,
    loadedCities: { ...(next.loadedCities ?? core.loadedCities ?? {}), [cityId]: true },
    backend: { ...next.backend, mode: "convex" },
  };
}

export async function ensureCityDetail(
  core: CoreData,
  cityId: string,
  variableKey: string,
  windowId: WindowId,
  season: Season,
): Promise<CoreData | null> {
  if (core.loadedCities?.[cityId]) return null;
  const pending = cityPromises.get(cityId);
  if (pending) return pending;
  const promise = (async () => {
    if (!hasConvexBackend()) return null;

    try {
      const cell = await convexQuery<CachedCell | null>("trends:cellForCity", { cityId });
      const cacheFresh =
        cell?.status === "ready" &&
        (!cell.methodVersion || cell.methodVersion === core.trends.methodVersion) &&
        Object.keys(cell.records ?? {}).length > 0;
      if (cell?.cellId && cacheFresh) {
        return await mergeCityDetail(core, cityId, { source: "cache", cell });
      }
    } catch (cause) {
      console.info(`City ${cityId} cached cell unavailable; trying live fetch.`, cause);
    }

    try {
      const payload = await convexAction<EnsureCityResponse>("stats:ensureCity", {
        cityId,
        variableKey,
        windowId,
        season,
      });
      return await mergeCityDetail(core, cityId, payload);
    } catch (cause) {
      console.info(`City ${cityId} live fetch failed.`, cause);
      return null;
    }
  })().finally(() => cityPromises.delete(cityId));
  cityPromises.set(cityId, promise);
  return promise;
}


export function resetDataCache() {
  corePromise = null;
  convexDisabled = false;
  boardPromises.clear();
  cityPromises.clear();
}
