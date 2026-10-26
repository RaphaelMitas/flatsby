"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resultMutation } from "@flatsby/api/resultMutation";

import { useTRPC } from "~/trpc/react";

export function useUpdateGroup(groupId: number) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const groupQuery = trpc.group.getGroup.queryOptions({ id: groupId });

  return useMutation(
    trpc.group.updateGroup.mutationOptions(
      resultMutation({
        onMutate: async ({ id: _id, ...settings }) => {
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
        rollback: ({ previous }) =>
          queryClient.setQueryData(groupQuery.queryKey, previous),
        onSettled: () => {
          void queryClient.invalidateQueries(groupQuery);
          void queryClient.invalidateQueries(
            trpc.user.getCurrentUserWithGroups.queryOptions(),
          );
        },
      }),
    ),
  );
}
