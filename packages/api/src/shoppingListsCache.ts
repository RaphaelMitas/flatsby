import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ApiResult } from "./errors";
import type { ShoppingListSummary } from "./types";
import { optimisticMutation } from "./resultMutation";

type ListsPatch = (lists: ShoppingListSummary[]) => ShoppingListSummary[];

export const applyListsPatch = (
  queryClient: QueryClient,
  listsKey: QueryKey,
  patch: ListsPatch,
) =>
  queryClient.setQueryData<ApiResult<ShoppingListSummary[]>>(listsKey, (old) =>
    old?.success ? { ...old, data: patch(old.data) } : old,
  );

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
  options: {
    onFailure: (message: string | undefined) => void;
    onSuccess?: (data: TData, input: TInput) => void;
  },
) =>
  optimisticMutation<TData, TInput, ShoppingListSummary[]>(
    queryClient,
    listsKey,
    patchFor,
    options,
  );
