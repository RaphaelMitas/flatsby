import {
  getCurrentUserWithGroups,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { GroupsDashboard } from "./GroupsDashboard";

export default async function GroupsPage() {
  await getCurrentUserWithGroups();
  prefetch(trpc.group.getUserGroups.queryOptions());
  return (
    <HydrateClient>
      <GroupsDashboard />
    </HydrateClient>
  );
}
