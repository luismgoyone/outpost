import "server-only";

import { and, count, eq, inArray, min } from "drizzle-orm";
import { after } from "next/server";

import { getDb } from "@/db";
import { statsCache, type Repo } from "@/db/schema";

import { cacheState, type CacheKey } from "./cache-policy";

/**
 * Read-through cache for GitHub data, stored in Postgres so it's shared by every server
 * instance. Fresh rows are served as-is. Stale rows (under an hour old) are served too, and
 * refetched after the response. Missing or older rows are refetched first. If GitHub fails
 * and an older copy exists, the older copy is served instead of an error.
 */
export async function cached<T>(repo: Repo, key: CacheKey, load: () => Promise<T>): Promise<T> {
  const [row] = await getDb()
    .select()
    .from(statsCache)
    .where(and(eq(statsCache.repoId, repo.id), eq(statsCache.key, key)))
    .limit(1);

  const state = row ? cacheState(row.fetchedAt, new Date()) : "expired";
  if (row && state === "fresh") return row.data as T;
  if (row && state === "stale") {
    refreshAfterResponse(repo, key, load);
    return row.data as T;
  }

  try {
    return await refresh(repo, key, load);
  } catch (error) {
    if (row) return row.data as T;
    throw error;
  }
}

async function refresh<T>(repo: Repo, key: CacheKey, load: () => Promise<T>): Promise<T> {
  const data = await load();
  await getDb()
    .insert(statsCache)
    .values({ repoId: repo.id, key, data: data as object, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [statsCache.repoId, statsCache.key],
      set: { data: data as object, fetchedAt: new Date() },
    });
  return data;
}

/** Background refreshes in flight in this instance, so ten views don't start ten fetches. */
const refreshing = new Set<string>();

function refreshAfterResponse<T>(repo: Repo, key: CacheKey, load: () => Promise<T>): void {
  const id = `${repo.id}:${key}`;
  if (refreshing.has(id)) return;
  refreshing.add(id);
  after(() =>
    refresh(repo, key, load)
      // The stale copy stays in place; the next view tries again.
      .catch((error) => console.error(`Background refresh failed for ${id}`, error))
      .finally(() => refreshing.delete(id)),
  );
}

/** Every cached payload of one kind, fresh or not. For cheap summaries like sidebar badges. */
export async function readAllCached<T>(key: CacheKey): Promise<Array<{ repoId: string; data: T }>> {
  const rows = await getDb()
    .select({ repoId: statsCache.repoId, data: statsCache.data })
    .from(statsCache)
    .where(eq(statsCache.key, key));
  return rows.map((r) => ({ repoId: r.repoId, data: r.data as T }));
}

/** The oldest "pulls" snapshot: how stale the dashboard could be at worst. */
export async function oldestSync(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ oldest: min(statsCache.fetchedAt) })
    .from(statsCache)
    .where(eq(statsCache.key, "pulls"));
  return row?.oldest ?? null;
}

/** Drop cached data so the next read refetches. All repos when `repoIds` is omitted. */
export async function invalidate(repoIds?: string[]): Promise<void> {
  const db = getDb();
  if (repoIds === undefined) await db.delete(statsCache);
  else if (repoIds.length > 0)
    await db.delete(statsCache).where(inArray(statsCache.repoId, repoIds));
}

/** How much is cached and how old it is, for Settings. */
export async function cacheSummary(): Promise<{ rows: number; oldest: Date | null }> {
  const [row] = await getDb()
    .select({ rows: count(), oldest: min(statsCache.fetchedAt) })
    .from(statsCache);
  return { rows: row?.rows ?? 0, oldest: row?.oldest ?? null };
}
