import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import { getLocales } from "expo-localization";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  PENDING_ID,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export const deviceCurrency = (): CurrencyCode => {
  const code = getLocales()[0]?.currencyCode;
  return code && isCurrencyCode(code) ? code : "EUR";
};

export function useCreateGroup(onCreated: (groupId: number) => void) {
  const queryClient = useQueryClient();
  const { setSelectedGroup } = useShoppingStore();

  return useMutation(
    trpc.group.createGroup.mutationOptions(
      resultMutation({
        onMutate: ({ name }) => {
          void queryClient.cancelQueries(
            trpc.group.getUserGroups.queryOptions(),
          );

          const previousGroups = queryClient.getQueryData(
            trpc.group.getUserGroups.queryKey(),
          );

          const newGroup = {
            id: PENDING_ID,
            name: name,
            createdAt: new Date(),
            profilePicture: null,
            memberCount: 1,
          };

          queryClient.setQueryData(
            trpc.group.getUserGroups.queryKey(),
            (old) => {
              if (!old?.success) return old;
              return {
                success: true as const,
                data: [...old.data, newGroup],
              };
            },
          );

          return [
            {
              queryKey: trpc.group.getUserGroups.queryKey(),
              previous: previousGroups,
            },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        // What comes next needs the real group id, so navigation waits for it
        onSuccess: ({ groupId }, { name }) => {
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          );
          void queryClient.invalidateQueries(
            trpc.user.getCurrentUserWithGroups.queryOptions(),
          );
          setSelectedGroup(groupId, name);
          onCreated(groupId);
        },
      }),
    ),
  );
}
