import {
  getCurrentGroupId,
  getQueryClient,
  HydrateClient,
  trpc,
} from "~/trpc/server";
import { GroupSettingsContent } from "./GroupSettingsContent";

export default async function GroupSettingsPage() {
  const groupId = await getCurrentGroupId();
  await getQueryClient().prefetchQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  return (
    <HydrateClient>
      <GroupSettingsContent />
    </HydrateClient>
  );
}
