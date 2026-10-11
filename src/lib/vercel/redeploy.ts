import "server-only";

import { vercelFetch } from "./client";

/**
 * Redeploy a Vercel deployment to production (the dashboard's "Redeploy"). Needs VERCEL_TOKEN
 * with access to the project's team.
 */
export async function redeploy(target: {
  team: string;
  project: string;
  deploymentId: string;
}): Promise<{ url: string }> {
  const { team, project, deploymentId } = target;
  return vercelFetch<{ url: string }>(
    "/v13/deployments",
    // VERCEL_TEAM_ID wins when set; otherwise the team slug from the log URL scopes the call.
    process.env.VERCEL_TEAM_ID ? { forceNew: "1" } : { forceNew: "1", slug: team },
    { method: "POST", body: { name: project, deploymentId, target: "production" } },
  );
}
