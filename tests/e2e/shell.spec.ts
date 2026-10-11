import { expect, test } from "./support/fixtures";

const SCREENS = [{ label: "Settings", path: "/settings", issue: "#16" }];

test("sidebar navigates every section and marks the active one", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/repositories");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: /Repositories/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  for (const screen of SCREENS) {
    await nav.getByRole("link", { name: screen.label }).click();
    await expect(page).toHaveURL(screen.path);
    await expect(page.getByRole("heading", { level: 1, name: screen.label })).toBeVisible();
    await expect(page.getByText(`Tracked in ${screen.issue}`)).toBeVisible();
    await expect(nav.getByRole("link", { name: screen.label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

test("every section requires sign-in", async ({ page }) => {
  for (const path of [
    ...SCREENS.map((s) => s.path),
    "/pull-requests",
    "/my-work",
    "/overview",
    "/deployments",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  }
});

test("old routes redirect to the new ones", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/repositories");
});

test("phones get a menu button that opens the sidebar", async ({ page, signInAs }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs();
  await page.goto("/repositories");
  await expect(page.getByRole("complementary")).toBeHidden();

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Releases" })
    .click();
  await expect(page).toHaveURL("/releases");
  await expect(menu).toBeHidden();
});

test("desktop hides the menu button", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/repositories");
  await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
