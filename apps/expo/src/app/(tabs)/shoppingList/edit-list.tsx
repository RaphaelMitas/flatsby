import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import DeleteConfirmationModal from "~/components/DeleteConfirmationModal";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function EditShoppingList() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const shoppingListId = Number(listId);
  const {
    selectedGroupId,
    selectedShoppingListId,
    setSelectedShoppingList,
    clearSelectedShoppingList,
  } = useShoppingStore();
  const groupId = selectedGroupId ?? 0;
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const listsQuery = trpc.shoppingList.getShoppingLists.queryOptions({
    groupId,
  });
  const { data: lists } = useQuery(listsQuery);
  const list = lists?.success
    ? lists.data.find(({ id }) => id === shoppingListId)
    : undefined;

  const updateLists = (
    update: <T extends { id: number; name: string }>(lists: T[]) => T[],
  ) => {
    void queryClient.cancelQueries(listsQuery);
    const previous = queryClient.getQueryData(listsQuery.queryKey);
    queryClient.setQueryData(listsQuery.queryKey, (old) =>
      old?.success ? { success: true as const, data: update(old.data) } : old,
    );
    return [{ queryKey: listsQuery.queryKey, previous }];
  };

  const renameMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions(
      resultMutation({
        onMutate: ({ name }) => {
          if (shoppingListId === selectedShoppingListId)
            setSelectedShoppingList(shoppingListId, name);
          return updateLists((all) =>
            all.map((item) =>
              item.id === shoppingListId ? { ...item, name } : item,
            ),
          );
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(listsQuery);
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingList.queryFilter({
              groupId,
              shoppingListId,
            }),
          );
        },
      }),
    ),
  );

  const deleteMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions(
      resultMutation({
        onMutate: () => {
          if (shoppingListId === selectedShoppingListId)
            clearSelectedShoppingList();
          return updateLists((all) =>
            all.filter((item) => item.id !== shoppingListId),
          );
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(listsQuery);
        },
      }),
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
    deleteMutation.mutate({ groupId, shoppingListId });
    router.back();
  };

  if (!list) return null;

  return (
    <View className="bg-background flex-1 gap-2 p-4">
      <Form {...form}>
        <Label htmlFor="name">{t("shoppingList.listNameLabel")}</Label>
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormControl>
              <Input
                testID="shopping-list-rename-input"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("shoppingList.renamePlaceholder")}
                error={!!form.formState.errors.name}
                maxLength={
                  shoppingListFormSchema.shape.name.maxLength ?? undefined
                }
              />
            </FormControl>
          )}
        />
        {form.formState.errors.name && (
          <Text className="text-destructive">
            {translateIfKey(t, form.formState.errors.name.message ?? "")}
          </Text>
        )}
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
