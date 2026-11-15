import type { AppRouter } from "@flatsby/api";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import type { Operation } from "@trpc/client";
import type { TRPCQueryOptions } from "@trpc/tanstack-react-query";
import type { NetworkState } from "expo-network";
import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
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

import { consentedSessionId } from "./analytics/posthog";
import { authClient } from "./auth/auth-client";
import { getBaseUrl } from "./base-url";
import { languageTags } from "./intl-provider";
import { reportTRPCFailure } from "./report-trpc-error";

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) =>
    setFocused(state === "active"),
  );
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
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
      gcTime: CACHE_MAX_AGE,
      retry: (failureCount, error) => {
        if (isUnauthorizedError(error)) {
          return false;
        }
        return failureCount < 3;
      },
    },
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
    persistClient: (client) =>
      queryClient.isMutating({ predicate: (m) => !m.state.isPaused }) > 0 ||
      queryClient.isFetching() > 0
        ? undefined
        : storagePersister.persistClient(client),
  },
  maxAge: CACHE_MAX_AGE,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.gcTime >= CACHE_MAX_AGE &&
      query.state.dataUpdatedAt > Date.now() - CACHE_MAX_AGE,
  },
  buster: Updates.updateId ?? Application.nativeApplicationVersion ?? "",
} satisfies Omit<PersistQueryClientOptions, "queryClient">;

export function clearQueryCache() {
  queryClient.clear();
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

async function getHeaders({ opList }: { opList: readonly Operation[] }) {
  const headers = new Map<string, string>();
  headers.set("x-trpc-source", "expo-react");
  headers.set("Accept-Language", languageTags().join(","));
  headers.set(
    "x-os-name",
    Platform.OS === "android" ? "Android" : (Device.osName ?? "iOS"),
  );
  headers.set("x-app-version", Application.nativeApplicationVersion ?? "");
  headers.set("x-app-build", Application.nativeBuildVersion ?? "");
  headers.set("x-expo-update-id", Updates.updateId ?? "");
  if (opList.some((op) => op.type === "mutation")) {
    const sessionId = consentedSessionId();
    if (sessionId) headers.set("x-posthog-session-id", sessionId);
  }

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
      fetch: (url, options) => fetch(url, { ...options, credentials: "omit" }),
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

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
