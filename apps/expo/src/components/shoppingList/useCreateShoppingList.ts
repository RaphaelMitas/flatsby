import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export function useCreateShoppingList(groupId: number) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { setSelectedShoppingList } = useShoppingStore();
  const listsQuery = trpc.shoppingList.getShoppingLists.queryOptions({
    groupId,
  });

  return useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions(
      resultMutation({
        onMutate: (data) => {
          void queryClient.cancelQueries(listsQuery);
          const previous = queryClient.getQueryData(listsQuery.queryKey);
          queryClient.setQueryData(listsQuery.queryKey, (old) => {
            if (!old?.success) return old;
            return {
              success: true as const,
              data: [
                ...old.data,
                {
                  ...data,
                  id: -1,
                  uncheckedItemLength: 0,
                  description: null,
                  icon: null,
                },
              ],
            };
          });
          return [{ queryKey: listsQuery.queryKey, previous }];
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          Alert.alert(
            t("common.error"),
            message ?? t("shoppingList.createFailed"),
          ),
        // Opening the list needs its real id, so selection waits for the server
        onSuccess: ({ shoppingListId }, { name }) => {
          void queryClient.invalidateQueries(listsQuery);
          setSelectedShoppingList(shoppingListId, name);
        },
      }),
    ),
  );
}
