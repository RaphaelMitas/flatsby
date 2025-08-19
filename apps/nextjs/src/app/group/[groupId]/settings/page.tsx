import React from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import DangerZone from "./DangerZone";
import GroupDetails from "./GroupDetails";
import ManageMembers from "./ManageMembers";

export default async function Page(props: {
  params: Promise<{ groupId: string }>;
}) {
  const params = await props.params;
  prefetch(
    trpc.shoppingList.getGroup.queryOptions({
      groupId: parseInt(params.groupId),
    }),
  );
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
          <GroupDetails groupId={parseInt(params.groupId)} />
          <ManageMembers groupId={parseInt(params.groupId)} />
          <DangerZone groupId={parseInt(params.groupId)} />
        </div>
      </div>
    </HydrateClient>
  );
}
