"use server";

import { revalidatePath } from "next/cache";

import { invalidate } from "@/lib/cache";
import { fetchAllDeployments } from "@/lib/github/fetch-deployments";
import { loadPullRequests } from "@/lib/github/fetch-pull-requests";
import { fetchWorkflows } from "@/lib/github/fetch-workflows";
import { commentOnPullRequest, rerunFailedJobs } from "@/lib/github/write";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo } from "@/lib/repos";
import { redeploy } from "@/lib/vercel/redeploy";
import {
  explainWriteError,
  nudgeComment,
  parseVercelLogUrl,
  type ActionResult,
} from "@/lib/write-actions";

/*
 * Write actions. Each one re-reads its target from the owner's own cached data (never from
 * the form beyond IDs), so a crafted request can only act on what the dashboard shows.
 */

async function repoFrom(formData: FormData) {
  const repo = await getConnectedRepo(String(formData.get("repoId") ?? ""));
  if (!repo) throw new Error("Unknown repository");
  return repo;
}

async function refreshed(repoId: string) {
  await invalidate([repoId]);
  revalidatePath("/", "layout");
}

/** Re-run the failed jobs of a workflow's latest run. */
export async function rerunWorkflowAction(_: ActionResult, formData: FormData) {
  await requireOwner();
  const repo = await repoFrom(formData);
  const runId = Number(formData.get("runId"));
  const workflows = await fetchWorkflows(repo);
  const run = workflows.ok
    ? workflows.workflows.find((w) => w.latest.id === runId && w.latest.state === "failure")
    : undefined;
  if (!run) return { ok: false, message: "That run isn't a failed latest run anymore." };
  try {
    await rerunFailedJobs(repo, runId);
  } catch (error) {
    return { ok: false, message: explainWriteError(error, "Actions") };
  }
  await refreshed(repo.id);
  return { ok: true, message: "Re-run started" };
}

/** Comment on one of the owner's PRs, mentioning its pending reviewers. */
export async function nudgeReviewersAction(_: ActionResult, formData: FormData) {
  await requireOwner();
  const repo = await repoFrom(formData);
  const number = Number(formData.get("number"));
  const pr = (await loadPullRequests(repo)).open.find((p) => p.number === number);
  if (!pr || pr.requestedReviewers.length === 0) {
    return { ok: false, message: "No pending reviewers on that PR." };
  }
  try {
    await commentOnPullRequest(repo, number, nudgeComment(pr.requestedReviewers));
  } catch (error) {
    return { ok: false, message: explainWriteError(error, "Pull requests") };
  }
  return { ok: true, message: `Nudged ${pr.requestedReviewers.length}` };
}

/** Redeploy a failed Vercel production deployment. */
export async function redeployAction(_: ActionResult, formData: FormData) {
  await requireOwner();
  const repo = await repoFrom(formData);
  if (!process.env.VERCEL_TOKEN) return { ok: false, message: "Set VERCEL_TOKEN to redeploy." };
  const deploymentId = String(formData.get("deploymentId") ?? "");
  const { results } = await fetchAllDeployments([repo]);
  const deployment = results[0]?.deployments.find((d) => d.id === deploymentId);
  const target = deployment ? parseVercelLogUrl(deployment.logUrl) : null;
  if (!deployment || !target) {
    return { ok: false, message: "That deployment can't be redeployed from Outpost." };
  }
  try {
    await redeploy(target);
  } catch (error) {
    return { ok: false, message: String((error as Error)?.message ?? error) };
  }
  await refreshed(repo.id);
  return { ok: true, message: "Redeploy started" };
}
