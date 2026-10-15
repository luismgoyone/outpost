import { defineConfig, devices } from "@playwright/test";

import base from "./playwright.config";
import { E2E } from "./tests/e2e/support/env";

/**
 * Records the portfolio demo clip against the e2e mocks: `pnpm demo:record`.
 * Runs the production build so the dev indicator stays out of the video.
 */
export default defineConfig({
  ...base,
  testDir: "./tests/demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: { ...base.use, video: "off", trace: "off", screenshot: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: (Array.isArray(base.webServer) ? base.webServer : []).map((server, i) =>
    i === 1
      ? {
          ...server,
          command: `pnpm build && pnpm start --port ${E2E.appPort}`,
          timeout: 300_000,
        }
      : server,
  ),
});
