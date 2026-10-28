import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import {
  dehydrate,
  hydrate,
  MutationObserver,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiResult } from "./errors";
import type { ShoppingListInfiniteData } from "./types";
import { shoppingListQueue } from "./shoppingListQueue";

const itemsKey = [
  ["shoppingList", "getShoppingListItems"],
  { input: { groupId: 1, shoppingListId: 7, limit: 50 }, type: "infinite" },
];

const item = (id: number, name: string): ShoppingListItem => ({
  id,
  name,
  categoryId: "dairy",
  createdAt: new Date(),
  completed: false,
  createdByGroupMemberId: 3,
  completedByGroupMemberId: null,
  completedAt: null,
});

const page = (items: ShoppingListItem[]): ShoppingListInfiniteData => ({
  pages: [{ success: true, data: { items } }],
  pageParams: [0],
});

const ok = (id: number): ApiResult<number> => ({ success: true, data: id });

const notFound: ApiResult<number> = {
  success: false,
  error: {
    type: "NotFoundError",
    message: "Item not found",
    name: "NotFoundError",
    details: {},
  },
};

const setup = (send: Parameters<typeof shoppingListQueue>[0]["send"]) => {
  const queryClient = new QueryClient();
  queryClient.mount();
  const queue = shoppingListQueue({
    queryClient,
    keys: {
      create: [["shoppingList", "createShoppingListItem"]],
      update: [["shoppingList", "updateShoppingListItem"]],
      delete: [["shoppingList", "deleteShoppingListItem"]],
    },
    items: (list) => ({
      queryKey: [
        ["shoppingList", "getShoppingListItems"],
        ...(list ? [{ input: list, type: "infinite" }] : []),
      ],
    }),
    refetch: { queryKey: [["shoppingList"]] },
    currentMemberId: () => 3,
    send,
  });
  return { queryClient, queue };
};

const cachedItems = (queryClient: QueryClient) =>
  queryClient
    .getQueryData<ShoppingListInfiniteData>(itemsKey)
    ?.pages.flatMap((p) => (p.success ? p.data.items : []));

const settled = (queryClient: QueryClient) =>
  vi.waitFor(() => expect(queryClient.isMutating()).toBe(0));

afterEach(() => {
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

describe("shoppingListQueue", () => {
  it("replays an item added and ticked offline after a restart, against its real id", async () => {
    onlineManager.setOnline(false);
    const before = setup({
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    });
    before.queryClient.setQueryData(itemsKey, page([]));

    void new MutationObserver(before.queryClient, before.queue.create).mutate({
      groupId: 1,
      shoppingListId: 7,
      name: "Oat milk",
      categoryId: "dairy",
    });
    await vi.waitFor(() =>
      expect(cachedItems(before.queryClient)).toHaveLength(1),
    );
    const [added] = cachedItems(before.queryClient) ?? [];
    if (!added) throw new Error("no optimistic item");
    void new MutationObserver(before.queryClient, before.queue.update).mutate({
      ...added,
      completed: true,
    });
    await vi.waitFor(() => expect(before.queryClient.isMutating()).toBe(2));

    const saved = JSON.parse(JSON.stringify(dehydrate(before.queryClient)));
    before.queryClient.unmount();

    const calls: string[] = [];
    const after = setup({
      create: vi.fn(async () => {
        calls.push("create");
        return ok(42);
      }),
      update: vi.fn(async ({ id }) => {
        calls.push(`update ${id}`);
        return ok(id);
      }),
      delete: vi.fn(),
    });
    hydrate(after.queryClient, saved);
    const invalidate = vi.spyOn(after.queryClient, "invalidateQueries");

    onlineManager.setOnline(true);
    await settled(after.queryClient);

    expect(added.id).toBeLessThan(0);
    expect(calls).toEqual(["create", "update 42"]);
    expect(invalidate).toHaveBeenCalledTimes(1);
    after.queryClient.unmount();
  });

  it("keeps the rest of the queue when the server refuses a tick on a deleted item", async () => {
    onlineManager.setOnline(false);
    const update = vi.fn(async ({ id }: { id: number }) =>
      id === 5 ? notFound : ok(id),
    );
    const { queryClient, queue } = setup({
      create: vi.fn(),
      update,
      delete: vi.fn(),
    });
    queryClient.setQueryData(
      itemsKey,
      page([item(5, "Milk"), item(6, "Eggs")]),
    );
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    for (const id of [5, 6])
      void new MutationObserver(queryClient, queue.update).mutate({
        ...item(id, id === 5 ? "Milk" : "Eggs"),
        completed: true,
      });
    onlineManager.setOnline(true);
    await settled(queryClient);

    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ id: 6 }));
    expect(cachedItems(queryClient)?.find((i) => i.id === 6)?.completed).toBe(
      true,
    );
    expect(invalidate).toHaveBeenCalledTimes(1);
    queryClient.unmount();
  });

  it("applies an edit made under the temporary id after the create has synced", async () => {
    onlineManager.setOnline(false);
    const { queryClient, queue } = setup({
      create: vi.fn(async () => ok(42)),
      update: vi.fn(async ({ id }: { id: number }) => ok(id)),
      delete: vi.fn(),
    });
    queryClient.setQueryData(itemsKey, page([]));
    void new MutationObserver(queryClient, queue.create).mutate({
      groupId: 1,
      shoppingListId: 7,
      name: "Milk",
      categoryId: "dairy",
    });
    await vi.waitFor(() => expect(cachedItems(queryClient)).toHaveLength(1));
    const [added] = cachedItems(queryClient) ?? [];
    if (!added) throw new Error("no optimistic item");
    onlineManager.setOnline(true);
    await settled(queryClient);

    void new MutationObserver(queryClient, queue.update).mutate({
      ...added,
      name: "Oat milk",
    });
    await settled(queryClient);

    expect(cachedItems(queryClient)).toMatchObject([
      { id: 42, name: "Oat milk" },
    ]);
    queryClient.unmount();
  });

  it("never sends the temporary id of an item whose create was refused", async () => {
    onlineManager.setOnline(false);
    const update = vi.fn(async ({ id }: { id: number }) => ok(id));
    const { queryClient, queue } = setup({
      create: vi.fn(async () => notFound),
      update,
      delete: vi.fn(),
    });
    queryClient.setQueryData(itemsKey, page([]));
    void new MutationObserver(queryClient, queue.create).mutate({
      groupId: 1,
      shoppingListId: 7,
      name: "Oat milk",
      categoryId: "dairy",
    });
    await vi.waitFor(() => expect(cachedItems(queryClient)).toHaveLength(1));
    const [added] = cachedItems(queryClient) ?? [];
    if (!added) throw new Error("no optimistic item");
    new MutationObserver(queryClient, queue.update)
      .mutate({ ...added, completed: true })
      .catch(() => undefined);

    onlineManager.setOnline(true);
    await settled(queryClient);

    expect(update).not.toHaveBeenCalled();
    queryClient.unmount();
  });

  it("never sends a change still waiting to retry once sign-out has cleared the cache", async () => {
    vi.useFakeTimers();
    const update = vi.fn(async () => {
      throw new TRPCClientError("Network request failed");
    });
    const { queryClient, queue } = setup({
      create: vi.fn(),
      update,
      delete: vi.fn(),
    });

    new MutationObserver(queryClient, queue.update)
      .mutate({ ...item(5, "Milk"), completed: true })
      .catch(() => undefined);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    queryClient.clear();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(update).toHaveBeenCalledTimes(1);
    queryClient.unmount();
  });
});
