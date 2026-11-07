import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useCreateGroup(
  onCreated: (groupId: number, name: string) => Promise<void>,
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.group.createGroup.mutationOptions({
      onSuccess: async (data, { name }) => {
        if (data.success) await onCreated(data.data.groupId, name);
      },
      // Awaited: a lost response can hide a created WG, so the form stays locked until the list shows it
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          ),
          queryClient.invalidateQueries(
            trpc.user.getCurrentUserWithGroups.queryOptions(),
          ),
        ]),
    }),
  );
}
