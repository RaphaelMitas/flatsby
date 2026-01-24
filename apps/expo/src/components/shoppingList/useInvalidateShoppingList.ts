import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
        limit: 20,
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
