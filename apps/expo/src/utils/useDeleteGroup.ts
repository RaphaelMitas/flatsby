import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export function useDeleteGroup() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { selectedGroupId, clearSelectedGroup } = useShoppingStore();
  const groupsQueryKey = trpc.group.getUserGroups.queryKey();

  return useMutation(
    trpc.group.deleteGroup.mutationOptions({
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
      onSuccess: (data) => {
        if (!data.success) Alert.alert(t("common.error"), data.error.message);
      },
      onError: () => {
        Alert.alert(t("common.error"), t("group.delete.failed"));
      },
      // Doubles as the rollback: restoring snapshots breaks when deletes overlap.
      // "all": clearing the selection reruns the tabs layout prefetch before any list observes the query.
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: groupsQueryKey,
          refetchType: "all",
        });
      },
    }),
  );
}
