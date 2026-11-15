import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { bumpCounter } from "./lib/counters";
import { cellForPoint } from "./lib/geo";
import { METHOD_VERSION } from "./lib/variables";

const WINDOW_START: Record<string, number> = { full: 1981, "35y": 1991, "25y": 2001, "15y": 2011 };

export const get = query({
  args: { cacheKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
  },
});

export const getByCacheKey = internalQuery({
  args: { cacheKey: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analyses")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
  },
});

export const saveAnalysis = internalMutation({
  args: {
    cacheKey: v.string(),
    cityId: v.string(),
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
    methodVersion: v.string(),
    result: v.any(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("analyses")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
    const doc = {
      cacheKey: args.cacheKey,
      cityId: args.cityId,
      variableKey: args.variableKey,
      windowId: args.windowId,
      season: args.season,
      methodVersion: args.methodVersion,
      result: args.result,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    if (existing) {
      await ctx.db.replace(existing._id, doc);
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("analyses", doc);
    await bumpCounter(ctx, "analyses", 1);
    return await ctx.db.get(id);
  },
});

/**
 * Legacy cached-analysis lookup. It now reads the city's cell document
 * instead of the removed cityTrends table.
 */
export const request = mutation({
  args: {
    cityId: v.string(),
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const city = await ctx.db.query("cities").withIndex("by_slug", (q) => q.eq("id", args.cityId)).unique();
    if (!city) throw new Error(`NO_DATA: unknown city ${args.cityId}`);

    const cellId = city.cellId || cellForPoint(city.lat, city.lon).cellId;
    const cacheKey = `analysis:${cellId}:${args.variableKey}:${args.windowId}:${args.season}:${METHOD_VERSION}`;
    const existing = await ctx.db
      .query("analyses")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .unique();
    if (existing) return { cacheKey, cached: true, analysis: existing };

    const cell = await ctx.db.query("cells").withIndex("by_cell", (q) => q.eq("cellId", cellId)).unique();
    const key = `${args.windowId}|${args.season}`;
    const result = cell?.records?.[args.variableKey]?.[key];
    if (!result) {
      throw new Error(`NO_DATA: ${args.cityId}/${args.variableKey}/${args.windowId}/${args.season}`);
    }
    const id = await ctx.db.insert("analyses", {
      cacheKey,
      cityId: args.cityId,
      variableKey: args.variableKey,
      windowId: args.windowId,
      season: args.season,
      methodVersion: METHOD_VERSION,
      result,
      createdAt: Date.now(),
    });
    await bumpCounter(ctx, "analyses", 1);
    return { cacheKey, cached: false, analysis: { _id: id, result } };
  },
});

export const ranking = mutation({
  args: {
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
    direction: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cells = await ctx.db.query("cells").take(10_000);
    const key = `${args.windowId}|${args.season}`;
    return cells
      .map((cell) => ({ cellId: cell.cellId, result: cell.records?.[args.variableKey]?.[key] }))
      .filter((row) => row.result && row.result.status === "ok")
      .filter(
        (row) =>
          args.direction === "all" ||
          (args.direction === "increasing" ? row.result.slope > 0 : row.result.slope < 0),
      )
      .sort(
        (a, b) =>
          Math.abs((b.result.z ?? b.result.slope ?? 0) as number) -
          Math.abs((a.result.z ?? a.result.slope ?? 0) as number),
      )
      .slice(0, 20);
  },
});

export const windowStart = query({
  args: { windowId: v.string() },
  returns: v.any(),
  handler: (ctx, args) => WINDOW_START[args.windowId] ?? 1981,
});
