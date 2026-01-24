import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

/**
 * Hook that provides invalidation functions for shopping list queries.
 * This reduces duplicate code across shopping list components.
 */
export function useShoppingListInvalidation(
  groupId: number,
  shoppingListId: number,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidateItems = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: 20,
      }),
    });
  }, [queryClient, trpc, groupId, shoppingListId]);

  const invalidateCategoryCounts = useCallback(() => {
    return queryClient.invalidateQueries({
      queryKey: trpc.shoppingList.getCategoryCounts.queryKey({
        groupId,
        shoppingListId,
      }),
    });
  }, [queryClient, trpc, groupId, shoppingListId]);

  const invalidateAll = useCallback(() => {
    void invalidateItems();
    void invalidateCategoryCounts();
  }, [invalidateItems, invalidateCategoryCounts]);

  return {
    invalidateItems,
    invalidateCategoryCounts,
    invalidateAll,
  };
}
