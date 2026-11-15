"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { Buffer } from "node:buffer";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildCellResults, type CellAnalysisResponse, type CellSeries } from "./lib/cellResults";
import { cellForPoint } from "./lib/geo";
import { monthTimestamps, type SeriesValues } from "./lib/trend";
import {
  METHOD_VERSION,
  SEASONS,
  VARIABLES,
  WINDOWS,
  variableMeta,
  windowStart,
} from "./lib/variables";
import { fetchPowerCell, PowerFetchError, type PowerSeries } from "./power";

const STATS_TIMEOUT_MS = 60_000;
const HEALTH_TIMEOUT_MS = 10_000;

class StatsServiceError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "StatsServiceError";
    this.status = status;
  }
}

type CityDoc = {
  id: string;
  lat: number;
  lon: number;
  cellId?: string;
  [key: string]: unknown;
};

type CellDoc = {
  cellId: string;
  seriesGz?: string;
  status?: string;
  methodVersion?: string;
  records?: unknown;
  board?: unknown;
  pValues?: unknown;
  [key: string]: unknown;
};

function env(name: string): string | undefined {
  const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = processLike?.env?.[name];
  return value && value.length > 0 ? value : undefined;
}

function statsBaseUrl(): string | null {
  const value = env("STATS_BASE_URL");
  return value ? value.replace(/\/+$/, "") : null;
}

