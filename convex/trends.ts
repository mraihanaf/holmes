import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { bumpCounter } from "./lib/counters";
import { benjaminiHochberg, evidenceLevel } from "./lib/fdr";
import { gunzipJson } from "./lib/gzip";
import { cellForPoint } from "./lib/geo";
import { directionName } from "./lib/trend";

const CELL_SCAN_LIMIT = 10_000;

const cellStatus = v.union(v.literal("ready"), v.literal("series_only"), v.literal("failed"));

type BoardEntry = [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

function boardEntry(entry: unknown): BoardEntry | null {
  if (Array.isArray(entry) && entry.length >= 5) {
    return [
      entry[0] ?? null,
      entry[1] ?? null,
      entry[2] ?? null,
      entry[3] ?? null,
      entry[4] ?? null,
      entry[5] ?? 0,
    ];
  }
  if (entry && typeof entry === "object") {
    const value = entry as Record<string, unknown>;
    return [
      (value.slope as number | null) ?? null,
      (value.z as number | null) ?? null,
      (value.nYears as number | null) ?? null,
      (value.coverage as number | null) ?? null,
      (value.direction as number | null) ?? null,
      (value.methodDependent as number | null) ?? 0,
    ];
  }
  return null;
}

export const cell = query({
  args: { cellId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("cells").withIndex("by_cell", (q) => q.eq("cellId", args.cellId)).unique();
  },
});

export const cellForCity = query({
  args: { cityId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const city = await ctx.db.query("cities").withIndex("by_slug", (q) => q.eq("id", args.cityId)).unique();
    if (!city) return null;
    const cellId = city.cellId || cellForPoint(city.lat, city.lon).cellId;
    return await ctx.db.query("cells").withIndex("by_cell", (q) => q.eq("cellId", cellId)).unique();
  },
});

/**
 * Compact rows for every cached cell on one board. Benjamini-Hochberg
 * q-values are computed on read across the cached cells only; this is an
 * exploratory correction, not a global scan.
 */
export const cachedBoard = query({
  args: {
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const key = `${args.windowId}|${args.season}`;
    const cells = await ctx.db.query("cellBoards").take(CELL_SCAN_LIMIT);

    const cached = [];
    const seen = new Set<string>();
    for (const cell of cells) {
      if (cell.status !== "ready") continue;
      if (seen.has(cell.cellId)) continue;
      seen.add(cell.cellId);
      const board = cell.board?.[args.variableKey]?.[key];
      const entry = boardEntry(board);
      if (!entry) continue;
      const rawP = cell.pValues?.[args.variableKey]?.[key];
      cached.push({
        cellId: cell.cellId,
        slope: entry[0],
        z: entry[1],
        nYears: entry[2],
        coverage: entry[3],
        direction: directionName(entry[4]),
        methodDependent: entry[5] === 1,
        p: typeof rawP === "number" && Number.isFinite(rawP) ? rawP : null,
      });
    }

    const qValues = benjaminiHochberg(cached.map((row) => row.p));
    const rows = cached.map((row, index) => ({
      cellId: row.cellId,
      slope: row.slope,
      z: row.z,
      nYears: row.nYears,
      coverage: row.coverage,
      direction: row.direction,
      q: qValues[index],
      evidence: evidenceLevel(qValues[index], row.nYears ?? 0, row.methodDependent),
    }));
    return {
      variableKey: args.variableKey,
      windowId: args.windowId,
      season: args.season,
      cachedCells: rows.length,
      rows,
    };
  },
});

/**
 * Backwards-compatible single-series read. The series is stored as
 * base64(gzip(JSON)); this query decodes it without Node built-ins so it can
 * keep the old query call shape.
 */
export const series = query({
  args: { cityId: v.string(), variableKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const city = await ctx.db.query("cities").withIndex("by_slug", (q) => q.eq("id", args.cityId)).unique();
    if (!city) return null;
    const cellId = city.cellId || cellForPoint(city.lat, city.lon).cellId;
    const cell = await ctx.db.query("cells").withIndex("by_cell", (q) => q.eq("cellId", cellId)).unique();
    if (!cell?.seriesGz) return null;
    try {
      const series = gunzipJson<Record<string, Array<number | null>>>(cell.seriesGz);
      return series[args.variableKey] ?? null;
    } catch {
      return null;
    }
  },
});

/** Action-facing cell lookup. Actions cannot read ctx.db directly. */
export const getCellDoc = internalQuery({
  args: { cellId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("cells").withIndex("by_cell", (q) => q.eq("cellId", args.cellId)).unique();
  },
});

/** Insert or replace one cell document after a fetch or analysis run. */
export const upsertCell = internalMutation({
  args: {
    cellId: v.string(),
    lat: v.number(),
    lon: v.number(),
    records: v.any(),
    seriesGz: v.string(),
    board: v.any(),
    pValues: v.any(),
    status: cellStatus,
    methodVersion: v.string(),
    fetchedAt: v.number(),
    error: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const doc: Record<string, unknown> = {
      cellId: args.cellId,
      lat: args.lat,
      lon: args.lon,
      records: args.records,
      seriesGz: args.seriesGz,
      board: args.board,
      pValues: args.pValues,
      status: args.status,
      methodVersion: args.methodVersion,
      fetchedAt: args.fetchedAt,
    };
    if (args.error !== undefined) doc.error = args.error;
    if (args.source !== undefined) doc.source = args.source;

    const existing = await ctx.db
      .query("cells")
      .withIndex("by_cell", (q) => q.eq("cellId", args.cellId))
      .unique();
    let cellId = existing?._id;
    if (existing) {
      await ctx.db.replace(existing._id, doc as any);
    } else {
      cellId = await ctx.db.insert("cells", doc as any);
      await bumpCounter(ctx, "cells", 1);
    }

    const boardDoc = {
      cellId: args.cellId,
      board: args.board,
      pValues: args.pValues,
      status: args.status,
      methodVersion: args.methodVersion,
      fetchedAt: args.fetchedAt,
    };
    const boardMatches = await ctx.db
      .query("cellBoards")
      .withIndex("by_cell", (q) => q.eq("cellId", args.cellId))
      .take(10);
    const [existingBoard, ...extraBoards] = boardMatches;
    if (existingBoard) {
      await ctx.db.replace(existingBoard._id, boardDoc as any);
    } else {
      await ctx.db.insert("cellBoards", boardDoc as any);
    }
    for (const extra of extraBoards) await ctx.db.delete(extra._id);

    return cellId ? await ctx.db.get(cellId) : null;
  },
});
