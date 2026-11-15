import { v } from "convex/values";
import { query } from "./_generated/server";
import { METHOD_VERSION } from "./lib/variables";

function statsConfigured(): boolean {
  const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return Boolean(processLike?.env?.STATS_BASE_URL);
}

export const health = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const keys = ["cities", "cells", "variables", "cases", "fires", "analyses"] as const;
    const counters = await Promise.all(
      keys.map((key) =>
        ctx.db
          .query("counters")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique(),
      ),
    );
    const counts = Object.fromEntries(
      keys.map((key, index) => [key, counters[index]?.count ?? 0]),
    ) as Record<(typeof keys)[number], number>;

    return {
      status: "ok",
      mode: "lazy",
      cityCount: counts.cities,
      cellCount: counts.cells,
      variableCount: counts.variables,
      caseCount: counts.cases,
      fireCount: counts.fires,
      analysisCount: counts.analyses,
      methodVersion: METHOD_VERSION,
      statsConfigured: statsConfigured(),
    };
  },
});
