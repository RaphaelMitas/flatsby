// Polyfill for streaming support in React Native
import "react-native-polyfill-globals/auto";

import type { AppRouter } from "@flatsby/api";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { QueryClient } from "@tanstack/react-query";
import {
  createTRPCClient,
  httpBatchLink,
  httpBatchStreamLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import { authClient } from "./auth/auth-client";
import { getBaseUrl } from "./base-url";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ...
    },
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  if (queryOptions.queryKey[1]?.type === "infinite") {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
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

export { type RouterInputs, type RouterOutputs } from "@flatsby/api";
