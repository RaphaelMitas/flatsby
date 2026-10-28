import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { OptimisticOptions } from "./resultMutation";
import type { ShoppingListSummary } from "./types";
import { optimisticMutation } from "./resultMutation";

type ListsPatch = (lists: ShoppingListSummary[]) => ShoppingListSummary[];

export const shoppingListsPatches = {
  added:
    ({ id, name }: { id: number; name: string }): ListsPatch =>
    (lists) => [
      ...lists.filter((list) => list.id !== id),
      { id, name, uncheckedItemLength: 0, description: null, icon: null },
    ],
  rename:
    ({
      shoppingListId,
      name,
    }: {
      shoppingListId: number;
      name: string;
    }): ListsPatch =>
    (lists) =>
      lists.map((list) =>
        list.id === shoppingListId ? { ...list, name } : list,
      ),
  remove:
    ({ shoppingListId }: { shoppingListId: number }): ListsPatch =>
    (lists) =>
      lists.filter((list) => list.id !== shoppingListId),
};

export const shoppingListsMutation = <TData, TInput>(
  queryClient: QueryClient,
  listsKey: QueryKey,
  patchFor: (input: TInput) => ListsPatch,
  options: OptimisticOptions<TData, TInput>,
) =>
  optimisticMutation<TData, TInput, ShoppingListSummary[]>(
    queryClient,
    listsKey,
    patchFor,
    options,
  );
