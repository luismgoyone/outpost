"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { STRATEGIES } from "@/lib/github/deploy-strategy";
import { requireOwner } from "@/lib/owner";
import { getConnectedRepo, setDeployStrategy } from "@/lib/repos";
import { createShareLink, revokeShareLink } from "@/lib/share/links";

/** Override (or reset to auto-detect) how a repo ships. */
export async function setShippingAction(formData: FormData) {
  await requireOwner();
  const repoId = String(formData.get("repoId") ?? "");
  const value = String(formData.get("strategy") ?? "auto");
  const repo = await getConnectedRepo(repoId);
  if (!repo) throw new Error("Unknown repository");

  const strategy = STRATEGIES.includes(value as (typeof STRATEGIES)[number]) ? value : null;
  await setDeployStrategy(repo.id, strategy);
  revalidatePath("/", "layout");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateShareResult = { url: string } | { error: string } | null;

/** Create a read-only share link. The full URL is returned once and never stored. */
export async function createShareLinkAction(
  _: CreateShareResult,
  formData: FormData,
): Promise<CreateShareResult> {
  await requireOwner();
  const repo = await getConnectedRepo(String(formData.get("repoId") ?? ""));
  if (!repo) return { error: "Unknown repository" };
  const label =
    String(formData.get("label") ?? "")
      .trim()
      .slice(0, 80) || null;
  const { token } = await createShareLink(repo.id, label);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  revalidatePath(`/repositories/${repo.id}`);
  return { url: `${proto}://${host}/s/${token}` };
}

export async function revokeShareLinkAction(formData: FormData) {
  await requireOwner();
  const repoId = String(formData.get("repoId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(repoId) || !UUID.test(id)) throw new Error("Invalid share link");
  await revokeShareLink(repoId, id);
  revalidatePath(`/repositories/${repoId}`);
}
