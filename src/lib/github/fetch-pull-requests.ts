import "server-only";

import type { Repo } from "@/db/schema";
import { cached } from "@/lib/cache";
import type { RepoRef } from "@/lib/repos";

import { getInstallationOctokit } from "./app";
import {
  mapPullRequests,
  OPEN_PULL_REQUESTS_PAGE_QUERY,
  PULL_REQUESTS_QUERY,
  type OpenPullRequestsPageResult,
  type PullRequestsQueryResult,
  type RepoPullRequests,
} from "./pull-requests";

/** GitHub's per-page maximum. */
const PAGE_SIZE = 100;
/** Safety stop: 1,000 open PRs is far past what a dashboard row can show. */
const MAX_OPEN_PAGES = 10;

/** Every open PR (paged), the 20 most recently merged, and repo health. */
export async function fetchPullRequests(repo: RepoRef): Promise<RepoPullRequests> {
  const octokit = await getInstallationOctokit(repo.installationId);
  const vars = { owner: repo.owner, name: repo.name };
  const result = await octokit.graphql<PullRequestsQueryResult>(PULL_REQUESTS_QUERY, {
    ...vars,
    openCount: PAGE_SIZE,
    mergedCount: 20,
  });

  const open = result.repository?.open;
  let pageInfo = open?.pageInfo;
  for (let page = 1; open && pageInfo?.hasNextPage && pageInfo.endCursor; page++) {
    if (page >= MAX_OPEN_PAGES) break;
    const next = await octokit.graphql<OpenPullRequestsPageResult>(OPEN_PULL_REQUESTS_PAGE_QUERY, {
      ...vars,
      count: PAGE_SIZE,
      after: pageInfo.endCursor,
    });
    open.nodes = [...(open.nodes ?? []), ...(next.repository?.open.nodes ?? [])];
    pageInfo = next.repository?.open.pageInfo;
  }
  return mapPullRequests(result);
}

/** Cached read of a connected repo's pull requests (see src/lib/cache.ts). */
export async function loadPullRequests(repo: Repo): Promise<RepoPullRequests> {
  return cached(repo, "pulls", () => fetchPullRequests(repo));
}
