import { requireEnv } from "@/lib/env";

/** Minimal typed fetch against the Vercel REST API. VERCEL_API_URL points e2e at a mock. */
export async function vercelFetch<T>(
  path: string,
  params: Record<string, string> = {},
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = new URL(path, process.env.VERCEL_API_URL || "https://api.vercel.com");
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${requireEnv("VERCEL_TOKEN")}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`Vercel API ${res.status} on ${url.pathname}`);
  return (await res.json()) as T;
}
