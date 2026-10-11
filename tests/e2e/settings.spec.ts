import { signWebhookBody } from "../../src/lib/github/webhook-signature";

import { E2E } from "./support/env";
import { connectRepo, expect, test } from "./support/fixtures";

test("Settings shows the App's permissions and what's missing", async ({ page, signInAs }) => {
  await signInAs();
  await page.goto("/settings");
  const install = page.getByRole("list", { name: "Installations" }).getByRole("listitem").first();
  await expect(install).toContainText("acme");
  await expect(install).toContainText("selected repositories");
  await expect(install.getByText("3 missing")).toBeVisible();
  const perms = page.getByRole("list", { name: "Permissions for acme" });
  await expect(perms.getByRole("listitem").filter({ hasText: "Pull requests" })).toContainText(
    "read",
  );
  await expect(perms.getByRole("listitem").filter({ hasText: "Deployments" })).toContainText(
    "missing",
  );
  await expect(page.getByRole("link", { name: "Configure on GitHub" })).toHaveAttribute(
    "href",
    /settings\/installations\/\d+/,
  );
});

test("Settings shows the webhook URL and the last delivery", async ({
  page,
  signInAs,
  request,
}) => {
  const res = await request.post("/api/github/webhook", {
    data: "{}",
    headers: {
      "x-github-event": "ping",
      "x-hub-signature-256": signWebhookBody(E2E.webhookSecret, "{}"),
    },
  });
  expect(res.status()).toBe(200);

  await signInAs();
  await page.goto("/settings");
  const live = page.getByRole("region", { name: "Live updates" });
  await expect(live.getByText("Webhook on")).toBeVisible();
  await expect(live).toContainText("/api/github/webhook");
  await expect(live.getByRole("list", { name: "Recent deliveries" })).toContainText("ping");
});

test("a repo can be disconnected after confirming", async ({ page, signInAs }) => {
  await signInAs();
  await connectRepo(page, "acme/scratch");
  await page.goto("/settings");
  const list = page.getByRole("list", { name: "Settings repositories" });
  await expect(list).toContainText("acme/scratch");

  await page.getByRole("button", { name: "Disconnect acme/scratch" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(list).toContainText("acme/scratch");

  await page.getByRole("button", { name: "Disconnect acme/scratch" }).click();
  await page.getByRole("button", { name: "Confirm disconnect acme/scratch" }).click();
  await expect(list).not.toContainText("acme/scratch");
  // It's available to connect again, and its page is gone.
  await page.goto("/repositories");
  await expect(
    page.getByRole("button", { name: "Connect acme/scratch", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Sidebar repositories" })).not.toContainText(
    "scratch",
  );
});
