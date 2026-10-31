import type { AppRouter } from "@flatsby/api";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import type { NetworkState } from "expo-network";
import { AppState } from "react-native";
import * as Application from "expo-application";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  focusManager,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import { shoppingListQueue } from "@flatsby/api/shoppingListQueue";
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

onlineManager.setEventListener((setOnline) => {
  // Not isInternetReachable: Android wants a validated internet path, which a LAN-only server never gives
  const update = ({ isConnected }: NetworkState) =>
    setOnline(isConnected !== false);
  void getNetworkStateAsync().then(update);
  const subscription = addNetworkStateListener(update);
  return () => subscription.remove();
});

const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  ...trpcFailureCaches(reportTRPCFailure),
  defaultOptions: {
    queries: {
      // A collected query drops out of the persisted cache on the next save
      gcTime: CACHE_MAX_AGE,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
          return false;
        }
        return failureCount < 3;
      },
    },
    // Only the shopping list queue waits for the network, other forms keep failing fast offline
    mutations: { networkMode: "always" },
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
    // A paused mutation replays from disk, one in flight may already have reached the server
    persistClient: (client) =>
      queryClient.isMutating({ predicate: (m) => !m.state.isPaused }) > 0 ||
      queryClient.isFetching() > 0
        ? undefined
        : storagePersister.persistClient(client),
  },
  maxAge: CACHE_MAX_AGE,
  dehydrateOptions: {
    // By age, not success: a failed refetch keeps its data, and maxAge only dates the whole save.
    // A shorter gcTime marks a throwaway query, like a search, which stays off disk.
    shouldDehydrateQuery: (query) =>
      query.gcTime >= CACHE_MAX_AGE &&
      query.state.dataUpdatedAt > Date.now() - CACHE_MAX_AGE,
  },
  // New JS can expect a different data shape than the cache it would restore
  buster: Updates.updateId ?? Application.nativeApplicationVersion ?? "",
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

export function clearQueryCache() {
  queryClient.clear();
  // Right after a restore the persister isn't subscribed yet, so the clear wouldn't reach disk
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

const trpcClient = createTRPCClient<AppRouter>({
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
      fetch: (url, options) => fetch(url, { ...options, credentials: "omit" }),
    }),
  ],
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

// Registered before the cache restores, so changes queued before a restart can replay
export const shoppingListMutations = shoppingListQueue({
  queryClient,
  keys: {
    create: trpc.shoppingList.createShoppingListItem.mutationKey(),
    update: trpc.shoppingList.updateShoppingListItem.mutationKey(),
    delete: trpc.shoppingList.deleteShoppingListItem.mutationKey(),
  },
  items: (list) =>
    trpc.shoppingList.getShoppingListItems.infiniteQueryFilter(list),
  refetch: trpc.shoppingList.pathFilter(),
  currentMemberId: ({ groupId, shoppingListId }) => {
    const cached = queryClient.getQueryData(
      trpc.shoppingList.getShoppingList.queryKey({ groupId, shoppingListId }),
    );
    return cached?.success ? cached.data.currentMember.id : null;
  },
  send: {
    create: trpcClient.shoppingList.createShoppingListItem.mutate,
    update: trpcClient.shoppingList.updateShoppingListItem.mutate,
    delete: trpcClient.shoppingList.deleteShoppingListItem.mutate,
  },
});

export type { RouterInputs, RouterOutputs } from "@flatsby/api";
