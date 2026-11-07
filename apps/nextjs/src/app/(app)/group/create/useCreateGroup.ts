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
      // Also after an error, and awaited: a lost response can hide a WG that was created, and the form must not unlock before the list shows it
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
