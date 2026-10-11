/** What the GitHub App needs to read for each screen. Pure, so it's unit-tested. */

export type PermissionLevel = "read" | "write" | "admin";

export const REQUIRED_PERMISSIONS: Array<{ name: string; label: string; usedFor: string }> = [
  { name: "metadata", label: "Metadata", usedFor: "List repositories" },
  { name: "pull_requests", label: "Pull requests", usedFor: "PRs, reviews, merge stats" },
  { name: "contents", label: "Contents", usedFor: "Releases, workflow files, compare" },
  { name: "actions", label: "Actions", usedFor: "Workflow runs" },
  { name: "deployments", label: "Deployments", usedFor: "Deployments screen" },
  { name: "checks", label: "Checks", usedFor: "CI status on private repos" },
  { name: "statuses", label: "Commit statuses", usedFor: "CI status on private repos" },
];

export type PermissionCheck = (typeof REQUIRED_PERMISSIONS)[number] & {
  granted: PermissionLevel | null;
};

/** Each permission Outpost reads, with what the installation actually granted. */
export function checkPermissions(granted: Record<string, string | undefined>): PermissionCheck[] {
  return REQUIRED_PERMISSIONS.map((p) => {
    const level = granted[p.name];
    return {
      ...p,
      granted: level === "read" || level === "write" || level === "admin" ? level : null,
    };
  });
}
