import type { QueryClient, QueryKey } from "@tanstack/react-query";

import type { ApiResult } from "./errors";
import type { ShoppingListSummary } from "./types";
import { PENDING_ID, restoreSnapshot, resultMutation } from "./resultMutation";

type ListsPatch = (lists: ShoppingListSummary[]) => ShoppingListSummary[];

export const applyListsPatch = (
  queryClient: QueryClient,
  listsKey: QueryKey,
  patch: ListsPatch,
) =>
  queryClient.setQueryData<ApiResult<ShoppingListSummary[]>>(listsKey, (old) =>
    old?.success ? { ...old, data: patch(old.data) } : old,
  );

/** The optimistic side of each list mutation, shared by both clients. */
export const shoppingListsPatches = {
  create:
    ({ name }: { name: string }): ListsPatch =>
    (lists) => [
      ...lists,
      {
        id: PENDING_ID,
        name,
        uncheckedItemLength: 0,
        description: null,
        icon: null,
      },
    ],
  saved:
    ({ shoppingListId }: { shoppingListId: number }): ListsPatch =>
    (lists) =>
      lists.map((list) =>
        list.id === PENDING_ID ? { ...list, id: shoppingListId } : list,
      ),
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
  {
    onFailure,
    onSuccess,
  }: {
    onFailure: (message: string | undefined) => void;
    onSuccess?: (data: TData, input: TInput) => void;
  },
) =>
  resultMutation({
    onMutate: async (input: TInput) => {
      await queryClient.cancelQueries({ queryKey: listsKey });
      const previous = queryClient.getQueryData(listsKey);
      applyListsPatch(queryClient, listsKey, patchFor(input));
      return [{ queryKey: listsKey, previous }];
    },
    rollback: restoreSnapshot(queryClient),
    onFailure,
    onSuccess: (data: TData, input: TInput) => {
      onSuccess?.(data, input);
      void queryClient.invalidateQueries({ queryKey: listsKey });
    },
  });
