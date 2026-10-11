import { E2E, mockGitHubUrl } from "./support/env";
import { connectRepo, expect, test } from "./support/fixtures";

test("PRs link the Linear issues in their title or branch", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/tickets");
  const link = page.getByRole("link", { name: "Linear issue ENG-42" });
  await expect(link).toHaveAttribute("href", "https://linear.app/acme-linear/issue/ENG-42");
  await expect(page.getByText("Use UTF-8 everywhere")).toBeVisible();
  await expect(page.getByRole("link", { name: /Linear issue UTF/ })).toHaveCount(0);
});

test.describe("daily Slack digest", () => {
  const url = "/api/cron/digest";
  const auth = { authorization: `Bearer ${E2E.cronSecret}` };

  test("rejects calls without the cron secret", async ({ request }) => {
    expect((await request.get(url)).status()).toBe(401);
    const wrong = await request.get(url, { headers: { authorization: "Bearer nope" } });
    expect(wrong.status()).toBe(401);
  });

  test("a dry run returns the message without posting", async ({ request }) => {
    const res = await request.get(`${url}?dry=1`, { headers: auth });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { sent: boolean; text: string };
    expect(body.sent).toBe(false);
    expect(body.text).toContain("|Open My Work>");
  });

  test("posts the digest to the Slack webhook", async ({ request }) => {
    const res = await request.get(url, { headers: auth });
    expect(res.status()).toBe(200);
    expect(((await res.json()) as { sent: boolean }).sent).toBe(true);
    const posted = (await (await fetch(`${mockGitHubUrl}/__slack`)).json()) as { text?: string };
    expect(posted.text).toContain("Outpost");
  });
});
