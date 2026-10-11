/**
 * The daily Slack digest: what needs the owner across every repo, in Slack mrkdwn. Built from
 * the same snapshots as My Work and Deployments. Pure, so it's unit-tested.
 */
import type { Deployment } from "@/lib/github/deployments";
import type { Unreleased } from "@/lib/github/deploy-strategy";
import type { MyWork, WorkItem } from "@/lib/my-work";
import { needsMyAction } from "@/lib/my-work";

export type FailedDeploy = { repoName: string; deployment: Deployment };
export type UnreleasedRepo = { repoName: string; unreleased: Unreleased };

export type DigestInput = {
  myWork: MyWork;
  failedProduction: FailedDeploy[];
  unreleased: UnreleasedRepo[];
  /** Outpost's own URL, for the "Open My Work" link. */
  appUrl: string;
};

export type Digest = { text: string; itemCount: number };

/** Items listed per section before "and N more". */
const MAX_PER_SECTION = 5;

/** Slack mrkdwn needs &, < and > escaped in user content. */
export function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function link(url: string, label: string): string {
  return `<${url}|${escapeSlack(label)}>`;
}

function section(title: string, lines: string[]): string[] {
  if (lines.length === 0) return [];
  const shown = lines.slice(0, MAX_PER_SECTION);
  const more = lines.length - shown.length;
  return [
    `*${title} (${lines.length})*`,
    ...shown.map((l) => `• ${l}`),
    ...(more > 0 ? [`• …and ${more} more`] : []),
    "",
  ];
}

const prLine = ({ repoName, pr }: WorkItem) =>
  `${link(pr.url, `${repoName}#${pr.number}`)} ${escapeSlack(pr.title)}`;

export function buildDigest({ myWork, failedProduction, unreleased, appUrl }: DigestInput): Digest {
  const mine = myWork.myPullRequests.filter((item) => needsMyAction(item.pr));
  const sections = [
    ...section("Waiting on your review", myWork.reviewRequests.map(prLine)),
    ...section(
      "Your PRs need you",
      mine.map(
        (item) =>
          `${prLine(item)}: ${item.pr.ciStatus === "failure" ? "CI failing" : "changes requested"}`,
      ),
    ),
    ...section(
      "Failing default branches",
      myWork.failingBranches.map(
        ({ repoName, branch }) =>
          `${link(branch.url, `${repoName}@${branch.name}`)} ${escapeSlack(branch.message)}`,
      ),
    ),
    ...section(
      "Failed production deploys",
      failedProduction.map(({ repoName, deployment }) => {
        const label = `${repoName} → ${deployment.environment}`;
        const url = deployment.logUrl ?? deployment.url;
        return `${url ? link(url, label) : escapeSlack(label)} ${deployment.sha.slice(0, 7)}`;
      }),
    ),
    ...section("Stale for 7+ days", myWork.stale.map(prLine)),
    ...section(
      "Merged but not released",
      unreleased.map(
        ({ repoName, unreleased: u }) =>
          `${link(u.compareUrl, repoName)} ${u.commits} commit${u.commits === 1 ? "" : "s"} since ${escapeSlack(u.sinceTag)}`,
      ),
    ),
  ];

  const itemCount =
    myWork.reviewRequests.length +
    mine.length +
    myWork.failingBranches.length +
    failedProduction.length +
    myWork.stale.length +
    unreleased.length;

  const header = itemCount === 0 ? "*Outpost:* all clear today." : `*Outpost daily digest*`;
  const footer = link(`${appUrl.replace(/\/$/, "")}/my-work`, "Open My Work");
  const text = [header, "", ...sections, footer].join("\n").replace(/\n{3,}/g, "\n\n");
  return { text, itemCount };
}
