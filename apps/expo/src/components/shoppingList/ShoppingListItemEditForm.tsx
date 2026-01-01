import type {
  EditShoppingListItemFormValues,
  ShoppingListItem as ShoppingListItemType,
} from "@flatsby/validators/shopping-list";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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
import { useShoppingStore } from "~/utils/shopping-store";
import { CategoryPicker } from "./ShoppingListCategory";
import { useUpdateShoppingListItemMutation } from "./ShoppingListUtils";

export function ShoppingListItemEditForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    itemId: string;
    name: ShoppingListItemType["name"];
    categoryId: ShoppingListItemType["categoryId"];
    completed: "true" | "false";
  }>();
  const { selectedGroupId: groupId, selectedShoppingListId: shoppingListId } =
    useShoppingStore();
  const form = useForm({
    schema: editShoppingListItemFormSchema,
    defaultValues: {
      name: params.name || "",
      categoryId: params.categoryId,
      completed: params.completed === "true",
    },
  });

  const updateShoppingListItemMutation = useUpdateShoppingListItemMutation({
    groupId: groupId ?? -1,
    shoppingListId: shoppingListId ?? -1,
  });

  const handleUpdateShoppingListItem = (
    data: EditShoppingListItemFormValues,
  ) => {
    if (!groupId || !shoppingListId || !params.itemId) return;

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
                  <CategoryPicker {...field} triggerTitle="Select Category" />
                </FormControl>
                <FormMessage />
              </>
            )}
          />

          <View className="flex flex-row gap-2">
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              className="flex-1"
            />
            <Button
              title={form.formState.isSubmitting ? "Updating..." : "Update"}
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
