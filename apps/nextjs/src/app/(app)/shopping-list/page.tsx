import { redirect } from "next/navigation";

import {
  caller,
  getCurrentGroupId,
  getCurrentUserWithGroups,
} from "~/trpc/server";
import { FirstList } from "./FirstList";

export default async function ShoppingListPage() {
  const groupId = await getCurrentGroupId();
  const [lists, userWithGroups] = await Promise.all([
    caller.shoppingList.getShoppingLists({ groupId }),
    getCurrentUserWithGroups(),
  ]);
  if (!lists.success) return null;

  const user = userWithGroups.success ? userWithGroups.data.user : undefined;
  const lastUsedId = user?.lastShoppingListUsed?.id;
  const target =
    lists.data.find(({ id }) => id === lastUsedId) ?? lists.data[0];
  if (target) redirect(`/shopping-list/${target.id}`);

  return (
    <div className="mt-8 flex w-full flex-col">
      <FirstList
        groupId={groupId}
        groupName={user?.lastGroupUsed?.name ?? ""}
      />
    </div>
  );
}
