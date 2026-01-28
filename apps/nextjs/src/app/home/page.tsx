import { redirect } from "next/navigation";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { HomeContent } from "./_components/home-content";

export default async function HomePage() {
  const userDataResult = await caller.user.getCurrentUserWithGroups();

  if (!userDataResult.success) {
    redirect("/auth/login");
  }

  const { user, groups } = userDataResult.data;

  if (groups.length === 0) {
    redirect("/group");
  }

  const groupId = user?.lastGroupUsed?.id ?? groups[0]?.id;

  if (!groupId) {
    redirect("/group");
  }

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.group.getUserGroups.queryOptions());
  prefetch(trpc.user.getCurrentUserWithGroups.queryOptions());
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.stats.getHomeStats.queryOptions({ groupId }));
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <HomeContent />
    </HydrateClient>
  );
}
