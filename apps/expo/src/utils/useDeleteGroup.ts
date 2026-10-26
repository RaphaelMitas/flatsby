import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { resultMutation } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export function useDeleteGroup() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { selectedGroupId, clearSelectedGroup } = useShoppingStore();
  const groupsQueryKey = trpc.group.getUserGroups.queryKey();

  return useMutation(
    trpc.group.deleteGroup.mutationOptions(
      resultMutation({
        onMutate: async ({ id }) => {
          await queryClient.cancelQueries({ queryKey: groupsQueryKey });
          queryClient.setQueryData(groupsQueryKey, (old) => {
            if (!old?.success) return old;
            return {
              success: true as const,
              data: old.data.filter((g) => g.id !== id),
            };
          });
          if (selectedGroupId === id) clearSelectedGroup();
        },
        onFailure: (message) =>
          Alert.alert(t("common.error"), message ?? t("group.delete.failed")),
        // Doubles as the rollback: restoring snapshots breaks when deletes overlap
        onSettled: () => {
          void queryClient.invalidateQueries({ queryKey: groupsQueryKey });
        },
      }),
    ),
  );
}
