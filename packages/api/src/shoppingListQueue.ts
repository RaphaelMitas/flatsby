import type { CategoryId } from "@flatsby/validators/categories";
import type {
  createShoppingListItemSchema,
  deleteShoppingListItemSchema,
  ShoppingListItem,
  updateShoppingListItemSchema,
} from "@flatsby/validators/shopping-list";
import type {
  Mutation,
  MutationKey,
  MutationOptions,
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";
import type { z } from "zod/v4";

import type { ApiResult } from "./errors";
import type { ShoppingListInfiniteData } from "./types";
import { resultMutation } from "./resultMutation";
import {
  addShoppingListItemToCache,
  removeShoppingListItemFromCache,
  replaceShoppingListItemIdInCache,
  updateShoppingListItemInCache,
} from "./shoppingListItemsCache";
import { neverAnswered } from "./trpcFailure";

type CreateInput = z.infer<typeof createShoppingListItemSchema>;
type UpdateInput = z.infer<typeof updateShoppingListItemSchema>;
type DeleteInput = z.infer<typeof deleteShoppingListItemSchema>;

interface ShoppingListQueueOptions {
  queryClient: QueryClient;
  keys: { create: MutationKey; update: MutationKey; delete: MutationKey };
  items: (list?: {
    shoppingListId: number;
    categoryId?: CategoryId;
  }) => QueryFilters;
  refetch: QueryFilters;
  currentMemberId: (list: {
    groupId: number;
    shoppingListId: number;
  }) => number | null;
  send: {
    create: (input: CreateInput) => Promise<ApiResult<number>>;
    update: (input: UpdateInput) => Promise<ApiResult<number>>;
    delete: (input: DeleteInput) => Promise<ApiResult<number>>;
  };
}

const QUEUE_SCOPE = "shopping-list-items";

// Lives in the query cache so it reaches disk in the same save that drops the synced create
const TEMPORARY_IDS_KEY: QueryKey = ["shopping-list-temporary-ids"];

export const inShoppingListQueue = (mutation: Mutation) =>
  mutation.options.scope?.id === QUEUE_SCOPE;

export const shoppingListQueue = ({
  queryClient,
  keys,
  items,
  refetch,
  currentMemberId,
  send,
}: ShoppingListQueueOptions) => {
  const queued = {
    scope: { id: QUEUE_SCOPE },
    networkMode: "online",
    retry: (_failureCount: number, error: unknown) => neverAnswered(error),
  } satisfies Pick<MutationOptions, "scope" | "networkMode" | "retry">;

  // clear() on sign-out leaves a waiting retry running, and it would send with the next account's cookie
  const whileQueued =
    <TInput>(request: (input: TInput) => Promise<ApiResult<number>>) =>
    (input: TInput) =>
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.state.variables === input)
        ? request(input)
        : Promise.reject(new Error("Dropped from the shopping list queue"));

  // The queue runs the create first, so its real id is mapped by the time a later change sends
  const realId = (id: number) =>
    queryClient.getQueryData<Record<number, number>>(TEMPORARY_IDS_KEY)?.[id] ??
    id;

  const patchItems = async (
    filters: QueryFilters,
    patch: (
      data: ShoppingListInfiniteData | undefined,
    ) => ShoppingListInfiniteData | undefined,
  ) => {
    await queryClient.cancelQueries(filters);
    queryClient.setQueriesData<ShoppingListInfiniteData>(filters, patch);
  };

  // Refetching between queued changes would show the server without the rest of the queue
  const onSettled = () => {
    if (queryClient.isMutating({ predicate: inShoppingListQueue }) > 1) return;
    void queryClient.invalidateQueries(refetch);
  };

  const create = {
    ...queued,
    mutationKey: keys.create,
    mutationFn: whileQueued(send.create),
    ...resultMutation({
      onMutate: async (input: CreateInput) => {
        // Negative so it never collides with a real id
        const id = -Date.now();
        const item: ShoppingListItem = {
          id,
          name: input.name,
          categoryId: input.categoryId,
          createdAt: new Date(),
          completed: false,
          createdByGroupMemberId: currentMemberId(input),
          completedByGroupMemberId: null,
          completedAt: null,
          isPending: true,
        };
        const { shoppingListId, categoryId } = input;
        const add = (data: ShoppingListInfiniteData | undefined) =>
          addShoppingListItemToCache(data, item);
        // An auto-selected category is only known once the server answers
        if (categoryId === "ai-auto-select")
          await patchItems(items({ shoppingListId }), add);
        else {
          await patchItems(
            items({ shoppingListId, categoryId: undefined }),
            add,
          );
          await patchItems(items({ shoppingListId, categoryId }), add);
        }
        return id;
      },
      onSuccess: (id: number, _input: CreateInput, temporaryId: number) => {
        queryClient.setQueryData<Record<number, number>>(
          TEMPORARY_IDS_KEY,
          (ids) => ({ ...ids, [temporaryId]: id }),
        );
        queryClient.setQueriesData<ShoppingListInfiniteData>(items(), (data) =>
          replaceShoppingListItemIdInCache(data, temporaryId, id),
        );
      },
      onSettled,
    }),
  };

  const update = {
    ...queued,
    mutationKey: keys.update,
    mutationFn: whileQueued((input: UpdateInput) =>
      send.update({ ...input, id: realId(input.id) }),
    ),
    // An edit form opened before the create synced still holds the temporary id
    onMutate: (input: UpdateInput) =>
      patchItems(items(), (data) =>
        updateShoppingListItemInCache(data, { ...input, id: realId(input.id) }),
      ),
    onSettled,
  };

  const remove = {
    ...queued,
    mutationKey: keys.delete,
    mutationFn: whileQueued((input: DeleteInput) =>
      send.delete({ id: realId(input.id) }),
    ),
    onMutate: (input: DeleteInput) =>
      patchItems(items(), (data) =>
        removeShoppingListItemFromCache(data, realId(input.id)),
      ),
    onSettled,
  };

  queryClient.setMutationDefaults(create.mutationKey, create);
  queryClient.setMutationDefaults(update.mutationKey, update);
  queryClient.setMutationDefaults(remove.mutationKey, remove);

  return { create, update, delete: remove };
};
