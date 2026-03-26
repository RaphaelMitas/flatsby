import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: string;
  expires?: number;
}

async function createAuthSession(
  page: Page,
  baseURL: string | undefined,
): Promise<TestCookie[]> {
  const apiUrl = `${baseURL}/api/e2e/create-session`;

  const response = await page.request.post(apiUrl);

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create E2E session: ${response.status()} ${body}`,
    );
  }

  const data = (await response.json()) as {
    cookies: TestCookie[];
    userId: string;
    ok: boolean;
  };

  return data.cookies;
}

async function cleanupAuthSession(
  page: Page,
  baseURL: string | undefined,
): Promise<void> {
  const apiUrl = `${baseURL}/api/e2e/create-session`;
  await page.request.delete(apiUrl);
}

function normalizeSameSite(
  sameSite: string,
): "Strict" | "Lax" | "None" {
  const lower = sameSite.toLowerCase();
  if (lower === "strict") return "Strict";
  if (lower === "none") return "None";
  return "Lax";
}

/**
 * Authenticated test fixture.
 *
 * Creates a test user + session via the E2E API route (which uses better-auth's
 * testUtils plugin to create properly signed session cookies).
 *
 * The x-vercel-protection-bypass header is set automatically via
 * extraHTTPHeaders in playwright.config.ts when VERCEL_AUTOMATION_BYPASS_SECRET
 * is present — no need to add it manually here.
 *
 * Cleans up test data after each test.
 */
export const test = base.extend<{ authPage: Page }>({
  authPage: async ({ page, context, baseURL }, use) => {
    const cookies = await createAuthSession(page, baseURL);

    const playwrightCookies = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: normalizeSameSite(cookie.sameSite),
      ...(cookie.expires ? { expires: cookie.expires } : {}),
    }));

    await context.addCookies(playwrightCookies);

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture callback, not a React hook
    await use(page);

    await cleanupAuthSession(page, baseURL);
  },
});

export { expect };
