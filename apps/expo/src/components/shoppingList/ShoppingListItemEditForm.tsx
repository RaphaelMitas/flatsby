import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod/v4";

import type { ShoppingListItem as ShoppingListItemType } from "./ShoppingListUtils";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { useShoppingStore } from "~/utils/shopping-store";
import { allCategories, CategoryPicker } from "./ShoppingListCategory";
import { useUpdateShoppingListItemMutation } from "./ShoppingListUtils";

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "name is required",
    })
    .max(256, {
      message: "name is too long",
    }),
  categoryId: z.enum(allCategories).default("ai-auto-select"),
  completed: z.boolean(),
});
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
    schema: formSchema,
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

  const handleUpdateShoppingListItem = (data: z.infer<typeof formSchema>) => {
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
      <View className="flex-1 gap-4 p-4">
        <Form {...form}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormControl>
                <Input {...field} onChangeText={field.onChange} />
              </FormControl>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormControl>
                <CategoryPicker {...field} triggerTitle="Select Category" />
              </FormControl>
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
