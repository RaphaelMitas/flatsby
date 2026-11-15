import type { QueryClientConfig } from "@tanstack/react-query";
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = (
  caches?: Pick<QueryClientConfig, "queryCache" | "mutationCache">,
) =>
  new QueryClient({
    ...caches,
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => {
          return false;
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
