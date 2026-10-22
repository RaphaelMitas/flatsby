import type { AppRouter } from "@flatsby/api";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { AppState } from "react-native";
import { focusManager, QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  loggerLink,
  TRPCClientError,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import { authClient } from "./auth/auth-client";
import { getBaseUrl } from "./base-url";
import { languageTags } from "./intl-provider";

function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const data: unknown = error.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "UNAUTHORIZED"
  );
}

// React Native has no window focus; coming back to the app refetches what's on screen, so housemates' changes show up
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) =>
    setFocused(state === "active"),
  );
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// biome-ignore lint/suspicious/noExplicitAny: generic constraint must accept any query options shape
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // biome-ignore lint/suspicious/noExplicitAny: infinite query options are not statically distinguishable here
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}

/**
 * Get headers for tRPC requests
 */
async function getHeaders() {
  const headers = new Map<string, string>();
  headers.set("x-trpc-source", "expo-react");
  headers.set("Accept-Language", languageTags().join(","));

  const cookies = await authClient.getCookie();
  if (cookies) {
    headers.set("Cookie", cookies);
  }
  return headers;
}

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
        colorMode: "ansi",
      }),
      httpBatchLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        headers: getHeaders,
        // iOS would append its own stored cookies to the Cookie header from getHeaders
        fetch: (url, options) =>
          fetch(url, { ...options, credentials: "omit" }),
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@flatsby/api";
