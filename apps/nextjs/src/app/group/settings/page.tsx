import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import DangerZone from "./DangerZone";
import GroupDetails from "./GroupDetails";
import ManageMembers from "./ManageMembers";

export default async function GroupSettingsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    redirect("/group");
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <div className="flex h-full flex-col p-4 md:pt-16">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-2 lg:grid-cols-[1fr]">
          <div className="mx-auto grid w-full max-w-6xl gap-2">
            <h1 className="text-center text-3xl font-semibold">
              Group Settings
            </h1>
          </div>
          <div className="grid gap-6"></div>
          <GroupDetails />
          <ManageMembers />
          <DangerZone />
        </div>
      </div>
    </HydrateClient>
  );
}
