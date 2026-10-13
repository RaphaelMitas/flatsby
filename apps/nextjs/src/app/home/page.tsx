import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { HomeContent } from "./_components/home-content";

export default async function HomePage() {
  const groupId = await getCurrentGroupId();

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.group.getUserGroups.queryOptions());
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.stats.getHomeStats.queryOptions({ groupId }));
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <HomeContent />
    </HydrateClient>
  );
}
