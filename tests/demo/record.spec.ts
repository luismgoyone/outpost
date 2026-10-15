import { writeFile } from "node:fs/promises";

import { connectRepo, expect, test } from "../e2e/support/fixtures";

const VIEWPORT = { width: 1280, height: 800 };
const REPOS = [
  "acme/billing",
  "acme/mobile",
  "acme/api",
  "acme/storefront",
  "acme/platform",
  "acme/marketing",
];
const OUT = "test-results/demo/outpost";

/**
 * A ~15s tour for the portfolio site: Overview → My Work → command palette → a repo.
 * Writes `outpost.webm` plus `outpost.json` (seconds of blank lead-in to trim).
 */
test("record the Outpost demo", async ({ browser, context, page, signInAs }) => {
  // Setup off camera: sign in, connect repos, warm the cache.
  await signInAs();
  for (const repo of REPOS) await connectRepo(page, repo);
  await page.goto("/overview");
  await expect(
    page.getByRole("list", { name: "Repository health" }).getByRole("listitem"),
  ).toHaveCount(REPOS.length);

  const rec = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: "dark",
    recordVideo: { dir: OUT, size: VIEWPORT },
  });
  await rec.addCookies(await context.cookies());
  const started = Date.now();
  const p = await rec.newPage();
  const pause = (ms: number) => p.waitForTimeout(ms);

  await p.goto("/overview");
  await expect(p.getByRole("heading", { level: 1, name: "Engineering Overview" })).toBeVisible();
  await p.evaluate(() => document.fonts.ready);
  const leadIn = (Date.now() - started) / 1000;
  await pause(2800);

  await p.mouse.wheel(0, 360);
  await pause(1800);

  await p.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My Work" }).click();
  await expect(p.getByRole("heading", { level: 1, name: "My Work" })).toBeVisible();
  await pause(3000);

  await p.keyboard.press("ControlOrMeta+k");
  await expect(p.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await pause(500);
  await p.keyboard.type("acme/billing", { delay: 90 });
  await pause(700);
  await p.getByRole("option", { name: "acme/billing" }).click();
  await expect(p).toHaveURL(/\/repositories\/[0-9a-f-]{36}$/);
  await p.waitForLoadState("networkidle");
  await pause(3200);

  const video = p.video()!;
  await rec.close();
  await video.saveAs(`${OUT}.webm`);
  await writeFile(`${OUT}.json`, JSON.stringify({ leadIn }, null, 2));
});
