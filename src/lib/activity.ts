import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { activityLog, type ActivityRow } from "@/db/schema";

export type ActivityKind = "error" | "webhook";

/** Rows kept per kind. Older ones are deleted on insert. */
const KEEP = 200;

/**
 * Append to the activity log. Never throws: logging must not turn one failure into two
 * (it also runs inside onRequestError, where the database may be the thing that's down).
 */
export async function recordActivity(
  kind: ActivityKind,
  summary: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(activityLog).values({ kind, summary: summary.slice(0, 500), detail });
    const [cutoff] = await db
      .select({ createdAt: activityLog.createdAt })
      .from(activityLog)
      .where(eq(activityLog.kind, kind))
      .orderBy(desc(activityLog.createdAt))
      .offset(KEEP - 1)
      .limit(1);
    if (cutoff) {
      await db
        .delete(activityLog)
        .where(and(eq(activityLog.kind, kind), lt(activityLog.createdAt, cutoff.createdAt)));
    }
  } catch (error) {
    console.error("Could not record activity", error);
  }
}

export async function listActivity(kind: ActivityKind, limit = 20): Promise<ActivityRow[]> {
  return getDb()
    .select()
    .from(activityLog)
    .where(eq(activityLog.kind, kind))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
