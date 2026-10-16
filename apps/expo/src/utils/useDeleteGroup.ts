import type { ApiResult, GroupWithMemberCount } from "@flatsby/api";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

interface Snapshot {
  previousGroups: ApiResult<GroupWithMemberCount[]> | undefined;
  deselected?: { id: number; name: string };
}

export function useDeleteGroup() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const {
    selectedGroupId,
    selectedGroupName,
    setSelectedGroup,
    clearSelectedGroup,
  } = useShoppingStore();
  const groupsQueryKey = trpc.group.getUserGroups.queryKey();

  return useMutation(
    trpc.group.deleteGroup.mutationOptions({
      onMutate: async ({ id }): Promise<Snapshot> => {
        await queryClient.cancelQueries({ queryKey: groupsQueryKey });
        const previousGroups = queryClient.getQueryData(groupsQueryKey);
        queryClient.setQueryData(groupsQueryKey, (old) => {
          if (!old?.success) return old;
          return {
            success: true as const,
            data: old.data.filter((g) => g.id !== id),
          };
        });
        const deselected =
          selectedGroupId === id && selectedGroupName !== null
            ? { id, name: selectedGroupName }
            : undefined;
        if (deselected) clearSelectedGroup();
        return { previousGroups, deselected };
      },
      onSuccess: (data, _variables, context) => {
        if (!data.success) {
          rollback(context);
          Alert.alert(t("common.error"), data.error.message);
        }
      },
      onError: (_error, _variables, context) => {
        rollback(context);
        Alert.alert(t("common.error"), t("group.delete.failed"));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: groupsQueryKey });
      },
    }),
  );

  function rollback(context: Snapshot | undefined) {
    queryClient.setQueryData(groupsQueryKey, context?.previousGroups);
    if (context?.deselected) {
      setSelectedGroup(context.deselected.id, context.deselected.name);
    }
  }
}
