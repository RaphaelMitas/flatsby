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
      onMutate: ({ id }) => {
        void queryClient.cancelQueries({ queryKey: groupsQueryKey });
        const previousGroups = queryClient.getQueryData(groupsQueryKey);
        queryClient.setQueryData(groupsQueryKey, (old) => {
          if (!old?.success) return old;
          return {
            success: true as const,
            data: old.data.filter((g) => g.id !== id),
          };
        });
        if (selectedGroupId === id) {
          clearSelectedGroup();
        }
        return { previousGroups };
      },
      onSuccess: (data, _variables, context) => {
        if (!data.success) {
          queryClient.setQueryData(groupsQueryKey, context.previousGroups);
          Alert.alert(t("common.error"), data.error.message);
          return;
        }
        void queryClient.invalidateQueries({ queryKey: groupsQueryKey });
      },
      onError: (_error, _variables, context) => {
        queryClient.setQueryData(groupsQueryKey, context?.previousGroups);
        Alert.alert(t("common.error"), t("group.delete.failed"));
      },
    }),
  );
}
