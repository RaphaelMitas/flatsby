import type { FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;

  const url = `${baseURL}/api/e2e/create-session`;

  try {
    const res = await fetch(url, { method: "DELETE" });

    if (!res.ok) {
      console.warn(
        `E2E cleanup failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (error) {
    console.warn("E2E cleanup request failed:", error);
  }
}
