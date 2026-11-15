import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

const CITY_SCAN_LIMIT = 10_000;
const EMPTY_QUERY_SCAN_LIMIT = 1_000;
const SEARCH_LIMIT = 20;
const DEFAULT_SEARCH_LIMIT = 8;

export const listVariables = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const variables = await ctx.db.query("variables").take(100);
    return variables.sort((a, b) => a.label.localeCompare(b.label));
  },
});

export const getVariable = query({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("variables").withIndex("by_key", (q) => q.eq("key", args.key)).unique();
  },
});

export const listCities = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const cities = await ctx.db.query("cities").take(CITY_SCAN_LIMIT);
    return cities.sort((a, b) => a.anchorRank - b.anchorRank);
  },
});

export const getCity = query({
  args: { cityId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("cities").withIndex("by_slug", (q) => q.eq("id", args.cityId)).unique();
  },
});

export const countCities = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const cities = await ctx.db.query("cities").take(CITY_SCAN_LIMIT);
    return cities.length;
  },
});

export const searchCities = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const needle = args.query.trim();
    const limit = Math.max(1, Math.min(SEARCH_LIMIT, Math.floor(args.limit ?? DEFAULT_SEARCH_LIMIT)));

    if (!needle) {
      const cities = await ctx.db.query("cities").take(EMPTY_QUERY_SCAN_LIMIT);
      return cities.sort((a, b) => a.anchorRank - b.anchorRank).slice(0, limit);
    }

    return await ctx.db
      .query("cities")
      .withSearchIndex("search_name", (q) => q.search("name", needle))
      .take(limit);
  },
});

/** Action-facing lookup by slug. Actions cannot read ctx.db directly. */
export const getCityDoc = internalQuery({
  args: { cityId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("cities").withIndex("by_slug", (q) => q.eq("id", args.cityId)).unique();
  },
});
