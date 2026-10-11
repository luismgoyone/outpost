import { expect, test } from "./support/fixtures";

test("signed-out visitors land on the styled sign-in page", async ({ page }) => {
  await page.goto("/pull-requests?repo=api");
  await expect(page).toHaveURL("/sign-in?callbackUrl=%2Fpull-requests%3Frepo%3Dapi");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("sign-in explains a non-owner account", async ({ page }) => {
  await page.goto("/sign-in?error=AccessDenied");
  await expect(page.getByRole("alert").filter({ hasText: "owner" })).toHaveText(
    "That GitHub account isn't the owner of this Outpost.",
  );
});

test("the owner skips sign-in and goes to the requested page", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/sign-in?callbackUrl=%2Freleases");
  await expect(page).toHaveURL("/releases");
});

test("sign-in ignores off-site callback URLs", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/sign-in?callbackUrl=%2F%2Fevil.example");
  await expect(page).toHaveURL("/my-work");
});

test("unknown pages get the Outpost 404", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an unknown repo shows the 404 inside the shell", async ({ page, signInAs }) => {
  await signInAs();
  // Owner pages stream (loading.tsx), so the 404 arrives as content, not a status code.
  await page.goto("/repositories/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
