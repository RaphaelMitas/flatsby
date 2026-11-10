import {
  getCurrentGroupId,
  getQueryClient,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { HomeContent } from "./_components/home-content";

export default async function HomePage() {
  const groupId = await getCurrentGroupId();

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.stats.getHomeStats.queryOptions({ groupId }));
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));
  // GroupHeader reads this with plain useQuery, which renders a streamed promise as data only on the client
  await getQueryClient().prefetchQuery(trpc.group.getUserGroups.queryOptions());

  return (
    <HydrateClient>
      <HomeContent />
    </HydrateClient>
  );
}
