import {
  getCurrentGroupId,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { GroupSettingsContent } from "./GroupSettingsContent";

export default async function GroupSettingsPage() {
  const groupId = await getCurrentGroupId();
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <GroupSettingsContent />
    </HydrateClient>
  );
}
