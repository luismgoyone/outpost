import { connectRepo, expect, test } from "./support/fixtures";

test("Overview shows attention tiles and repo health cards", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/billing");
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1, name: "Engineering Overview" })).toBeVisible();

  const failing = page.getByRole("region", { name: "Failing CI" });
  await expect(failing).toContainText(/\d+\s*active failures/);

  const card = page.getByRole("list", { name: "Repository health" }).getByRole("listitem", {
    name: "billing",
  });
  await expect(card).toContainText("v1.19.0");
  await expect(card).toContainText("Go");
  await expect(card).toContainText("private");
  await expect(card).toContainText("2 open");
  await expect(card).toContainText("Passing"); // main CI
  await expect(card).toContainText("75%"); // merge rate: 3 of 4 closed PRs merged
  await expect(card).toContainText(/Prod deploy\s*42m ago · Success/);
  await expect(card).toContainText("3 PRs/wk");
  await expect(
    card.getByRole("img", { name: /billing: pull requests opened per week/ }),
  ).toBeVisible();

  // Filter by name.
  await page.getByRole("searchbox", { name: "Filter repositories" }).fill("bill");
  await page.getByRole("searchbox", { name: "Filter repositories" }).press("Enter");
  await expect(page).toHaveURL(/q=bill/);
  await expect(
    page.getByRole("list", { name: "Repository health" }).getByRole("listitem"),
  ).toHaveCount(1);
});

test("repo cards fill the row on very wide screens", async ({ page, signInAs }) => {
  await signInAs();
  for (const r of [
    "acme/billing",
    "acme/mobile",
    "acme/api",
    "acme/storefront",
    "acme/platform",
    "acme/marketing",
  ]) {
    await connectRepo(page, r);
  }
  await page.setViewportSize({ width: 3900, height: 1200 });
  await page.goto("/overview");
  const cards = page.getByRole("list", { name: "Repository health" }).getByRole("listitem");
  const listBox = await page.getByRole("list", { name: "Repository health" }).boundingBox();
  const boxes = await Promise.all((await cards.all()).slice(0, 6).map((c) => c.boundingBox()));
  // Six columns: the first six cards share one row and the row spans the full width.
  expect(new Set(boxes.map((b) => Math.round(b!.y))).size).toBe(1);
  const last = boxes[5]!;
  expect(Math.abs(last.x + last.width - (listBox!.x + listBox!.width))).toBeLessThan(2);
});
