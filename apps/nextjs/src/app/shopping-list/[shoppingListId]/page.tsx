import { redirect } from "next/navigation";

import { PAGE_SIZE } from "@flatsby/validators/pagination";

import {
  caller,
  getCurrentUserWithGroups,
  getQueryClient,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import ShoppingList from "./ShoppingList";

interface ShoppingListDetailPageProps {
  params: Promise<{ shoppingListId: string }>;
}

export default async function ShoppingListDetailPage({
  params,
}: ShoppingListDetailPageProps) {
  const { shoppingListId: shoppingListIdStr } = await params;
  const shoppingListId = parseInt(shoppingListIdStr, 10);

  // Get current group from user's lastGroupUsed
  const userWithGroups = await getCurrentUserWithGroups();

  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    redirect("/group");
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch data
  prefetch(
    trpc.shoppingList.getShoppingList.queryOptions({
      groupId,
      shoppingListId,
    }),
  );
  prefetch(
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
      {
        groupId,
        shoppingListId,
        limit: PAGE_SIZE.shoppingListItems,
      },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  // Update last used shopping list only if it changed
  const currentShoppingListId =
    userWithGroups.data.user.lastShoppingListUsed?.id;
  if (currentShoppingListId !== shoppingListId) {
    try {
      await caller.shoppingList.updateLastUsed({
        groupId,
        shoppingListId,
      });
      await getQueryClient().refetchQueries({
        queryKey: trpc.user.getCurrentUserWithGroups.queryKey(),
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <HydrateClient>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden pt-4">
        <ShoppingList shoppingListId={shoppingListId} />
      </div>
    </HydrateClient>
  );
}
