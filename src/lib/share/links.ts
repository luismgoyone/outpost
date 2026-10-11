import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { repos, shareLinks, type Repo } from "@/db/schema";

import { generateShareToken, hashShareToken, isWellFormedShareToken } from "./token";

export type ShareLink = typeof shareLinks.$inferSelect;

/** Create a link and return its token. The token is never stored, so show it once. */
export async function createShareLink(repoId: string, label: string | null) {
  const token = generateShareToken();
  const [link] = await getDb()
    .insert(shareLinks)
    .values({ repoId, tokenHash: hashShareToken(token), label })
    .returning();
  return { link, token };
}

/** A repo's links, newest first, revoked ones included (shown as revoked). */
export async function listShareLinks(repoId: string): Promise<ShareLink[]> {
  return getDb()
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.repoId, repoId))
    .orderBy(desc(shareLinks.createdAt));
}

export async function revokeShareLink(repoId: string, id: string): Promise<void> {
  await getDb()
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(shareLinks.id, id), eq(shareLinks.repoId, repoId), isNull(shareLinks.revokedAt)));
}

/**
 * The repo behind a presented token, or undefined for malformed, unknown and revoked tokens
 * alike (callers answer all three with the same 404). Lookup is by hash, so the database never
 * sees the token itself.
 */
export async function resolveShareToken(token: string): Promise<Repo | undefined> {
  if (!isWellFormedShareToken(token)) return undefined;
  const [row] = await getDb()
    .select({ repo: repos })
    .from(shareLinks)
    .innerJoin(repos, eq(repos.id, shareLinks.repoId))
    .where(and(eq(shareLinks.tokenHash, hashShareToken(token)), isNull(shareLinks.revokedAt)))
    .limit(1);
  return row?.repo;
}
