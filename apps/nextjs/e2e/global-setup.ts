import type { FullConfig } from "@playwright/test";

import { fetchWithVercelBypass } from "./helpers/vercel";

/**
 * Runs once before the suite: sweeps stale E2E test data (users, groups, and
 * related rows older than one hour) left behind by previous runs. Fresh data
 * is never touched, so parallel suites sharing a database can't delete each
 * other's in-flight users; each run's own data is swept by a later run.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;

  const url = `${baseURL}/api/e2e/create-session`;

  try {
    const res = await fetchWithVercelBypass(url, { method: "DELETE" });

    if (!res.ok) {
      console.warn(
        `E2E cleanup failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (error) {
    console.warn("E2E cleanup request failed:", error);
  }
}
