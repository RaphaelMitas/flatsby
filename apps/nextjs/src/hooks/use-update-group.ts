"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useUpdateGroup(groupId: number) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const groupQuery = trpc.group.getGroup.queryOptions({ id: groupId });

  return useMutation(
    trpc.group.updateGroup.mutationOptions({
      onMutate: async ({
        id: _id,
        onlyIfUndecided: _onlyIfUndecided,
        ...settings
      }) => {
        await queryClient.cancelQueries(groupQuery);
        const previous = queryClient.getQueryData(groupQuery.queryKey);
        queryClient.setQueryData(groupQuery.queryKey, (old) =>
          old?.success
            ? {
                success: true as const,
                data: {
                  ...old.data,
                  ...settings,
                },
              }
            : old,
        );
        return { previous };
      },
      onSuccess: (data, _input, context) => {
        if (!data.success) {
          queryClient.setQueryData(groupQuery.queryKey, context.previous);
        }
      },
      onError: (_error, _input, context) => {
        queryClient.setQueryData(groupQuery.queryKey, context?.previous);
      },
      onSettled: () => {
        void queryClient.invalidateQueries(groupQuery);
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
    }),
  );
}
