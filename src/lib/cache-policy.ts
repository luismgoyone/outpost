/** Cache freshness rules. Pure, so they're unit-tested apart from the database. */

export const CACHE_TTL_MS = 5 * 60 * 1000;

export type CacheKey = "pulls" | "deployments" | "releases" | "workflows" | "shipping";

/**
 * A stale copy younger than this is served at once and refreshed after the response, so the
 * first view after the TTL isn't the slow one. Older copies are refetched before rendering.
 */
export const SERVE_STALE_FOR_MS = 60 * 60 * 1000;

export type CacheState = "fresh" | "stale" | "expired";

export function cacheState(fetchedAt: Date, now: Date): CacheState {
  if (isFresh(fetchedAt, now)) return "fresh";
  if (isFresh(fetchedAt, now, SERVE_STALE_FOR_MS)) return "stale";
  return "expired";
}

export function isFresh(fetchedAt: Date, now: Date, ttlMs = CACHE_TTL_MS): boolean {
  return now.getTime() - fetchedAt.getTime() < ttlMs;
}

/** "just now", "4m ago", "2h ago", "3d ago" for the header sync indicator. */
export function syncedLabel(fetchedAt: Date | null, now: Date): string {
  if (!fetchedAt) return "Not synced yet";
  const minutes = Math.floor((now.getTime() - fetchedAt.getTime()) / 60_000);
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  return `Synced ${Math.floor(hours / 24)}d ago`;
}
