import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { DisconnectButton } from "@/components/disconnect-button";
import { PageHeader } from "@/components/shell/page-header";
import { Panel, PanelEmpty } from "@/components/shell/panel";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { listActivity } from "@/lib/activity";
import { cacheSummary } from "@/lib/cache";
import { CACHE_TTL_MS, syncedLabel } from "@/lib/cache-policy";
import { getInstallUrl } from "@/lib/github/app";
import { listInstallations, type InstallationSummary } from "@/lib/github/installations";
import { checkPermissions } from "@/lib/github/permissions";
import { formatAge } from "@/lib/github/pull-requests";
import { requireOwner } from "@/lib/owner";
import { listConnectedRepos } from "@/lib/repos";

import { disconnectRepoAction } from "../repositories/actions";

export const metadata: Metadata = { title: "Settings · Outpost" };

const README_WEBHOOK = "https://github.com/luismgoyone/Outpost#live-updates-optional";

export default async function SettingsPage() {
  await requireOwner("/settings");
  const now = new Date();
  const [installations, repos, deliveries, errors, cache, requestHeaders] = await Promise.all([
    listInstallations().then(
      (list) => ({ ok: true as const, list }),
      (error: unknown) => ({ ok: false as const, message: String((error as Error)?.message) }),
    ),
    listConnectedRepos(),
    listActivity("webhook", 5),
    listActivity("error", 20),
    cacheSummary(),
    headers(),
  ]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${proto}://${host}/api/github/webhook`;
  const webhookConfigured = !!process.env.GITHUB_WEBHOOK_SECRET;
  const ago = (date: Date) =>
    now.getTime() - date.getTime() < 60_000
      ? "just now"
      : `${formatAge(date.toISOString(), now)} ago`;

  return (
    <>
      <PageHeader
        title="Settings"
        description="The GitHub App's access, live updates, connected repositories and server health."
      />

      <Panel
        title="GitHub App"
        count={installations.ok ? installations.list.length : undefined}
        meta="installations"
      >
        {!installations.ok ? (
          <p role="alert" className="text-destructive px-4 py-4 font-mono text-[12px]">
            Couldn&apos;t reach GitHub: {installations.message}
          </p>
        ) : installations.list.length === 0 ? (
          <PanelEmpty>The App isn&apos;t installed anywhere yet.</PanelEmpty>
        ) : (
          <ul aria-label="Installations" className="divide-y">
            {installations.list.map((installation) => (
              <Installation key={installation.id} installation={installation} />
            ))}
          </ul>
        )}
        <div className="flex border-t px-4 py-3">
          <a href={getInstallUrl()} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink aria-hidden />
            Install on more repos
          </a>
        </div>
      </Panel>

      <Panel
        title="Live updates"
        meta={
          <StatusBadge
            tone={webhookConfigured ? "success" : "warning"}
            label={webhookConfigured ? "Webhook on" : "Webhook off"}
          />
        }
      >
        <div className="flex flex-col gap-3 px-4 py-4 text-[13px]">
          <p className="text-muted-foreground">
            {webhookConfigured
              ? "GitHub tells Outpost when a PR, review, CI run, deployment or release changes, and that repo's data refreshes on the next view."
              : `Without the webhook, data refreshes every ${CACHE_TTL_MS / 60_000} minutes or when you press Sync.`}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[12px]">
            <dt className="text-subtle-foreground">Payload URL</dt>
            <dd className="break-all">{webhookUrl}</dd>
            <dt className="text-subtle-foreground">Secret</dt>
            <dd>{webhookConfigured ? "GITHUB_WEBHOOK_SECRET is set" : "not set"}</dd>
            <dt className="text-subtle-foreground">Last delivery</dt>
            <dd>{deliveries[0] ? ago(deliveries[0].createdAt) : "none received"}</dd>
          </dl>
          {deliveries.length > 0 && (
            <ul aria-label="Recent deliveries" className="flex flex-col gap-0.5">
              {deliveries.map((d) => (
                <li key={d.id} className="text-muted-foreground flex gap-3 font-mono text-[11px]">
                  <span className="text-subtle-foreground w-14 shrink-0">{ago(d.createdAt)}</span>
                  {d.summary}
                </li>
              ))}
            </ul>
          )}
          {!webhookConfigured && (
            <a href={README_WEBHOOK} className="text-primary w-fit text-[12px] hover:underline">
              How to turn it on
            </a>
          )}
        </div>
      </Panel>

      <Panel title="Connected repositories" count={repos.length}>
        {repos.length === 0 ? (
          <PanelEmpty>No repositories connected.</PanelEmpty>
        ) : (
          <ul aria-label="Settings repositories" className="divide-y">
            {repos.map((repo) => (
              <li key={repo.id} className="flex h-10 items-center gap-3 px-4">
                <span className="font-mono text-[12px]">
                  {repo.owner}/{repo.name}
                </span>
                <span className="text-subtle-foreground font-mono text-[11px] max-sm:hidden">
                  since {repo.createdAt.toISOString().slice(0, 10)}
                </span>
                <span className="ml-auto">
                  <DisconnectButton
                    id={repo.id}
                    fullName={`${repo.owner}/${repo.name}`}
                    action={disconnectRepoAction}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Data" meta={`${CACHE_TTL_MS / 60_000}-minute cache`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 py-4 font-mono text-[12px]">
          <dt className="text-subtle-foreground">Cached snapshots</dt>
          <dd>{cache.rows}</dd>
          <dt className="text-subtle-foreground">Oldest</dt>
          <dd>{syncedLabel(cache.oldest, now)}</dd>
        </dl>
      </Panel>

      <Panel title="Server errors" count={errors.length} meta="newest first">
        {errors.length === 0 ? (
          <PanelEmpty>No server errors recorded.</PanelEmpty>
        ) : (
          <ul aria-label="Server errors" className="divide-y">
            {errors.map((e) => {
              const detail = (e.detail ?? {}) as { path?: string; digest?: string };
              return (
                <li key={e.id} className="flex flex-col gap-0.5 px-4 py-2">
                  <div className="text-subtle-foreground flex gap-3 font-mono text-[11px]">
                    <span>{ago(e.createdAt)}</span>
                    {detail.path && <span className="text-muted-foreground">{detail.path}</span>}
                    {detail.digest && <span className="ml-auto">ref {detail.digest}</span>}
                  </div>
                  <p className="text-destructive font-mono text-[12px] break-words">{e.summary}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Installation({ installation }: { installation: InstallationSummary }) {
  const checks = checkPermissions(installation.permissions);
  const missing = checks.filter((c) => !c.granted);
  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[13px] font-medium">{installation.account}</span>
        <span className="text-subtle-foreground font-mono text-[11px]">
          {installation.accountType} ·{" "}
          {installation.repositorySelection === "all"
            ? "all repositories"
            : "selected repositories"}
        </span>
        <StatusBadge
          boxed
          tone={missing.length === 0 ? "success" : "warning"}
          label={missing.length === 0 ? "All permissions granted" : `${missing.length} missing`}
        />
        {installation.settingsUrl && (
          <a
            href={installation.settingsUrl}
            className="text-subtle-foreground hover:text-foreground ml-auto inline-flex items-center gap-1 font-mono text-[11px]"
          >
            Configure on GitHub
            <ExternalLink aria-hidden className="size-3" />
          </a>
        )}
      </div>
      <ul
        aria-label={`Permissions for ${installation.account}`}
        className="grid gap-x-6 gap-y-1 @min-[40rem]:grid-cols-2"
      >
        {checks.map((c) => (
          <li key={c.name} className="flex items-center gap-3 text-[12px]">
            <StatusBadge
              tone={c.granted ? "success" : "warning"}
              label={c.granted ?? "missing"}
              className="w-16"
            />
            <span>{c.label}</span>
            <span className="text-subtle-foreground truncate text-[11px]">{c.usedFor}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
