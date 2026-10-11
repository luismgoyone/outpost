import type { Instrumentation } from "next";

/**
 * Server errors (pages, route handlers, server actions, proxy) go to the activity log, which
 * Settings shows. The digest matches the "ref" on the error screen and the Vercel logs.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { recordActivity } = await import("@/lib/activity");
  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;
  await recordActivity("error", message, {
    digest,
    // Path only: query strings can carry filters but never secrets here; headers are skipped.
    path: request.path.split("?")[0],
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
