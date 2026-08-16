import { defineConfig, devices } from "@playwright/test";

// README screenshot capture, run by the release workflow. Not part of the
// regular e2e suite (playwright.config.ts ignores e2e/screenshots): one
// worker, one seeded session, deterministic dark-mode captures.
const PORT = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e/screenshots",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  ...(!process.env.BASE_URL && {
    webServer: {
      command: `pnpm dev --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  }),
});
