import { describe, expect, it } from "vitest";

import { buildDigest, escapeSlack } from "@/lib/digest";
import type { Deployment } from "@/lib/github/deployments";
import type { PullRequest } from "@/lib/github/pull-requests";
import type { MyWork } from "@/lib/my-work";

const pr = (number: number, extra: Partial<PullRequest> = {}): PullRequest => ({
  number,
  title: `PR ${number}`,
  url: `https://github.com/acme/web/pull/${number}`,
  author: { login: "dev", avatarUrl: "" },
  isDraft: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  mergedAt: null,
  ciStatus: "success",
  reviewState: "awaiting_review",
  approvals: 0,
  requestedReviewers: [],
  headRefName: "feat",
  additions: 1,
  deletions: 1,
  ...extra,
});

const empty: MyWork = {
  reviewRequests: [],
  myPullRequests: [],
  stale: [],
  failingBranches: [],
  attentionCount: 0,
};

describe("buildDigest", () => {
  it("says all clear when nothing needs attention", () => {
    const digest = buildDigest({
      myWork: empty,
      failedProduction: [],
      unreleased: [],
      appUrl: "https://outpost.example/",
    });
    expect(digest.itemCount).toBe(0);
    expect(digest.text).toContain("all clear");
    expect(digest.text).toContain("<https://outpost.example/my-work|Open My Work>");
  });

  it("lists each section with links, capped at five per section", () => {
    const reviews = Array.from({ length: 7 }, (_, i) => ({
      repoId: "r",
      repoName: "web",
      pr: pr(i + 1),
    }));
    const digest = buildDigest({
      myWork: {
        ...empty,
        reviewRequests: reviews,
        myPullRequests: [
          { repoId: "r", repoName: "web", pr: pr(20, { ciStatus: "failure" }) },
          { repoId: "r", repoName: "web", pr: pr(21) }, // fine, not listed
        ],
      },
      failedProduction: [
        {
          repoName: "api",
          deployment: {
            environment: "production",
            sha: "abcdef1234",
            logUrl: "https://vercel.example/log",
            url: null,
          } as Deployment,
        },
      ],
      unreleased: [
        {
          repoName: "lib",
          unreleased: {
            sinceTag: "v1.2.0",
            commits: 3,
            pullRequests: [],
            compareUrl: "https://github.com/acme/lib/compare/v1.2.0...main",
          },
        },
      ],
      appUrl: "https://outpost.example",
    });

    expect(digest.itemCount).toBe(7 + 1 + 1 + 1);
    expect(digest.text).toContain("*Waiting on your review (7)*");
    expect(digest.text).toContain("<https://github.com/acme/web/pull/1|web#1> PR 1");
    expect(digest.text).not.toContain("web#6>");
    expect(digest.text).toContain("…and 2 more");
    expect(digest.text).toContain("*Your PRs need you (1)*");
    expect(digest.text).toContain("web#20> PR 20: CI failing");
    expect(digest.text).toContain("<https://vercel.example/log|api → production> abcdef1");
    expect(digest.text).toContain("3 commits since v1.2.0");
  });

  it("escapes Slack control characters in titles", () => {
    expect(escapeSlack("a <b> & c")).toBe("a &lt;b&gt; &amp; c");
  });
});
