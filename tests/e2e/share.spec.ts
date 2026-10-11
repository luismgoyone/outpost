import { connectRepo, expect, test } from "./support/fixtures";

test("a share link shows one repo read-only, and stops working once revoked", async ({
  page,
  signInAs,
  browser,
}) => {
  await signInAs();
  await connectRepo(page, "acme/shared");
  await page.goto(`${page.url()}?tab=share`);
  await page.getByLabel("Label").fill("Client A");
  await page.getByRole("button", { name: "Create share link" }).click();
  const url = (await page.getByLabel("Share URL").textContent())!.trim();
  expect(url).toMatch(/\/s\/[A-Za-z0-9_-]{43}$/);
  await expect(page.getByRole("list", { name: "Share links" })).toContainText("Client A");

  // A visitor with no session.
  const visitor = await browser.newPage();
  const res = await visitor.goto(url);
  expect(res?.status()).toBe(200);
  await expect(visitor.getByRole("heading", { level: 1, name: "acme/shared" })).toBeVisible();
  await expect(visitor.getByText("Shared PR")).toBeVisible();
  await expect(visitor.getByText("read-only")).toBeVisible();
  await expect(visitor.getByRole("navigation", { name: "Main" })).toHaveCount(0);
  await expect(visitor.getByRole("button", { name: "Sync" })).toHaveCount(0);
  await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.reload();
  await page.getByRole("button", { name: "Revoke Client A" }).click();
  await expect(page.getByRole("list", { name: "Share links" })).toContainText("Revoked");
  expect((await visitor.goto(url))?.status()).toBe(404);
  await visitor.close();
});

test("unknown and malformed share tokens are 404s", async ({ page }) => {
  expect((await page.goto("/s/not-a-token"))?.status()).toBe(404);
  expect((await page.goto(`/s/${"A".repeat(43)}`))?.status()).toBe(404);
});
