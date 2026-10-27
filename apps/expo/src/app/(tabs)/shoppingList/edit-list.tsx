import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  shoppingListsMutation,
  shoppingListsPatches,
} from "@flatsby/api/shoppingListsCache";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import DeleteConfirmationModal from "~/components/DeleteConfirmationModal";
import { ListNameField } from "~/components/shoppingList/ListNameField";
import { Button } from "~/lib/ui/button";
import { Form, useForm } from "~/lib/ui/form";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function EditShoppingList() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const shoppingListId = Number(listId);
  const { selectedGroupId, selectedShoppingListId, clearSelectedShoppingList } =
    useShoppingStore();
  const groupId = selectedGroupId ?? 0;
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const listsKey = trpc.shoppingList.getShoppingLists.queryKey({ groupId });
  const { data: lists } = useQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId }),
  );
  const list = lists?.success
    ? lists.data.find(({ id }) => id === shoppingListId)
    : undefined;
  const alertFailure = (fallback: string) => (message: string | undefined) =>
    Alert.alert(t("common.error"), message ?? fallback);

  const renameMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions(
      shoppingListsMutation(
        queryClient,
        listsKey,
        shoppingListsPatches.rename,
        {
          onFailure: alertFailure(t("shoppingList.renameFailed")),
          onSuccess: () =>
            void queryClient.invalidateQueries(
              trpc.shoppingList.getShoppingList.queryFilter({
                groupId,
                shoppingListId,
              }),
            ),
        },
      ),
    ),
  );

  const deleteMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions(
      shoppingListsMutation(
        queryClient,
        listsKey,
        shoppingListsPatches.remove,
        {
          onFailure: alertFailure(t("shoppingList.delete.failed")),
        },
      ),
    ),
  );

  const form = useForm({
    schema: shoppingListFormSchema,
    values: { name: list?.name ?? "" },
  });

  const handleRename = ({ name }: ShoppingListFormValues) => {
    renameMutation.mutate({ shoppingListId, name });
    router.back();
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    if (shoppingListId === selectedShoppingListId) clearSelectedShoppingList();
    deleteMutation.mutate({ groupId, shoppingListId });
    router.back();
  };

  if (!list) return null;

  return (
    <View className="bg-background flex-1 gap-2 p-4">
      <Form {...form}>
        <Label htmlFor="name">{t("shoppingList.listNameLabel")}</Label>
        <ListNameField
          control={form.control}
          testID="shopping-list-rename-input"
          placeholder={t("shoppingList.renamePlaceholder")}
        />
        <Button
          testID="shopping-list-rename-save"
          title={t("common.save")}
          onPress={form.handleSubmit(handleRename)}
        />
      </Form>

      <Button
        testID="shopping-list-delete"
        title={t("shoppingList.delete.title")}
        variant="ghost"
        icon="trash-2"
        textClassName="text-destructive"
        className="mt-6"
        onPress={() => setShowDeleteModal(true)}
      />

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={list.name}
        title={t("shoppingList.delete.title")}
        description={t("shoppingList.delete.description", { name: list.name })}
        confirmationLabel={t("shoppingList.delete.confirmationLabel", {
          name: list.name,
        })}
        needsConfirmationInput
      />
    </View>
  );
}
