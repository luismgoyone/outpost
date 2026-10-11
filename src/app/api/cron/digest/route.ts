import { isCronAuthorized } from "@/lib/cron-auth";
import { buildDigest, type FailedDeploy, type UnreleasedRepo } from "@/lib/digest";
import { latestPerEnvironment } from "@/lib/github/deployments";
import { fetchAllPullRequests } from "@/lib/github/fetch-all-pull-requests";
import { loadAllShipping } from "@/lib/github/fetch-deploy-strategy";
import { fetchAllDeployments } from "@/lib/github/fetch-deployments";
import { buildMyWork } from "@/lib/my-work";
import { listConnectedRepos } from "@/lib/repos";
import { postToSlack } from "@/lib/slack/post";

/**
 * Daily Slack digest (vercel.json cron). Needs CRON_SECRET and SLACK_WEBHOOK_URL.
 * `?dry=1` returns the message without posting it.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl && !dryRun) {
    return Response.json({ error: "SLACK_WEBHOOK_URL is not set" }, { status: 503 });
  }

  const repos = await listConnectedRepos();
  const [pulls, deployments, shipping] = await Promise.all([
    fetchAllPullRequests(repos),
    fetchAllDeployments(repos),
    loadAllShipping(repos),
  ]);

  const myWork = buildMyWork(
    pulls.results.map((r) => ({
      repoId: r.repo.id,
      repoName: r.repo.name,
      open: r.open,
      defaultBranch: r.defaultBranch,
    })),
    process.env.OWNER_GITHUB_LOGIN,
    new Date(),
  );
  const failedProduction: FailedDeploy[] = deployments.results.flatMap(({ repo, deployments }) =>
    latestPerEnvironment(deployments)
      .filter((d) => d.environmentKind === "production" && d.state === "failure")
      .map((deployment) => ({ repoName: repo.name, deployment })),
  );
  const unreleased: UnreleasedRepo[] = repos.flatMap((repo) => {
    const s = shipping.get(repo.id);
    return s?.strategy === "tag" && s.unreleased && s.unreleased.commits > 0
      ? [{ repoName: repo.name, unreleased: s.unreleased }]
      : [];
  });

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const appUrl = productionHost ? `https://${productionHost}` : new URL(request.url).origin;
  const digest = buildDigest({ myWork, failedProduction, unreleased, appUrl });

  if (dryRun) return Response.json({ sent: false, ...digest });
  await postToSlack(webhookUrl!, digest.text);
  return Response.json({ sent: true, itemCount: digest.itemCount });
}
