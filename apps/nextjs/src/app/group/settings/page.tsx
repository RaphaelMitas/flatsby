import {
  getCurrentUserWithGroups,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { GroupSettingsContent } from "./GroupSettingsContent";

export default async function GroupSettingsPage() {
  const userWithGroups = await getCurrentUserWithGroups();
  const groupId = userWithGroups.success
    ? userWithGroups.data.user?.lastGroupUsed?.id
    : undefined;

  if (groupId) {
    prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  }

  return (
    <HydrateClient>
      <GroupSettingsContent />
    </HydrateClient>
  );
}
