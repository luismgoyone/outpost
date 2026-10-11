/**
 * Linear issue keys (ENG-123) mentioned in a PR's title or branch, linked to the owner's
 * Linear workspace. Pure, so it's unit-tested.
 */

const KEY = /\b([A-Za-z][A-Za-z0-9]{0,6})-(\d{1,6})\b/g;

/**
 * Look like issue keys but aren't: encodings, standards, hashes, versions, branch words
 * (release-2, fix-123). Only used without LINEAR_TEAM_KEYS, which is the reliable option.
 */
const NOT_LINEAR = new Set(
  (
    "UTF ISO SHA RFC CVE MD X V PR GH TLS ES NODE PY " +
    "RELEASE HOTFIX FIX FEAT FEATURE CHORE DOCS TEST BUG ISSUE STEP PHASE PART PAGE"
  ).split(" "),
);

/**
 * Keys in order of first appearance, upper-cased and de-duplicated. With `teams`, only those
 * team prefixes count (LINEAR_TEAM_KEYS), which avoids false positives entirely.
 */
export function findIssueKeys(texts: string[], teams: string[] = []): string[] {
  const allowed = new Set(teams.map((t) => t.trim().toUpperCase()).filter(Boolean));
  const keys = new Set<string>();
  for (const text of texts) {
    for (const [, team, number] of text.matchAll(KEY)) {
      const prefix = team.toUpperCase();
      if (allowed.size > 0 ? !allowed.has(prefix) : NOT_LINEAR.has(prefix)) continue;
      if (/^\d/.test(prefix)) continue;
      keys.add(`${prefix}-${Number(number)}`);
    }
  }
  return [...keys];
}

export function linearIssueUrl(workspace: string, key: string): string {
  return `https://linear.app/${encodeURIComponent(workspace)}/issue/${key}`;
}

/** LINEAR_TEAM_KEYS="ENG, OPS" → ["ENG", "OPS"]. */
export function parseTeamKeys(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
