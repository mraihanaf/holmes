/**
 * Tiny counters so `system.health` can report table sizes without scanning
 * full documents. The counters table has one row per counted table.
 */

import type { MutationCtx } from "../_generated/server";

export type CounterKey = "cities" | "cells" | "variables" | "cases" | "fires" | "analyses";

export async function getCounter(ctx: MutationCtx, key: CounterKey): Promise<number> {
  const doc = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return doc?.count ?? 0;
}

export async function setCounter(ctx: MutationCtx, key: CounterKey, count: number): Promise<void> {
  const value = Math.max(0, Math.floor(count));
  const doc = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (doc) {
    await ctx.db.patch(doc._id, { count: value });
  } else {
    await ctx.db.insert("counters", { key, count: value });
  }
}

export async function bumpCounter(ctx: MutationCtx, key: CounterKey, delta: number): Promise<void> {
  const current = await getCounter(ctx, key);
  await setCounter(ctx, key, current + delta);
}
