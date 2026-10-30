import type {
  EditShoppingListItemFormValues,
  ShoppingListItem as ShoppingListItemType,
} from "@flatsby/validators/shopping-list";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { editShoppingListItemFormSchema } from "@flatsby/validators/shopping-list";

import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm,
} from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { shoppingListMutations } from "~/utils/api";
import { CategoryPicker } from "./ShoppingListCategory";

export function ShoppingListItemEditForm() {
  const t = useTranslations();
  const router = useRouter();
  const params = useLocalSearchParams<{
    itemId: string;
    name: ShoppingListItemType["name"];
    categoryId: ShoppingListItemType["categoryId"];
    completed: "true" | "false";
  }>();
  const form = useForm({
    schema: editShoppingListItemFormSchema,
    defaultValues: {
      name: params.name || "",
      categoryId: params.categoryId,
      completed: params.completed === "true",
    },
  });

  const updateShoppingListItemMutation = useMutation(
    shoppingListMutations.update,
  );

  const handleUpdateShoppingListItem = (
    data: EditShoppingListItemFormValues,
  ) => {
    if (!params.itemId) return;

    router.back();
    updateShoppingListItemMutation.mutate({
      id: Number(params.itemId),
      name: data.name,
      categoryId: data.categoryId,
      completed: data.completed,
    });
  };

  return (
    <BottomSheetPickerProvider>
      <View className="bg-background flex-1 gap-4 p-4">
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <>
                <FormControl>
                  <Input
                    {...field}
                    testID="shopping-list-item-edit-input"
                    onChangeText={field.onChange}
                    maxLength={
                      editShoppingListItemFormSchema.shape.name.maxLength ??
                      undefined
                    }
                  />
                </FormControl>
                <FormMessage />
              </>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <>
                <FormControl>
                  <CategoryPicker
                    {...field}
                    triggerTitle={t("common.selectCategory")}
                  />
                </FormControl>
                <FormMessage />
              </>
            )}
          />

          <View className="flex flex-row gap-2">
            <Button
              title={t("common.cancel")}
              variant="secondary"
              onPress={() => router.back()}
              className="flex-1"
            />
            <Button
              testID="shopping-list-item-edit-save"
              title={
                form.formState.isSubmitting
                  ? t("common.updating")
                  : t("shoppingList.item.update")
              }
              className="flex-1"
              disabled={form.formState.isSubmitting}
              icon={form.formState.isSubmitting ? "loader" : undefined}
              onPress={form.handleSubmit(handleUpdateShoppingListItem)}
            />
          </View>
        </Form>
      </View>
    </BottomSheetPickerProvider>
  );
}
