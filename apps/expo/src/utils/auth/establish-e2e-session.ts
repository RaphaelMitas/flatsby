import * as SecureStore from "expo-secure-store";

import { queryClient } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";

import { getSession } from "./auth-client";

const COOKIE_KEY = "flatsby_cookie";
const SESSION_DATA_KEY = "flatsby_session_data";

interface E2eSessionCookie {
  name: string;
  value: string;
  expires?: number;
}

interface E2eSessionResponse {
  cookies: E2eSessionCookie[];
  userId: string;
  email: string;
}

export async function establishE2eSession(): Promise<E2eSessionResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/e2e/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`E2E session failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as E2eSessionResponse;

  const cookieJar: Record<string, { value: string; expires: string | null }> =
    {};
  for (const cookie of data.cookies) {
    cookieJar[cookie.name] = {
      value: cookie.value,
      expires:
        cookie.expires != null
          ? new Date(cookie.expires * 1000).toISOString()
          : null,
    };
  }

  await SecureStore.setItemAsync(COOKIE_KEY, JSON.stringify(cookieJar));
  await SecureStore.deleteItemAsync(SESSION_DATA_KEY);

  const session = await getSession();
  if (!session.data?.user) {
    throw new Error("E2E session not recognized after login");
  }

  await queryClient.invalidateQueries();

  return data;
}
