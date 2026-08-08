import type { AppRouter } from "@flatsby/api";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { fetch as expoFetch } from "expo/fetch";
import { QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpBatchStreamLink,
  loggerLink,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import { authClient } from "./auth/auth-client";
import { getBaseUrl } from "./base-url";
import { getE2EBypassHeaders } from "./e2e";

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
function getHeaders() {
  const headers = new Map<string, string>();
  headers.set("x-trpc-source", "expo-react");

  const cookies = authClient.getCookie();
  if (cookies) {
    headers.set("Cookie", cookies);
  }

  for (const [key, value] of Object.entries(getE2EBypassHeaders())) {
    headers.set(key, value);
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
      // Use splitLink to route chat streaming procedures through httpBatchStreamLink
      splitLink({
        condition: (op) => op.path.startsWith("chat.send"),
        true: httpBatchStreamLink({
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc`,
          headers: getHeaders,
          // Use expo/fetch for proper streaming support in React Native
          fetch: expoFetch,
        }),
        false: httpBatchLink({
          transformer: superjson,
          url: `${getBaseUrl()}/api/trpc`,
          headers: getHeaders,
        }),
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from "@flatsby/api";
