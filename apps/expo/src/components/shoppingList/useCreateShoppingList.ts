import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { resultMutation } from "@flatsby/api/resultMutation";
import {
  applyListsPatch,
  shoppingListsPatches,
} from "@flatsby/api/shoppingListsCache";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export function useCreateShoppingList(groupId: number) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { setSelectedShoppingList } = useShoppingStore();
  const listsKey = trpc.shoppingList.getShoppingLists.queryKey({ groupId });

  return useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions(
      resultMutation({
        onFailure: (message) =>
          Alert.alert(
            t("common.error"),
            message ?? t("shoppingList.createFailed"),
          ),
        // The Shopping tab can only open the new list once the cache holds it
        onSuccess: async ({ shoppingListId }, { name }) => {
          await queryClient.cancelQueries({ queryKey: listsKey });
          applyListsPatch(
            queryClient,
            listsKey,
            shoppingListsPatches.added({ id: shoppingListId, name }),
          );
          setSelectedShoppingList(shoppingListId, name);
          void queryClient.invalidateQueries({ queryKey: listsKey });
        },
      }),
    ),
  );
}
