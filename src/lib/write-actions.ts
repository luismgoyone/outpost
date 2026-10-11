/** Shared, pure pieces of the write actions (re-run, nudge, redeploy). Unit-tested. */

export type ActionResult = { ok: boolean; message: string } | null;

/** Vercel reports `https://vercel.com/<team>/<project>/<id>` as a GitHub deployment's log URL. */
export function parseVercelLogUrl(
  url: string | null,
): { team: string; project: string; deploymentId: string } | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== "vercel.com") return null;
  const [team, project, id] = parsed.pathname.split("/").filter(Boolean);
  if (!team || !project || !id || !/^[A-Za-z0-9]+$/.test(id)) return null;
  return { team, project, deploymentId: id.startsWith("dpl_") ? id : `dpl_${id}` };
}

/** The comment that nudges a PR's pending reviewers ("@alice @acme/web-team"). */
export function nudgeComment(reviewers: string[]): string {
  const mentions = reviewers.map((r) => `@${r}`).join(" ");
  return `${mentions} friendly nudge: this pull request is waiting on your review. Thanks!`;
}

/** Turn a GitHub/Vercel API failure into something the owner can act on. */
export function explainWriteError(error: unknown, permission: string): string {
  const err = error as { status?: number; message?: string };
  const message = String(err?.message ?? error);
  if (err?.status === 403 || /not accessible by integration/i.test(message)) {
    return `The GitHub App needs "${permission}: Read and write". Add it in the App's settings, then accept the new permissions on the installation.`;
  }
  return message;
}
