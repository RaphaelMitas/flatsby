import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { StatisticsContent } from "./_components/statistics-content";

export default async function StatisticsPage() {
  const groupId = await getCurrentGroupId();

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <StatisticsContent />
    </HydrateClient>
  );
}
