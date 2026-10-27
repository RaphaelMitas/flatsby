import type { AppRouter } from "@flatsby/api";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { AppState } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  defaultShouldDehydrateQuery,
  focusManager,
  QueryClient,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import {
  isUnauthorizedError,
  trpcFailureCaches,
} from "@flatsby/api/trpcFailure";

import { authClient } from "./auth/auth-client";
import { getBaseUrl } from "./base-url";
import { languageTags } from "./intl-provider";
import { reportTRPCFailure } from "./report-trpc-error";

// React Native has no window focus; coming back to the app refetches what's on screen, so housemates' changes show up
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) =>
    setFocused(state === "active"),
  );
  return () => subscription.remove();
});

// Also the gcTime: a collected query drops out of the persisted cache on the next save
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  ...trpcFailureCaches(reportTRPCFailure),
  defaultOptions: {
    queries: {
      gcTime: CACHE_MAX_AGE,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const storagePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  serialize: superjson.stringify,
  deserialize: superjson.parse,
});

export const persistOptions = {
  persister: {
    ...storagePersister,
    // Until mutations and their refetches settle, the cache can hold optimistic writes
    persistClient: (client) =>
      queryClient.isMutating() > 0 || queryClient.isFetching() > 0
        ? undefined
        : storagePersister.persistClient(client),
  },
  maxAge: CACHE_MAX_AGE,
  // maxAge only dates the whole save, so without this a query viewed once stays forever
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) &&
      query.state.dataUpdatedAt > Date.now() - CACHE_MAX_AGE,
  },
  // New JS can expect a different data shape than the cache it would restore
  buster: Updates.updateId ?? Application.nativeApplicationVersion ?? "",
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

export function clearQueryCache() {
  queryClient.clear();
  // Before the restore finishes the persister isn't subscribed, so the clear wouldn't reach disk
  void storagePersister.removeClient();
}

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
        enabled: () => process.env.NODE_ENV === "development",
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
