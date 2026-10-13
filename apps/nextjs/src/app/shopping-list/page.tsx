import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { ShoppingListDashboard } from "./ShoppingListDashboard";

export default async function ShoppingListPage() {
  const groupId = await getCurrentGroupId();

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
