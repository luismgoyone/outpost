import "server-only";

import type { Repo } from "@/db/schema";

import { getInstallationOctokit } from "./app";

/** Re-run only the failed jobs of a workflow run. Needs Actions: write. */
export async function rerunFailedJobs(repo: Repo, runId: number): Promise<void> {
  const octokit = await getInstallationOctokit(repo.installationId);
  await octokit.rest.actions.reRunWorkflowFailedJobs({
    owner: repo.owner,
    repo: repo.name,
    run_id: runId,
  });
}

/** Comment on a PR. Needs Pull requests: write. Posted as the App's bot account. */
export async function commentOnPullRequest(repo: Repo, number: number, body: string) {
  const octokit = await getInstallationOctokit(repo.installationId);
  await octokit.rest.issues.createComment({
    owner: repo.owner,
    repo: repo.name,
    issue_number: number,
    body,
  });
}
