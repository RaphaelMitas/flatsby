import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { trpc } from "~/utils/api";

/**
 * Hook that provides invalidation functions for shopping list queries.
 * This reduces duplicate code across shopping list components.
 */
export function useInvalidateShoppingList({
  groupId,
  shoppingListId,
}: {
  groupId: number;
  shoppingListId: number;
}) {
  const queryClient = useQueryClient();

  const invalidateItems = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: PAGE_SIZE.shoppingListItems,
      }),
    });
  }, [queryClient, groupId, shoppingListId]);

  const invalidateCategoryCounts = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.getCategoryCounts.queryKey({
        groupId,
        shoppingListId,
      }),
    });
  }, [queryClient, groupId, shoppingListId]);

  // The open counts on each list feed the home and the plus
  const invalidateLists = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
    });
  }, [queryClient, groupId]);

  const invalidateSuggestions = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.suggestItems.pathKey(),
      // Refetching now would flash the last word's suggestions over the next
      refetchType: "none",
    });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    void invalidateItems();
    void invalidateCategoryCounts();
    void invalidateLists();
    void invalidateSuggestions();
  }, [
    invalidateItems,
    invalidateCategoryCounts,
    invalidateLists,
    invalidateSuggestions,
  ]);

  return {
    invalidateItems,
    invalidateCategoryCounts,
    invalidateAll,
  };
}
