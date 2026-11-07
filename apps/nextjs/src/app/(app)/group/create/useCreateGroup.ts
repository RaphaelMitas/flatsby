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
        if (!data.success) return;
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        await onCreated(data.data.groupId, name);
      },
    }),
  );
}
