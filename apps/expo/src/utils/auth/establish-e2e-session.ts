import * as SecureStore from "expo-secure-store";

import { queryClient } from "~/utils/api";
import { getBaseUrl } from "~/utils/base-url";
import { authClient } from "./auth-client";

const COOKIE_KEY = "flatsby_cookie";
const SESSION_DATA_KEY = "flatsby_session_data";
const SESSION_WAIT_MS = 15_000;

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

type SessionAtomState = ReturnType<typeof authClient.useSession>;

function isSessionReady(state: SessionAtomState): boolean {
  return !state.isPending && !state.isRefetching && state.data?.user != null;
}

function isSessionSettled(state: SessionAtomState): boolean {
  return !state.isPending && !state.isRefetching;
}

function isSessionAtomState(value: unknown): value is SessionAtomState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "isPending" in value &&
    typeof value.isPending === "boolean" &&
    "isRefetching" in value &&
    typeof value.isRefetching === "boolean"
  );
}

async function waitForAuthSession(): Promise<void> {
  const sessionAtom = authClient.$store.atoms.session;
  if (!sessionAtom) {
    throw new Error("Auth session store is unavailable");
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("E2E session not recognized after login"));
    }, SESSION_WAIT_MS);

    const unsubscribe = sessionAtom.subscribe((state: SessionAtomState) => {
      if (!isSessionSettled(state)) {
        return;
      }

      clearTimeout(timeout);
      unsubscribe();

      if (isSessionReady(state)) {
        resolve();
        return;
      }

      reject(
        new Error(
          state.error?.message ?? "E2E session not recognized after login",
        ),
      );
    });

    const initial: unknown = sessionAtom.get();
    if (isSessionAtomState(initial) && isSessionReady(initial)) {
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    }
  });
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

  authClient.$store.notify("$sessionSignal");
  await waitForAuthSession();
  await queryClient.invalidateQueries();

  return data;
}
