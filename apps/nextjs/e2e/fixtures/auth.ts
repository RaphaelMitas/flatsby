import type { BrowserContext, Page } from "@playwright/test";
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
  cookies: TestCookie[];
}

function isLocalhost(baseURL: string): boolean {
  const hostname = new URL(baseURL).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function callCreateSessionApi(
  apiUrl: string,
  headers: Record<string, string> = {},
): Promise<SessionData> {
  const apiRes = await fetch(apiUrl, {
    method: "POST",
    headers,
  });

  if (!apiRes.ok) {
    const body = await apiRes.text();
    throw new Error(`E2E session failed: ${apiRes.status} ${body}`);
  }

  return (await apiRes.json()) as SessionData;
}

async function createAuthSession(
  page: Page,
  baseURL: string | undefined,
  context: BrowserContext,
): Promise<SessionData> {
  if (!baseURL) {
    throw new Error("baseURL is required for E2E testing");
  }

  const apiUrl = `${baseURL}/api/e2e/create-session`;

  if (isLocalhost(baseURL)) {
    const response = await page.request.post(apiUrl);
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`E2E session failed: ${response.status()} ${body}`);
    }

    return (await response.json()) as SessionData;
  }

  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!bypassSecret) {
    throw new Error(
      "VERCEL_AUTOMATION_BYPASS_SECRET is required for remote E2E testing",
    );
  }

  // Use Node's native fetch to obtain the Vercel bypass cookie.
  // Use redirect: 'manual' because Vercel responds with a 307 redirect that
  // sets the _vercel_jwt cookie. Node's fetch follows 307 poorly and may
  // redirect infinitely.
  const getRes = await fetch(baseURL, {
    redirect: "manual",
    headers: {
      "x-vercel-protection-bypass": bypassSecret,
      "x-vercel-set-bypass-cookie": "samesitenone",
    },
  });

  const setCookieHeader = getRes.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error(
      "No Set-Cookie header from Vercel. Check VERCEL_AUTOMATION_BYPASS_SECRET.",
    );
  }

  const cookieRegex =
    /_vercel_jwt=([^;]+)(?:;.*?expires=([^;]+))?;.*?path=([^;]+);.*?Secure;.*?SameSite=([^;]+)/i;
  const cookieMatch = cookieRegex.exec(setCookieHeader);

  if (!cookieMatch) {
    throw new Error(
      `Could not parse _vercel_jwt from Set-Cookie: ${setCookieHeader.slice(0, 200)}`,
    );
  }

  const [, cookieValue, expiresStr, cookiePath] = cookieMatch;
  const expires = expiresStr ? parseInt(expiresStr, 10) : undefined;

  await context.addCookies([
    {
      name: "_vercel_jwt",
      value: cookieValue ?? "",
      domain: new URL(baseURL).hostname,
      path: cookiePath ?? "/",
      ...(expires ? { expires } : {}),
      httpOnly: true,
      secure: true,
      sameSite: "None",
    },
  ]);

  return callCreateSessionApi(apiUrl, {
    "x-vercel-protection-bypass": bypassSecret,
    cookie: `_vercel_jwt=${cookieValue}`,
  });
}

function normalizeSameSite(sameSite: string): "Strict" | "Lax" | "None" {
  const lower = sameSite.toLowerCase();
  if (lower === "strict") return "Strict";
  if (lower === "none") return "None";
  return "Lax";
}

/**
 * Authenticated test fixture.
 *
 * Creates a unique test user + group + session per test via the E2E API route
 * (which uses better-auth's testUtils plugin to create properly signed session
 * cookies). Because every test gets its own isolated user and group, tests
 * can run with any number of parallel workers without polluting each other.
 *
 * On Vercel preview deployments, obtains the _vercel_jwt bypass cookie via
 * Node fetch before calling the session API.
 */
export const test = base.extend<{ authPage: Page; testUser: TestUser }>({
  testUser: async ({ page, context, baseURL }, use) => {
    const session = await createAuthSession(page, baseURL, context);

    const playwrightCookies = session.cookies.map((cookie) => ({
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
