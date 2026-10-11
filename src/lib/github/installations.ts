import "server-only";

import type { RepoRef } from "@/lib/repos";

import { getGitHubApp } from "./app";

export type InstallableRepo = RepoRef & { fullName: string; isPrivate: boolean };

/** Every repo the App can currently see, across all of its installations. */
export async function listInstallableRepos(): Promise<InstallableRepo[]> {
  const app = getGitHubApp();
  const result: InstallableRepo[] = [];

  for await (const { installation } of app.eachInstallation.iterator()) {
    const octokit = await app.getInstallationOctokit(installation.id);
    const repositories = await octokit.paginate("GET /installation/repositories", {
      per_page: 100,
    });
    for (const repo of repositories) {
      result.push({
        installationId: installation.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
      });
    }
  }

  return result.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export type InstallationSummary = {
  id: number;
  account: string;
  accountType: string;
  /** "all" repos, or only "selected" ones. */
  repositorySelection: string;
  permissions: Record<string, string | undefined>;
  /** Where the owner changes repo access and accepts new permissions. */
  settingsUrl: string | null;
};

/** The App's installations with what each one granted, for Settings. */
export async function listInstallations(): Promise<InstallationSummary[]> {
  const result: InstallationSummary[] = [];
  for await (const { installation } of getGitHubApp().eachInstallation.iterator()) {
    const account = installation.account as { login?: string; slug?: string; type?: string } | null;
    result.push({
      id: installation.id,
      account: account?.login ?? account?.slug ?? `#${installation.id}`,
      accountType: account?.type ?? "Organization",
      repositorySelection: installation.repository_selection,
      permissions: installation.permissions as Record<string, string | undefined>,
      settingsUrl: installation.html_url ?? null,
    });
  }
  return result;
}
