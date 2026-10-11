import { mockGitHubUrl } from "./support/env";
import { connectRepo, expect, test } from "./support/fixtures";

type Write = { route: string; body: Record<string, unknown> };
const writes = async () => (await (await fetch(`${mockGitHubUrl}/__writes`)).json()) as Write[];

test.describe("write actions", () => {
  test.beforeEach(async ({ page, signInAs }) => {
    await signInAs();
    await connectRepo(page, "acme/flaky");
  });

  test("re-runs a failed workflow, and explains a missing permission", async ({ page }) => {
    await page.goto(`${page.url()}?tab=workflows`);
    await page.getByRole("button", { name: "Re-run failed jobs of CI" }).click();
    const ci = page.getByRole("row", { name: "CI" });
    await expect(ci.getByRole("status")).toHaveText("Re-run started");
    expect((await writes()).map((w) => w.route)).toContain(
      "POST /repos/acme/flaky/actions/runs/3001/rerun-failed-jobs",
    );

    await page.getByRole("button", { name: "Re-run failed jobs of Lint" }).click();
    await expect(page.getByRole("row", { name: "Lint" }).getByRole("status")).toContainText(
      '"Actions: Read and write"',
    );
  });

  test("nudges the reviewers of my PR", async ({ page }) => {
    await page.goto("/my-work");
    await page.getByRole("button", { name: "Nudge reviewers of flaky#9" }).click();
    const row = page
      .getByRole("list", { name: "My pull requests" })
      .getByRole("listitem")
      .filter({ hasText: "Owner PR awaiting review" });
    await expect(row.getByRole("status")).toHaveText("Nudged 2");
    const comment = (await writes()).find((w) => w.route.endsWith("/issues/9/comments"));
    expect(comment?.body.body).toContain("@alice @acme/web-team friendly nudge");
  });

  test("redeploys a failed Vercel production deploy", async ({ page }) => {
    await page.goto("/deployments?repo=flaky");
    await page.getByRole("button", { name: "Redeploy Production" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Redeploy" })).toHaveText(
      "Redeploy started",
    );
    const redeploy = (await writes()).find((w) => w.route.startsWith("POST /v13/deployments"));
    expect(redeploy?.route).toContain("slug=acme-team");
    expect(redeploy?.body).toEqual({
      name: "flaky-web",
      deploymentId: "dpl_AbC123xyz",
      target: "production",
    });
  });
});
