import { useQuery } from "@tanstack/react-query";

import { PENDING_ID } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export function useSelectedGroup() {
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const { data } = useQuery(trpc.group.getUserGroups.queryOptions());
  const groups = (data?.success ? data.data : []).filter(
    ({ id }) => id !== PENDING_ID,
  );
  const group = groups.find(({ id }) => id === selectedGroupId);
  return { groups, group, name: group?.name ?? selectedGroupName };
}
