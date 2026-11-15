import { action, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { bumpCounter, getCounter, setCounter } from "./lib/counters";

const SEED_TABLES = [
  "cities",
  "cells",
  "cellBoards",
  "variables",
  "cases",
  "fires",
  "analyses",
  "jobs",
  "threads",
  "counters",
] as const;

const CLEAR_BATCH_LIMIT = 10_000;
const CELL_SCAN_LIMIT = 10_000;

function compactBoard(row: {
  cellId: string;
  board?: unknown;
  pValues?: unknown;
  status: "ready" | "series_only" | "failed";
  methodVersion: string;
  fetchedAt: number;
}) {
  return {
    cellId: row.cellId,
    board: row.board ?? {},
    pValues: row.pValues ?? {},
    status: row.status,
    methodVersion: row.methodVersion,
    fetchedAt: row.fetchedAt,
  };
}

export const clear = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    for (const table of SEED_TABLES) {
      const rows = await ctx.db.query(table).take(CLEAR_BATCH_LIMIT);
      for (const row of rows) await ctx.db.delete(row._id);
    }
    return { ok: true };
  },
});

export const insertCities = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    for (const row of args.rows) await ctx.db.insert("cities", row);
    await bumpCounter(ctx, "cities", args.rows.length);
    return { inserted: args.rows.length };
  },
});

export const insertCells = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    for (const row of args.rows) {
      await ctx.db.insert("cells", row);
      await ctx.db.insert("cellBoards", compactBoard(row));
    }
    await bumpCounter(ctx, "cells", args.rows.length);
    return { inserted: args.rows.length };
  },
});

export const insertCellBoards = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    let inserted = 0;
    let replaced = 0;
    for (const row of args.rows) {
      const existing = await ctx.db
        .query("cellBoards")
        .withIndex("by_cell", (q) => q.eq("cellId", row.cellId))
        .first();
      if (existing) {
        await ctx.db.replace(existing._id, row);
        replaced += 1;
      } else {
        await ctx.db.insert("cellBoards", row);
        inserted += 1;
      }
    }
    return { inserted, replaced };
  },
});

export const insertVariables = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    for (const row of args.rows) await ctx.db.insert("variables", row);
    await bumpCounter(ctx, "variables", args.rows.length);
    return { inserted: args.rows.length };
  },
});

export const insertCases = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    for (const row of args.rows) await ctx.db.insert("cases", row);
    await bumpCounter(ctx, "cases", args.rows.length);
    return { inserted: args.rows.length };
  },
});

export const insertFires = mutation({
  args: { rows: v.array(v.any()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    for (const row of args.rows) await ctx.db.insert("fires", row);
    await bumpCounter(ctx, "fires", args.rows.length);
    return { inserted: args.rows.length };
  },
});

/**
 * Backfill for data loaded with `npx convex import`, which bypasses
 * mutations. Pages the heavy `cells` documents so each transaction stays
 * under the 16 MiB read limit, and writes one compact `cellBoards` row per
 * cell. Safe to run repeatedly.
 */
export const rebuildCellBoardsPage = internalMutation({
  args: { cursor: v.optional(v.string()), batchSize: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const requested = Math.floor(args.batchSize ?? 20);
    const batchSize = Math.max(1, Math.min(40, requested));
    const page = await ctx.db.query("cells").paginate({
      numItems: batchSize,
      cursor: args.cursor ?? null,
    });
    let inserted = 0;
    let replaced = 0;
    for (const cell of page.page) {
      const doc = compactBoard(cell);
      const matches = await ctx.db
        .query("cellBoards")
        .withIndex("by_cell", (q) => q.eq("cellId", cell.cellId))
        .take(10);
      const [existing, ...extraBoards] = matches;
      if (existing) {
        await ctx.db.replace(existing._id, doc as any);
        replaced += 1;
      } else {
        await ctx.db.insert("cellBoards", doc as any);
        inserted += 1;
      }
      for (const extra of extraBoards) await ctx.db.delete(extra._id);
    }
    return {
      processed: page.page.length,
      inserted,
      replaced,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const setCellsCounter = internalMutation({
  args: { count: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    await setCounter(ctx, "cells", args.count);
    return { count: args.count };
  },
});

/** Action wrapper so one CLI call can rebuild every page safely. */
export const rebuildCellBoards = action({
  args: { batchSize: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args): Promise<any> => {
    let cursor: string | undefined = undefined;
    let cells = 0;
    let inserted = 0;
    let replaced = 0;
    let pages = 0;
    for (;;) {
      const page: any = await ctx.runMutation(internal.seed.rebuildCellBoardsPage, {
        cursor,
        batchSize: args.batchSize,
      });
      cells += page.processed;
      inserted += page.inserted;
      replaced += page.replaced;
      pages += 1;
      if (page.isDone || !page.continueCursor) break;
      cursor = page.continueCursor;
    }
    await ctx.runMutation(internal.seed.setCellsCounter, { count: cells });
    return { cells, inserted, replaced, pages };
  },
});

/** Refresh the small health counters after a bulk import. */
export const refreshCounters = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const [cities, variables, cases, fires, analyses, cells] = await Promise.all([
      ctx.db.query("cities").take(CELL_SCAN_LIMIT),
      ctx.db.query("variables").take(1_000),
      ctx.db.query("cases").take(1_000),
      ctx.db.query("fires").take(100),
      getCounter(ctx, "analyses"),
      getCounter(ctx, "cells"),
    ]);
    await setCounter(ctx, "cities", cities.length);
    await setCounter(ctx, "variables", variables.length);
    await setCounter(ctx, "cases", cases.length);
    await setCounter(ctx, "fires", fires.length);
    return {
      cities: cities.length,
      cells,
      variables: variables.length,
      cases: cases.length,
      fires: fires.length,
      analyses,
    };
  },
});
