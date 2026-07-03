import type { FullConfig } from "@playwright/test";

/**
 * Runs once before the suite: sweeps stale E2E test data (users, groups, and
 * related rows older than one hour) left behind by previous runs. Fresh data
 * is never touched, so parallel suites sharing a database can't delete each
 * other's in-flight users; each run's own data is swept by a later run.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;

  const headers: Record<string, string> = {};
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypassSecret) {
    headers["x-vercel-protection-bypass"] = bypassSecret;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }

  const url = `${baseURL}/api/e2e/create-session`;

  try {
    // Vercel deployment protection answers with a 307 that sets the
    // _vercel_jwt cookie. Node's fetch follows it infinitely instead of
    // storing the cookie, so handle the redirect manually and retry with
    // the cookie attached (same workaround as in fixtures/auth.ts).
    let res = await fetch(url, {
      method: "DELETE",
      headers,
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const setCookie = res.headers.get("set-cookie") ?? "";
      const jwtMatch = /_vercel_jwt=([^;]+)/.exec(setCookie);
      if (!jwtMatch) {
        console.warn(
          `E2E cleanup got a redirect (${res.status}) without a _vercel_jwt cookie; skipping cleanup.`,
        );
        return;
      }
      res = await fetch(url, {
        method: "DELETE",
        headers: { ...headers, cookie: `_vercel_jwt=${jwtMatch[1]}` },
        redirect: "manual",
      });
    }

    if (!res.ok) {
      console.warn(
        `E2E cleanup failed: ${res.status} ${await res.text().catch(() => "")}`,
      );
    }
  } catch (error) {
    console.warn("E2E cleanup request failed:", error);
  }
}
