import { cn } from "cn";
import { ExternalLink, GitBranch, GitPullRequest, Lock, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth, isOwner } from "@/auth";
import { ActionButton } from "@/components/action-button";
import { CiStatusBadge } from "@/components/ci-status-badge";
import { DeploymentTable } from "@/components/deployment-table";
import { PullRequestTable } from "@/components/pull-request-table";
import { ReleaseCard } from "@/components/release-card";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { ShippingBadge, UnreleasedNote } from "@/components/shipping-badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { WorkflowTable } from "@/components/workflow-table";
import type { Repo } from "@/db/schema";
import { strategyLabel } from "@/lib/github/deploy-strategy";
import { loadShipping } from "@/lib/github/fetch-deploy-strategy";
import { fetchAllDeployments } from "@/lib/github/fetch-deployments";
import { fetchAllReleases } from "@/lib/github/fetch-releases";
import { loadPullRequests } from "@/lib/github/fetch-pull-requests";
import { fetchWorkflows } from "@/lib/github/fetch-workflows";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo } from "@/lib/repos";
import { listShareLinks } from "@/lib/share/links";

import { rerunWorkflowAction } from "../../write-actions";
import { revokeShareLinkAction, setShippingAction } from "./actions";
import { ShareForm } from "./share-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABS = [
  { id: "pulls", label: "Pull Requests" },
  { id: "workflows", label: "Workflows" },
  { id: "deployments", label: "Deployments" },
  { id: "releases", label: "Releases" },
  { id: "share", label: "Share" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export async function generateMetadata(props: PageProps<"/repositories/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  // Metadata renders independently of the page, so gate it too: no repo names for visitors.
  const session = await auth();
  if (!isOwner(session?.user?.login)) return { title: "Outpost" };
  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  return { title: repo ? `${repo.owner}/${repo.name} · Outpost` : "Outpost" };
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="border-warning/20 bg-warning/8 text-warning rounded-sm border px-3 py-2 font-mono text-[11px]"
    >
      {children}
    </div>
  );
}

