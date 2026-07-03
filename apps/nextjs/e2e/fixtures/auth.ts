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

async function createAuthSession(
  _page: Page,
  baseURL: string | undefined,
  context: BrowserContext,
): Promise<TestCookie[]> {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!bypassSecret || !baseURL) {
    throw new Error(
      "VERCEL_AUTOMATION_BYPASS_SECRET and BASE_URL are required for E2E testing",
    );
  }

  // Step 1: Use Node's native fetch to obtain the Vercel bypass cookie.
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

  // Parse the _vercel_jwt cookie from Set-Cookie header
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

  // Step 2: Add the Vercel bypass cookie to the browser context
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

  // Step 3: Call the E2E session API using Node fetch (with the bypass cookie)
  const apiUrl = `${baseURL}/api/e2e/create-session`;
  const apiRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "x-vercel-protection-bypass": bypassSecret,
      cookie: `_vercel_jwt=${cookieValue}`,
    },
  });

  if (!apiRes.ok) {
    const body = await apiRes.text();
    throw new Error(`E2E session failed: ${apiRes.status} ${body}`);
  }

  const data = (await apiRes.json()) as {
    cookies: TestCookie[];
    userId: string;
    ok: boolean;
  };

  return data.cookies;
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
 * Creates a test user + session via the E2E API route (which uses better-auth's
 * testUtils plugin to create properly signed session cookies).
 *
 * Handles Vercel bot protection by obtaining the _vercel_jwt bypass cookie
 * via Node's native fetch, then injecting it into the browser context.
 *
 * Cleans up test data after each test.
 */
export const test = base.extend<{ authPage: Page }>({
  authPage: async ({ page, context, baseURL }, use) => {
    const cookies = await createAuthSession(page, baseURL, context);

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
  },
});

export { expect };
