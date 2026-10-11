import { connectRepo, expect, test } from "./support/fixtures";

test.describe("command palette", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/palette");
    await expect(page.getByText("Palette PR")).toBeVisible();
  });

  test("Ctrl+K jumps to a page", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await page.keyboard.type("releases");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/releases");
    await expect(dialog).toBeHidden();
  });

  test("the Search button finds repos and open PRs", async ({ page }) => {
    await page.goto("/my-work");
    await page.getByRole("button", { name: "Search" }).click();
    await page.keyboard.type("Palette PR");
    await expect(page.getByRole("option", { name: /Palette PR/ })).toBeVisible();

    await page.getByRole("combobox").fill("acme/palette");
    await page.getByRole("option", { name: "acme/palette" }).click();
    await expect(page).toHaveURL(/\/repositories\/[0-9a-f-]{36}$/);
  });
});
