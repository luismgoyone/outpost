import { test as base, expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { Pool } from "pg";

import { appUrl, E2E, mockGitHubUrl } from "./env";

const COOKIE = "authjs.session-token";

/** Mint a real Auth.js session cookie, the same one a GitHub sign-in would produce. */
async function sessionCookie(login: string) {
  const value = await encode({
    token: { name: login, login, sub: login },
    secret: E2E.authSecret,
    salt: COOKIE,
  });
  return { name: COOKIE, value, url: appUrl, httpOnly: true, sameSite: "Lax" as const };
}

export const test = base.extend<{ signInAs: (login?: string) => Promise<void> }>({
  signInAs: async ({ context }, use) => {
    await use(async (login = E2E.ownerLogin) => {
      await context.addCookies([await sessionCookie(login)]);
    });
  },
});

export { expect };

/**
 * Connect a mock repo, or open it if another test already connected it. Leaves the page on
 * the repo's detail page.
 */
export async function connectRepo(page: Page, fullName: string) {
  await page.goto("/repositories");
  const connect = page.getByRole("button", { name: `Connect ${fullName}` });
  const connected = page
    .getByRole("list", { name: "Connected repositories" })
    .getByRole("link", { name: fullName });
  await expect(connect.or(connected)).toBeVisible();
  if (await connect.isVisible()) await connect.click();
  else await connected.click();
  await expect(page).toHaveURL(/\/repositories\/[0-9a-f-]{36}$/);
}

/** Make a mock repo's next GitHub fetch slow, to observe a loading state. */
export async function slowNextFetch(repo: string, ms = 1000) {
  await fetch(`${mockGitHubUrl}/__slow?repo=${repo}&ms=${ms}`);
}

/** Backdate a mock repo's cached data, as if it was fetched `minutes` ago. */
export async function ageCache(repo: string, minutes: number) {
  const pool = new Pool({ connectionString: E2E.databaseUrl });
  try {
    await pool.query(
      `update stats_cache set fetched_at = now() - make_interval(mins => $2)
       where repo_id = (select id from repos where owner = 'acme' and name = $1)`,
      [repo, minutes],
    );
  } finally {
    await pool.end();
  }
}

/** When a mock repo's PRs were last cached. */
export async function cachedAt(repo: string): Promise<Date | null> {
  const pool = new Pool({ connectionString: E2E.databaseUrl });
  try {
    const { rows } = await pool.query<{ fetched_at: Date }>(
      `select fetched_at from stats_cache
       where key = 'pulls' and repo_id = (select id from repos where owner = 'acme' and name = $1)`,
      [repo],
    );
    return rows[0]?.fetched_at ?? null;
  } finally {
    await pool.end();
  }
}
