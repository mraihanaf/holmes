import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cities: defineTable({
    id: v.string(),
    name: v.string(),
    country: v.string(),
    region: v.string(),
    lat: v.number(),
    lon: v.number(),
    timezone: v.string(),
    population: v.number(),
    anchorRank: v.number(),
    aliases: v.array(v.string()),
    cellId: v.string(),
    curated: v.boolean(),
  })
    .index("by_slug", ["id"])
    .searchIndex("search_name", { searchField: "name" }),

  cells: defineTable({
    cellId: v.string(),
    lat: v.number(),
    lon: v.number(),
    records: v.any(),
    seriesGz: v.string(),
    board: v.any(),
    pValues: v.any(),
    status: v.union(v.literal("ready"), v.literal("series_only"), v.literal("failed")),
    methodVersion: v.string(),
    fetchedAt: v.number(),
    error: v.optional(v.string()),
    source: v.optional(v.string()),
  }).index("by_cell", ["cellId"]),

  /** Compact projection of `cells` for the reactive board read. */
  cellBoards: defineTable({
    cellId: v.string(),
    board: v.any(),
    pValues: v.any(),
    status: v.union(v.literal("ready"), v.literal("series_only"), v.literal("failed")),
    methodVersion: v.string(),
    fetchedAt: v.number(),
  }).index("by_cell", ["cellId"]),

  /** One small doc per counted table, so health never scans full documents. */
  counters: defineTable({
    key: v.string(),
    count: v.number(),
  }).index("by_key", ["key"]),

  variables: defineTable({
    key: v.string(),
    sourceKey: v.string(),
    label: v.string(),
    code: v.string(),
    definition: v.string(),
    units: v.string(),
    nativeFrequency: v.union(v.literal("daily"), v.literal("monthly")),
    aggregation: v.union(v.literal("mean"), v.literal("sum")),
    coverageStart: v.string(),
    coverageEnd: v.string(),
    theme: v.string(),
    caveats: v.array(v.string()),
    resourcesTab: v.boolean(),
    sourceDetail: v.string(),
  }).index("by_key", ["key"]),

  cases: defineTable({
    slug: v.string(),
    title: v.string(),
    question: v.string(),
    placeId: v.string(),
    variableKeys: v.array(v.string()),
    windowId: v.string(),
    season: v.string(),
    narrative: v.string(),
    source: v.string(),
    sourcesTab: v.boolean(),
  }).index("by_slug", ["slug"]),

  fires: defineTable({
    snapshot: v.any(),
    pointChunks: v.array(v.any()),
    clusters: v.any(),
  }),

  analyses: defineTable({
    cacheKey: v.string(),
    cityId: v.string(),
    variableKey: v.string(),
    windowId: v.string(),
    season: v.string(),
    methodVersion: v.string(),
    result: v.any(),
    createdAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]),

  jobs: defineTable({
    cacheKey: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    stage: v.string(),
    done: v.number(),
    total: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]).index("by_status", ["status"]),

  threads: defineTable({
    sessionId: v.string(),
    question: v.string(),
    cityId: v.optional(v.string()),
    answer: v.any(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
