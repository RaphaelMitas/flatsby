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
import { z } from "zod/v4";

import type { ApiResult } from "./errors";
import type { ShoppingListInfiniteData } from "./types";
import { resultMutation } from "./resultMutation";
import {
  addShoppingListItemToCache,
  removeShoppingListItemFromCache,
  updateShoppingListItemInCache,
} from "./shoppingListItemsCache";
import { neverAnswered } from "./trpcFailure";

type CreateInput = z.infer<typeof createShoppingListItemSchema>;
type UpdateInput = z.infer<typeof updateShoppingListItemSchema>;
type DeleteInput = z.infer<typeof deleteShoppingListItemSchema>;

interface ShoppingListQueueOptions {
  queryClient: QueryClient;
  keys: { create: MutationKey; update: MutationKey; delete: MutationKey };
  /** Every cached items query, whatever list or category it shows */
  items: QueryFilters;
  /** What to refetch once the queue is empty */
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

// A tRPC query key is [path, { input, type }]
const itemsKeySchema = z.tuple([
  z.unknown(),
  z.object({ input: z.object({ shoppingListId: z.number() }) }),
]);

export const inShoppingListQueue = (mutation: Mutation) =>
  mutation.options.scope?.id === QUEUE_SCOPE;

/**
 * Item changes run one at a time in the order they were made, wait for the
 * network, and replay after a restart from the defaults registered here.
 */
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

  // A temporary id only reaches the server once the create ahead of it in the queue has synced
  const realId = (id: number) =>
    queryClient.getQueryData<Record<number, number>>(TEMPORARY_IDS_KEY)?.[id] ??
    id;

  const patchItems = async (
    patch: (
      data: ShoppingListInfiniteData | undefined,
      key: QueryKey,
    ) => ShoppingListInfiniteData | undefined,
  ) => {
    await queryClient.cancelQueries(items);
    for (const [
      key,
      data,
    ] of queryClient.getQueriesData<ShoppingListInfiniteData>(items))
      queryClient.setQueryData(key, patch(data, key));
  };

  // Refetching between queued changes would show the server without the rest of the queue
  const onSettled = () => {
    if (queryClient.isMutating({ predicate: inShoppingListQueue }) > 1) return;
    void queryClient.invalidateQueries(refetch);
  };

  const create = {
    ...queued,
    mutationKey: keys.create,
    mutationFn: send.create,
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
        // Every category filter too, the server may still pick another category
        await patchItems((data, key) =>
          itemsKeySchema.safeParse(key).data?.[1].input.shoppingListId ===
          input.shoppingListId
            ? addShoppingListItemToCache(data, item)
            : data,
        );
        return id;
      },
      onSuccess: (id: number, _input: CreateInput, temporaryId: number) =>
        queryClient.setQueryData<Record<number, number>>(
          TEMPORARY_IDS_KEY,
          (ids) => ({ ...ids, [temporaryId]: id }),
        ),
      onSettled,
    }),
  };

  const update = {
    ...queued,
    mutationKey: keys.update,
    mutationFn: (input: UpdateInput) =>
      send.update({ ...input, id: realId(input.id) }),
    ...resultMutation({
      onMutate: (input: UpdateInput) =>
        patchItems((data) => updateShoppingListItemInCache(data, input)),
      onSettled,
    }),
  };

  const remove = {
    ...queued,
    mutationKey: keys.delete,
    mutationFn: (input: DeleteInput) => send.delete({ id: realId(input.id) }),
    ...resultMutation({
      onMutate: (input: DeleteInput) =>
        patchItems((data) => removeShoppingListItemFromCache(data, input.id)),
      onSettled,
    }),
  };

  queryClient.setMutationDefaults(create.mutationKey, create);
  queryClient.setMutationDefaults(update.mutationKey, update);
  queryClient.setMutationDefaults(remove.mutationKey, remove);

  return { create, update, delete: remove };
};
