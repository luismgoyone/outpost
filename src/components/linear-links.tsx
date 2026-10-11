import { findIssueKeys, linearIssueUrl, parseTeamKeys } from "@/lib/linear";

/**
 * Linear issue chips for a PR, from keys in its title or branch. Hidden unless
 * LINEAR_WORKSPACE is set (read per render, never at import).
 */
export function LinearLinks({ pr }: { pr: { title: string; headRefName: string } }) {
  const workspace = process.env.LINEAR_WORKSPACE;
  if (!workspace) return null;
  const keys = findIssueKeys(
    [pr.title, pr.headRefName],
    parseTeamKeys(process.env.LINEAR_TEAM_KEYS),
  );
  return keys.map((key) => (
    <a
      key={key}
      href={linearIssueUrl(workspace, key)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Linear issue ${key}`}
      className="border-primary/25 text-primary hover:bg-primary/10 shrink-0 rounded-sm border px-1 font-mono text-[10px] leading-4"
    >
      {key}
    </a>
  ));
}
