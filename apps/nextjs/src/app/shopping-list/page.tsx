import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ShoppingListDashboard } from "./ShoppingListDashboard";

export default async function ShoppingListPage() {
  // Get current group from user's lastGroupUsed
  const userWithGroups = await caller.user.getCurrentUserWithGroups();

  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    redirect("/group");
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch shopping lists for the current group
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="mx-auto mt-4 flex w-full max-w-prose flex-col p-4">
        <ShoppingListDashboard />
      </div>
    </HydrateClient>
  );
}
