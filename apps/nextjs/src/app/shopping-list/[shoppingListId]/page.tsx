import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import ShoppingList from "./ShoppingList";

interface ShoppingListDetailPageProps {
  params: Promise<{ shoppingListId: string }>;
}

export default async function ShoppingListDetailPage({
  params,
}: ShoppingListDetailPageProps) {
  const { shoppingListId: shoppingListIdStr } = await params;
  const shoppingListId = parseInt(shoppingListIdStr);

  // Get current group from user's lastGroupUsed
  const userWithGroups = await caller.user.getCurrentUserWithGroups();

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
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
      groupId,
      shoppingListId,
      limit: 20,
    }),
  );

  // Update last used shopping list
  try {
    await caller.shoppingList.updateLastUsed({
      groupId,
      shoppingListId,
    });
  } catch (error) {
    console.error(error);
  }

  return (
    <HydrateClient>
      <div className="mx-auto flex h-full w-full max-w-prose flex-col overflow-hidden pt-4">
        <ShoppingList shoppingListId={shoppingListId} />
      </div>
    </HydrateClient>
  );
}
