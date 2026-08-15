import os from "node:os";
import { defineConfig, devices } from "@playwright/test";

// Only used for the dev server this config starts when BASE_URL is unset; CI
// runs its own server and passes BASE_URL.
const PORT = 3100;
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

// Every test gets its own isolated user + group (see e2e/fixtures/auth.ts),
// so any worker count is safe. Override with PLAYWRIGHT_WORKERS.
const workers = process.env.PLAYWRIGHT_WORKERS
  ? Number.parseInt(process.env.PLAYWRIGHT_WORKERS, 10)
  : Math.min(os.cpus().length, 8);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only start a local dev server when no BASE_URL is provided
  ...(!process.env.BASE_URL && {
    webServer: {
      command: `pnpm dev --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  }),
});
