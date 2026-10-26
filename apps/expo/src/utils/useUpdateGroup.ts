import { useMutation, useQueryClient } from "@tanstack/react-query";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";

export function useUpdateGroup(groupId: number) {
  const queryClient = useQueryClient();
  const groupQueryKey = trpc.group.getGroup.queryKey({ id: groupId });

  return useMutation(
    trpc.group.updateGroup.mutationOptions(
      resultMutation({
        onMutate: async ({ id: _id, ...settings }) => {
          await queryClient.cancelQueries({ queryKey: groupQueryKey });
          const previousGroup = queryClient.getQueryData(groupQueryKey);
          queryClient.setQueryData(groupQueryKey, (old) => {
            if (!old?.success) return old;
            return {
              success: true as const,
              data: {
                ...old.data,
                ...settings,
              },
            };
          });
          return [{ queryKey: groupQueryKey, previous: previousGroup }];
        },
        rollback: restoreSnapshot(queryClient),
        onSettled: () => {
          void queryClient.invalidateQueries({ queryKey: groupQueryKey });
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          );
        },
      }),
    ),
  );
}