export default async function RepoPage(props: PageProps<"/repositories/[id]">) {
  const { id } = await props.params;
  await requireOwner(`/repositories/${id}`);
  const params = await props.searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "pulls";

  const repo = UUID.test(id) ? await getConnectedRepo(id) : undefined;
  if (!repo) notFound();

  const now = new Date();
  // A repo can lose App access after it's connected; show that instead of crashing the page.
  const result = await loadPullRequests(repo).then(
    (data) => ({ ok: true as const, ...data }),
    (error: unknown) => ({
      ok: false as const,
      message: String((error as Error)?.message ?? error),
    }),
  );
  const shipping = await loadShipping(repo).catch(() => null);
  const githubUrl = `https://github.com/${repo.owner}/${repo.name}`;

  return (
    <>
      <section
        aria-label="Repository summary"
        className="bg-card flex flex-col gap-3 rounded-lg border p-5"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">
            {repo.owner}/{repo.name}
          </h1>
          {result.ok && result.meta.isPrivate && (
            <span className="bg-panel text-muted-foreground inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
              <Lock aria-hidden className="size-3" />
              Private
            </span>
          )}
          {result.ok && result.meta.primaryLanguage && (
            <span className="border-primary/20 bg-primary/8 text-primary rounded-sm border px-1.5 py-0.5 font-mono text-[11px]">
              {result.meta.primaryLanguage.name}
            </span>
          )}
          {result.ok && result.defaultBranch && (
            <span aria-label="Default branch health">
              <CiStatusBadge status={result.defaultBranch.ciStatus} />
            </span>
          )}
          <a href={githubUrl} className={cn(buttonVariants({ variant: "outline" }), "ml-auto")}>
            <ExternalLink aria-hidden />
            GitHub
          </a>
        </div>
        {result.ok && (
          <dl className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Repository</dt>
              <dd>
                <a href={githubUrl} className="hover:text-foreground">
                  github.com/{repo.owner}/{repo.name}
                </a>
              </dd>
            </div>
            {result.meta.latestRelease && (
              <div className="flex items-center gap-1.5">
                <Tag aria-hidden className="size-3" />
                <dt>Latest release:</dt>
                <dd className="text-foreground">{result.meta.latestRelease.tagName}</dd>
              </div>
            )}
            {result.defaultBranch && (
              <div className="flex items-center gap-1.5">
                <GitBranch aria-hidden className="size-3" />
                <dt>Default branch:</dt>
                <dd className="text-primary">{result.defaultBranch.name}</dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <GitPullRequest aria-hidden className="size-3" />
              <dt className="sr-only">Open pull requests</dt>
              <dd>{result.open.length} open PRs</dd>
            </div>
          </dl>
        )}
        {shipping && (
          <div
            aria-label="How this repo ships"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3"
          >
            <span className="text-subtle-foreground font-mono text-[11px] uppercase">
              Ships via
            </span>
            <ShippingBadge shipping={shipping} />
            <span className="text-muted-foreground text-[13px]">{shipping.reason}</span>
            <UnreleasedNote shipping={shipping} />
            <form action={setShippingAction} className="ml-auto flex items-center gap-2">
              <input type="hidden" name="repoId" value={repo.id} />
              <select
                name="strategy"
                aria-label="Deploy strategy"
                defaultValue={repo.deployStrategy ?? "auto"}
                className="bg-background focus:border-primary h-7 rounded-sm border px-2 font-mono text-[11px] outline-none"
              >
                <option value="auto">
                  Auto-detect ({strategyLabel(shipping.detected.strategy, shipping.defaultBranch)})
                </option>
                <option value="merge">{strategyLabel("merge", shipping.defaultBranch)}</option>
                <option value="tag">Release tag</option>
                <option value="manual">Manual</option>
              </select>
              <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Save
              </button>
            </form>
          </div>
        )}
      </section>

      <nav
        aria-label="Repository sections"
        className="-mb-2 flex [scrollbar-width:none] gap-5 overflow-x-auto border-b"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={
              t.id === "pulls" ? `/repositories/${repo.id}` : `/repositories/${repo.id}?tab=${t.id}`
            }
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 pb-2.5 text-sm whitespace-nowrap transition-colors",
              tab === t.id
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
            {t.id === "pulls" && result.ok && (
              <span className="bg-panel ml-1.5 rounded-sm px-1 font-mono text-[10px]">
                {result.open.length}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "pulls" && (
        <>
          {!result.ok && (
            <Alert>
              Couldn&apos;t load pull requests from GitHub. Check the GitHub App still has access to
              this repo.
            </Alert>
          )}
          <Panel
            title="Open pull requests"
            count={result.ok ? result.open.length : 0}
            meta="most recently updated"
          >
            <PullRequestTable
              pullRequests={result.ok ? result.open : []}
              dateField="updatedAt"
              dateLabel="Updated"
              emptyMessage="No open pull requests."
            />
          </Panel>
          <Panel
            title="Recently merged"
            count={result.ok ? result.merged.length : 0}
            meta="newest merge first"
          >
            <PullRequestTable
              pullRequests={result.ok ? result.merged : []}
              dateField="mergedAt"
              dateLabel="Merged"
              emptyMessage="Nothing merged yet."
            />
          </Panel>
        </>
      )}
      {tab === "workflows" && <WorkflowsTab repo={repo} now={now} />}
      {tab === "deployments" && <DeploymentsTab repo={repo} now={now} />}
      {tab === "releases" && <ReleasesTab repo={repo} />}
      {tab === "share" && <ShareTab repo={repo} />}
    </>
  );
}

async function WorkflowsTab({ repo, now }: { repo: Repo; now: Date }) {
  const result = await fetchWorkflows(repo);
  if (!result.ok) {
    return (
      <Alert>
        {result.permissionMissing
          ? 'Can\'t read GitHub Actions runs. In your GitHub App settings, set Repository permissions → Actions to "Read-only", then accept the new permission on the installation.'
          : "Couldn't load workflow runs from GitHub."}
      </Alert>
    );
  }
  return (
    <Panel title="Workflows & runs" count={result.workflows.length} meta="last 100 runs">
      {result.workflows.length === 0 ? (
        <PanelEmpty>No GitHub Actions runs yet.</PanelEmpty>
      ) : (
        <WorkflowTable
          workflows={result.workflows}
          now={now}
          rowAction={(w) =>
            w.latest.state === "failure" && (
              <ActionButton
                action={rerunWorkflowAction}
                fields={{ repoId: repo.id, runId: w.latest.id }}
                label="Re-run failed jobs"
                pendingLabel="Starting…"
                ariaLabel={`Re-run failed jobs of ${w.name}`}
              />
            )
          }
        />
      )}
    </Panel>
  );
}

async function DeploymentsTab({ repo, now }: { repo: Repo; now: Date }) {
  const { results, errors, permissionMissing } = await fetchAllDeployments([repo]);
  if (errors.length > 0) {
    return (
      <Alert>
        {permissionMissing
          ? 'Can\'t read deployments. In your GitHub App settings, set Repository permissions → Deployments to "Read-only", then accept the new permission on the installation.'
          : "Couldn't load deployments from GitHub."}
      </Alert>
    );
  }
  const rows = (results[0]?.deployments ?? []).map((deployment) => ({
    repoId: repo.id,
    repoName: repo.name,
    deployment,
  }));
  return (
    <Panel title="Deployments" count={rows.length} meta="newest first">
      {rows.length === 0 ? (
        <PanelEmpty>No deployments reported for this repo.</PanelEmpty>
      ) : (
        <DeploymentTable rows={rows} now={now} />
      )}
    </Panel>
  );
}

async function ReleasesTab({ repo }: { repo: Repo }) {
  const { items, errors } = await fetchAllReleases([repo]);
  if (errors.length > 0) return <Alert>Couldn&apos;t load releases from GitHub.</Alert>;
  if (items.length === 0)
    return <p className="text-muted-foreground text-[13px]">No releases yet.</p>;
  return (
    <ol aria-label="Release timeline" className="relative flex flex-col gap-4 border-l pl-6">
      {items.map((item) => (
        <ReleaseCard key={item.release.id} item={item} />
      ))}
    </ol>
  );
}

async function ShareTab({ repo }: { repo: Repo }) {
  const links = await listShareLinks(repo.id);
  const active = links.filter((l) => !l.revokedAt);
  return (
    <Panel title="Share links" count={active.length} meta="read-only, no sign-in">
      <p className="text-muted-foreground border-b px-4 py-3 text-[13px]">
        Anyone with a link sees this repo&apos;s open PRs, recent merges, CI health and latest
        release. Nothing else in Outpost. Revoke a link to turn it off right away.
      </p>
      <ShareForm repoId={repo.id} />
      {links.length === 0 ? (
        <PanelEmpty>No share links yet.</PanelEmpty>
      ) : (
        <ul aria-label="Share links" className="divide-y border-t">
          {links.map((link) => (
            <li key={link.id} className="flex h-10 items-center gap-3 px-4">
              <span className="text-[13px]">{link.label ?? "Untitled link"}</span>
              <span className="text-subtle-foreground font-mono text-[11px]">
                created {link.createdAt.toISOString().slice(0, 10)}
              </span>
              <span className="ml-auto">
                {link.revokedAt ? (
                  <StatusBadge tone="neutral" label="Revoked" />
                ) : (
                  <form action={revokeShareLinkAction}>
                    <input type="hidden" name="repoId" value={repo.id} />
                    <input type="hidden" name="id" value={link.id} />
                    <button
                      type="submit"
                      aria-label={`Revoke ${link.label ?? "untitled link"}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Revoke
                    </button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
