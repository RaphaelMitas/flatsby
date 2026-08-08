import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/**
 * E2E testing support. Only active in builds created with the `e2e` EAS
 * profile (E2E_TESTING=true baked into `extra.e2eTesting` via app.config.ts).
 *
 * The Maestro test runner opens the `flatsby://e2e-login` deep link with the
 * preview deployment URL and Vercel bypass secret. That route stores them
 * here and injects a signed session cookie, then the app is relaunched so
 * that module-init consumers (auth client, tRPC links) pick up the override.
 */

const API_URL_KEY = "e2e_api_url";
const BYPASS_SECRET_KEY = "e2e_bypass_secret";

/** Matches the @better-auth/expo client: `${storagePrefix}_cookie`. */
const AUTH_COOKIE_STORAGE_KEY = "flatsby_cookie";

export function isE2ETestingEnabled(): boolean {
  const extra: unknown = Constants.expoConfig?.extra;
  if (typeof extra !== "object" || extra === null) return false;
  if (!("e2eTesting" in extra)) return false;
  return extra.e2eTesting === true;
}

export function getE2EApiUrlOverride(): string | null {
  if (!isE2ETestingEnabled()) return null;
  return SecureStore.getItem(API_URL_KEY);
}

/**
 * In e2e builds, list-row containers set accessible={false} so Maestro can
 * reach their child elements (checkboxes, texts). Outside e2e builds this
 * returns undefined, keeping the default grouped VoiceOver behavior.
 */
export function e2eAccessibilityOverride(): false | undefined {
  return isE2ETestingEnabled() ? false : undefined;
}

export function getE2EBypassHeaders(): Record<string, string> {
  if (!isE2ETestingEnabled()) return {};
  const secret = SecureStore.getItem(BYPASS_SECRET_KEY);
  if (!secret) return {};
  return { "x-vercel-protection-bypass": secret };
}

interface E2ESessionCookie {
  name: string;
  value: string;
  expires?: number;
}

export interface E2ESession {
  userId: string;
  email: string;
  groupId: number;
  cookies: E2ESessionCookie[];
}

function isE2ESessionCookie(value: unknown): value is E2ESessionCookie {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("value" in value) || typeof value.value !== "string") return false;
  return true;
}

function parseE2ESession(value: unknown): E2ESession {
  if (
    typeof value !== "object" ||
    value === null ||
    !("userId" in value) ||
    typeof value.userId !== "string" ||
    !("email" in value) ||
    typeof value.email !== "string" ||
    !("groupId" in value) ||
    typeof value.groupId !== "number" ||
    !("cookies" in value) ||
    !Array.isArray(value.cookies) ||
    !value.cookies.every(isE2ESessionCookie)
  ) {
    throw new Error("Unexpected create-session response shape");
  }
  return {
    userId: value.userId,
    email: value.email,
    groupId: value.groupId,
    cookies: value.cookies,
  };
}

/**
 * Calls the web app's e2e create-session endpoint and stores the returned
 * session cookies in the exact format the @better-auth/expo client reads,
 * plus the API URL + bypass secret for subsequent requests.
 */
export async function setupE2ESession(options: {
  apiUrl: string;
  bypassSecret: string;
  name?: string;
  email?: string;
  seed?: string;
}): Promise<E2ESession> {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  SecureStore.setItem(API_URL_KEY, apiUrl);
  if (options.bypassSecret) {
    SecureStore.setItem(BYPASS_SECRET_KEY, options.bypassSecret);
  }

  const query = new URLSearchParams();
  if (options.name) query.set("name", options.name);
  if (options.email) query.set("email", options.email);
  if (options.seed) query.set("seed", options.seed);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  // The endpoint sits on a fresh preview deployment; the first request from
  // the simulator can fail or stall transiently, which would otherwise park
  // the e2e-login screen in its error state for the whole test run.
  let response: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      response = await fetch(`${apiUrl}/api/e2e/create-session${suffix}`, {
        method: "POST",
        headers: options.bypassSecret
          ? { "x-vercel-protection-bypass": options.bypassSecret }
          : {},
      });
      if (response.ok) break;
      const body = await response.text();
      lastError = new Error(
        `create-session failed: ${response.status} ${body.slice(0, 300)}`,
      );
      response = undefined;
    } catch (error) {
      lastError = error;
      response = undefined;
    }
  }
  if (!response) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  const session = parseE2ESession(await response.json());

  const cookieJar: Record<string, { value: string; expires: string | null }> =
    {};
  for (const cookie of session.cookies) {
    cookieJar[cookie.name] = {
      value: cookie.value,
      expires:
        cookie.expires !== undefined
          ? new Date(cookie.expires * 1000).toISOString()
          : null,
    };
  }
  SecureStore.setItem(AUTH_COOKIE_STORAGE_KEY, JSON.stringify(cookieJar));

  return session;
}
