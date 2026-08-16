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

export interface TestUser {
  userId: string;
  email: string;
  groupId: number;
}

interface SessionData extends TestUser {
  conversationId?: string;
  cookies: TestCookie[];
}

export async function createAuthSession(
  page: Page,
  baseURL: string | undefined,
  params?: Record<string, string>,
): Promise<SessionData> {
  if (!baseURL) {
    throw new Error("baseURL is required for E2E testing");
  }

  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const response = await page.request.post(
    `${baseURL}/api/e2e/create-session${query}`,
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`E2E session failed: ${response.status()} ${body}`);
  }

  return (await response.json()) as SessionData;
}

function normalizeSameSite(sameSite: string): "Strict" | "Lax" | "None" {
  const lower = sameSite.toLowerCase();
  if (lower === "strict") return "Strict";
  if (lower === "none") return "None";
  return "Lax";
}

export function toPlaywrightCookies(cookies: TestCookie[]) {
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: normalizeSameSite(cookie.sameSite),
    ...(cookie.expires ? { expires: cookie.expires } : {}),
  }));
}

/**
 * Authenticated test fixture.
 *
 * Creates a unique test user + group + session per test via the E2E API route
 * (which uses better-auth's testUtils plugin to create properly signed session
 * cookies). Because every test gets its own isolated user and group, tests
 * can run with any number of parallel workers without polluting each other.
 */
export const test = base.extend<{ authPage: Page; testUser: TestUser }>({
  testUser: async ({ page, context, baseURL }, use) => {
    const session = await createAuthSession(page, baseURL);

    await context.addCookies(toPlaywrightCookies(session.cookies));

    await use({
      userId: session.userId,
      email: session.email,
      groupId: session.groupId,
    });
  },
  authPage: async ({ page, testUser: _testUser }, use) => {
    // Depending on testUser guarantees the session cookies are set.
    await use(page);
  },
});

export { expect };
