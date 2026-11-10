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
  const queryClient = getQueryClient();

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.stats.getHomeStats.queryOptions({ groupId }));
  // Plain useQuery readers would hydrate a promise that resolved after SSR into a mismatch
  await Promise.all([
    queryClient.prefetchQuery(trpc.group.getUserGroups.queryOptions()),
    queryClient.prefetchQuery(
      trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
    ),
  ]);

  return (
    <HydrateClient>
      <HomeContent />
    </HydrateClient>
  );
}
