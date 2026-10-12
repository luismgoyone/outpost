"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { listInstallableRepos } from "@/lib/github/installations";
import { requireOwner } from "@/lib/owner";
import { connectRepo, disconnectRepo } from "@/lib/repos";

export async function connectRepoAction(formData: FormData) {
  await requireOwner();
  const fullName = String(formData.get("fullName") ?? "");

  // Only accept repos the App can actually see; never trust client-sent IDs.
  const repo = (await listInstallableRepos()).find((r) => r.fullName === fullName);
  if (!repo) throw new Error(`Repository ${fullName} is not available to the GitHub App`);

  const connected = await connectRepo(repo);
  // The shell's sidebar lists connected repos, so refresh the whole layout.
  revalidatePath("/", "layout");
  redirect(`/repositories/${connected.id}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function disconnectRepoAction(formData: FormData) {
  await requireOwner();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("Invalid repository ID");
  await disconnectRepo(id);
  revalidatePath("/", "layout");
}
