import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  applyListsPatch,
  shoppingListsMutation,
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
      shoppingListsMutation(
        queryClient,
        listsKey,
        shoppingListsPatches.create,
        {
          onFailure: (message) =>
            Alert.alert(
              t("common.error"),
              message ?? t("shoppingList.createFailed"),
            ),
          // The list tab can only open the new list once the cache holds its real id
          onSuccess: ({ shoppingListId }, { name }) => {
            applyListsPatch(
              queryClient,
              listsKey,
              shoppingListsPatches.saved({ shoppingListId }),
            );
            setSelectedShoppingList(shoppingListId, name);
          },
        },
      ),
    ),
  );
}
