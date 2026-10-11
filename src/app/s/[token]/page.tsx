import { Box, GitMerge, GitPullRequest, Tag } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CiStatusBadge } from "@/components/ci-status-badge";
import { ReviewStatusBadge } from "@/components/review-status-badge";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { loadPullRequests } from "@/lib/github/fetch-pull-requests";
import { formatAge, type PullRequest } from "@/lib/github/pull-requests";
import { resolveShareToken } from "@/lib/share/links";

/** Share pages never get indexed, and never leak the token to linked sites via Referer. */
const PRIVATE: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export async function generateMetadata(props: PageProps<"/s/[token]">): Promise<Metadata> {
  const repo = await resolveShareToken((await props.params).token);
  return { ...PRIVATE, title: repo ? `${repo.owner}/${repo.name} · Outpost` : "Not found" };
}

/**
 * Public, read-only view of one repo for a client. No sign-in, no Outpost navigation, no
 * owner controls. Unknown, malformed and revoked tokens all 404.
 */
export default async function SharePage(props: PageProps<"/s/[token]">) {
  const repo = await resolveShareToken((await props.params).token);
  if (!repo) notFound();

  const now = new Date();
  const data = await loadPullRequests(repo).catch(() => null);
  // Links to a private repo would 404 for the client, so titles are plain text there.
  const linkable = data ? !data.meta.isPrivate : false;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-[12px]">
          <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-sm">
            <Box aria-hidden className="size-3" />
          </span>
          Shared via Outpost · read-only
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">
            {repo.owner}/{repo.name}
          </h1>
          {data?.defaultBranch && (
            <span aria-label="Default branch health">
              <CiStatusBadge status={data.defaultBranch.ciStatus} />
            </span>
          )}
          {data?.meta.latestRelease && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-[11px]">
              <Tag aria-hidden className="size-3" />
              Latest release{" "}
              <span className="text-foreground">{data.meta.latestRelease.tagName}</span>
            </span>
          )}
        </div>
      </header>

      {!data ? (
        <p role="alert" className="text-muted-foreground text-[13px]">
          This project&apos;s activity couldn&apos;t be loaded right now. Try again in a few
          minutes.
        </p>
      ) : (
        <>
          <Panel title="Open pull requests" count={data.open.length} meta="most recently updated">
            <ShareList
              label="Open pull requests"
              items={data.open}
              linkable={linkable}
              empty="No open pull requests."
              render={(pr) => (
                <>
                  <ReviewStatusBadge pr={pr} />
                  <CiStatusBadge status={pr.ciStatus} />
                  <span className="text-subtle-foreground w-16 text-right font-mono text-[11px]">
                    {formatAge(pr.updatedAt, now)} ago
                  </span>
                </>
              )}
            />
          </Panel>
          <Panel title="Recently merged" count={data.merged.length} meta="newest first">
            <ShareList
              label="Recently merged"
              items={data.merged}
              linkable={linkable}
              merged
              empty="Nothing merged yet."
              render={(pr) => (
                <span className="text-subtle-foreground w-16 text-right font-mono text-[11px]">
                  {pr.mergedAt ? `${formatAge(pr.mergedAt, now)} ago` : ""}
                </span>
              )}
            />
          </Panel>
        </>
      )}
    </main>
  );
}

function ShareList({
  label,
  items,
  linkable,
  merged = false,
  empty,
  render,
}: {
  label: string;
  items: PullRequest[];
  linkable: boolean;
  merged?: boolean;
  empty: string;
  render: (pr: PullRequest) => React.ReactNode;
}) {
  if (items.length === 0) return <PanelEmpty>{empty}</PanelEmpty>;
  const Icon = merged ? GitMerge : GitPullRequest;
  return (
    <ul aria-label={label} className="divide-y">
      {items.map((pr) => (
        <li
          key={pr.number}
          className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2"
        >
          <Icon
            aria-hidden
            className={
              merged ? "text-primary size-3.5 shrink-0" : "text-muted-foreground size-3.5 shrink-0"
            }
          />
          <span className="min-w-0 flex-1 truncate font-medium">
            {linkable ? (
              <a href={pr.url} target="_blank" rel="noreferrer" className="hover:text-primary">
                {pr.title}
              </a>
            ) : (
              pr.title
            )}
          </span>
          <span className="text-subtle-foreground font-mono text-[11px]">#{pr.number}</span>
          {render(pr)}
        </li>
      ))}
    </ul>
  );
}