function statsSecret(): string {
  return env("STATS_SHARED_SECRET") ?? "";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 240);
  return String(error).slice(0, 240);
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const suffix = detail ? `: ${detail.slice(0, 160)}` : "";
      throw new StatsServiceError(`Stats service returned ${response.status}${suffix}`, response.status);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof StatsServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new StatsServiceError(`Stats service timed out after ${Math.round(timeoutMs / 1000)} seconds`);
    }
    throw new StatsServiceError(`Stats service request failed: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function encodeSeriesGz(series: PowerSeries): string {
  const json = JSON.stringify(series);
  return Buffer.from(gzipSync(Buffer.from(json, "utf8"))).toString("base64");
}

function decodeSeriesGz(seriesGz: string): CellSeries {
  const json = gunzipSync(Buffer.from(seriesGz, "base64")).toString("utf8");
  return JSON.parse(json) as CellSeries;
}

function seriesFromGz(seriesGz: string | undefined): CellSeries | null {
  if (!seriesGz) return null;
  try {
    return decodeSeriesGz(seriesGz);
  } catch {
    return null;
  }
}

function pointsForWindow(series: SeriesValues, startYear: number) {
  return monthTimestamps()
    .map((ts, index) => ({ ts, value: series[index] ?? null }))
    .filter((point) => Number(point.ts.slice(0, 4)) >= startYear);
}

function cellRequestBody(cellId: string, series: CellSeries) {
  const timestamps = monthTimestamps();
  return {
    cell_id: cellId,
    series: VARIABLES.map((variable) => ({
      variable_key: variable.key,
      units: variable.units,
      points: timestamps.map((ts, index) => ({
        ts,
        value: series[variable.key]?.[index] ?? null,
      })),
    })),
    windows: WINDOWS.map((window) => ({ id: window.id, start: window.start, end: window.end })),
    seasons: [...SEASONS],
  };
}

async function analyzeCell(
  baseUrl: string,
  cellId: string,
  series: CellSeries,
): Promise<CellAnalysisResponse> {
  return (await requestJson(
    `${baseUrl}/analyze/cell`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stats-secret": statsSecret(),
      },
      body: JSON.stringify(cellRequestBody(cellId, series)),
    },
    STATS_TIMEOUT_MS,
  )) as CellAnalysisResponse;
}

async function analyzeOneSeries(
  baseUrl: string,
  cellId: string,
  variableKey: string,
  windowId: string,
  season: string,
  series: CellSeries,
): Promise<Record<string, unknown>> {
  const meta = variableMeta(variableKey);
  if (!meta) throw new ConvexError(`Unknown variable: ${variableKey}`);
  const values = series[variableKey];
  if (!values) throw new ConvexError(`No series for ${variableKey} in cell ${cellId}`);

  const body = {
    series_id: `${cellId}:${variableKey}:${windowId}:${season}`,
    variable_key: variableKey,
    units: meta.units,
    frequency: "monthly",
    aggregation: meta.aggregation,
    points: pointsForWindow(values, windowStart(windowId)),
    options: {
      season,
      seasonal: "deseasonalize",
      test: "mann_kendall",
      autocorrelation: "hamed_rao",
      confidence: 0.95,
      min_years: 10,
    },
  };

  return (await requestJson(
    `${baseUrl}/analyze`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stats-secret": statsSecret(),
      },
      body: JSON.stringify(body),
    },
    STATS_TIMEOUT_MS,
  )) as Record<string, unknown>;
}

/**
 * Lazy city entry point. Returns the cached cell when it is fresh, otherwise
 * fetches one POWER series for the city's MERRA-2 cell, asks the Python stats
 * service for every variable/window/season, and stores the result.
 */
export const ensureCity = action({
  args: {
    cityId: v.string(),
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
    force: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const city = (await ctx.runQuery(internal.catalog.getCityDoc, { cityId: args.cityId })) as CityDoc | null;
    if (!city) throw new ConvexError(`Unknown city: ${args.cityId}`);

    const cellPoint = cellForPoint(city.lat, city.lon);
    const cached = (await ctx.runQuery(internal.trends.getCellDoc, {
      cellId: cellPoint.cellId,
    })) as CellDoc | null;

    if (
      !args.force &&
      cached?.status === "ready" &&
      cached.methodVersion === METHOD_VERSION
    ) {
      return { source: "cache", cell: cached, city, series: seriesFromGz(cached.seriesGz) };
    }

    let series = args.force ? null : seriesFromGz(cached?.seriesGz);
    if (!series) {
      try {
        series = await fetchPowerCell(cellPoint);
      } catch (error) {
        const message = error instanceof PowerFetchError ? error.message : errorMessage(error);
        await ctx.runMutation(internal.trends.upsertCell, {
          cellId: cellPoint.cellId,
          lat: cellPoint.lat,
          lon: cellPoint.lon,
          records: cached?.records ?? {},
          seriesGz: cached?.seriesGz ?? "",
          board: cached?.board ?? {},
          pValues: cached?.pValues ?? {},
          status: "failed",
          methodVersion: cached?.methodVersion ?? METHOD_VERSION,
          fetchedAt: Date.now(),
          error: message,
          source: "power",
        });
        throw new ConvexError(message);
      }
    }

    const seriesGz = encodeSeriesGz(series);
    const baseUrl = statsBaseUrl();
    if (!baseUrl) {
      const cell: any = await ctx.runMutation(internal.trends.upsertCell, {
        cellId: cellPoint.cellId,
        lat: cellPoint.lat,
        lon: cellPoint.lon,
        records: cached?.records ?? {},
        seriesGz,
        board: cached?.board ?? {},
        pValues: cached?.pValues ?? {},
        status: "series_only",
        methodVersion: cached?.methodVersion ?? METHOD_VERSION,
        fetchedAt: Date.now(),
        error: "STATS_BASE_URL is not configured",
        source: "power",
      });
      return {
        source: "series_only",
        cell,
        city,
        series,
        error: {
          code: "stats_unconfigured",
          message: "STATS_BASE_URL is not configured; the POWER series was cached without trends.",
        },
      };
    }

    let analysis: CellAnalysisResponse;
    try {
      analysis = await analyzeCell(baseUrl, cellPoint.cellId, series);
    } catch (error) {
      const message = error instanceof StatsServiceError ? error.message : errorMessage(error);
      const cell: any = await ctx.runMutation(internal.trends.upsertCell, {
        cellId: cellPoint.cellId,
        lat: cellPoint.lat,
        lon: cellPoint.lon,
        records: cached?.records ?? {},
        seriesGz,
        board: cached?.board ?? {},
        pValues: cached?.pValues ?? {},
        status: "series_only",
        methodVersion: cached?.methodVersion ?? METHOD_VERSION,
        fetchedAt: Date.now(),
        error: message,
        source: "power",
      });
      return {
        source: "series_only",
        cell,
        city,
        series,
        error: { code: "stats_failed", message },
      };
    }

    const built = buildCellResults(analysis, series);
    const methodVersion = analysis.method_version ?? METHOD_VERSION;
    const cell: any = await ctx.runMutation(internal.trends.upsertCell, {
      cellId: cellPoint.cellId,
      lat: cellPoint.lat,
      lon: cellPoint.lon,
      records: built.records,
      seriesGz,
      board: built.board,
      pValues: built.pValues,
      status: "ready",
      methodVersion,
      fetchedAt: Date.now(),
      source: "power",
    });
    return { source: "live", cell, city, series };
  },
});

/** One cached analysis for a single city/variable/window/season. */
export const runAnalysis = action({
  args: {
    cityId: v.string(),
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
    force: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    const city = (await ctx.runQuery(internal.catalog.getCityDoc, { cityId: args.cityId })) as CityDoc | null;
    if (!city) throw new ConvexError(`Unknown city: ${args.cityId}`);

    const cellPoint = cellForPoint(city.lat, city.lon);
    const cacheKey = `analysis:${cellPoint.cellId}:${args.variableKey}:${args.windowId}:${args.season}:${METHOD_VERSION}`;
    if (!args.force) {
      const existing: any = await ctx.runQuery(internal.analyses.getByCacheKey, { cacheKey });
      if (existing) {
        return {
          source: "cache",
          cacheKey,
          methodVersion: existing.methodVersion,
          result: existing.result,
        };
      }
    }

    const cached = (await ctx.runQuery(internal.trends.getCellDoc, {
      cellId: cellPoint.cellId,
    })) as CellDoc | null;
    let series = args.force ? null : seriesFromGz(cached?.seriesGz);
    if (!series) {
      try {
        series = await fetchPowerCell(cellPoint);
      } catch (error) {
        const message = error instanceof PowerFetchError ? error.message : errorMessage(error);
        throw new ConvexError(message);
      }
      await ctx.runMutation(internal.trends.upsertCell, {
        cellId: cellPoint.cellId,
        lat: cellPoint.lat,
        lon: cellPoint.lon,
        records: cached?.records ?? {},
        seriesGz: encodeSeriesGz(series),
        board: cached?.board ?? {},
        pValues: cached?.pValues ?? {},
        status: "series_only",
        methodVersion: cached?.methodVersion ?? METHOD_VERSION,
        fetchedAt: Date.now(),
        source: "power",
      });
    }

    const baseUrl = statsBaseUrl();
    if (!baseUrl) {
      return {
        source: "series_only",
        cacheKey,
        error: {
          code: "stats_unconfigured",
          message: "STATS_BASE_URL is not configured; the POWER series was cached without an analysis.",
        },
      };
    }

    const result = await analyzeOneSeries(
      baseUrl,
      cellPoint.cellId,
      args.variableKey,
      args.windowId,
      args.season,
      series,
    );
    const methodVersion =
      typeof result.method_version === "string" ? result.method_version : METHOD_VERSION;
    await ctx.runMutation(internal.analyses.saveAnalysis, {
      cacheKey,
      cityId: args.cityId,
      variableKey: args.variableKey,
      windowId: args.windowId,
      season: args.season,
      methodVersion,
      result,
    });
    return { source: "live", cacheKey, methodVersion, result };
  },
});

export const checkStats = action({
  args: {},
  returns: v.any(),
  handler: async () => {
    const baseUrl = statsBaseUrl();
    if (!baseUrl) {
      return { configured: false, ok: false, methodVersion: null };
    }
    try {
      const payload = (await requestJson(`${baseUrl}/healthz`, { method: "GET" }, HEALTH_TIMEOUT_MS)) as {
        status?: string;
        method_version?: string;
      };
      return {
        configured: true,
        ok: payload.status === "ok",
        methodVersion: payload.method_version ?? null,
      };
    } catch (error) {
      return {
        configured: true,
        ok: false,
        methodVersion: null,
        error: errorMessage(error),
      };
    }
  },
});
