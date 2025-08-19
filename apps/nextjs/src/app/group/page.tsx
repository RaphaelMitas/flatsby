import React from "react";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { GroupsDashboard } from "./GroupsDashboard";

const GroupsPage: React.FC = () => {
  prefetch(trpc.shoppingList.getUserGroups.queryOptions());
  return (
    <HydrateClient>
      <GroupsDashboard />
    </HydrateClient>
  );
};

export default GroupsPage;
