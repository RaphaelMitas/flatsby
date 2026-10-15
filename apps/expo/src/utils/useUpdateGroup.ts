import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export function useUpdateGroup(groupId: number) {
  const queryClient = useQueryClient();
  const groupQueryKey = trpc.group.getGroup.queryKey({ id: groupId });

  return useMutation(
    trpc.group.updateGroup.mutationOptions({
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
        return { previousGroup };
      },
      onSuccess: (data, _variables, context) => {
        if (!data.success) {
          queryClient.setQueryData(groupQueryKey, context.previousGroup);
        }
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(groupQueryKey, context?.previousGroup);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: groupQueryKey });
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
      },
    }),
  );
}
