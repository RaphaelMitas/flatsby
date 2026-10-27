import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslations } from "use-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { useCreateShoppingList } from "~/components/shoppingList/useCreateShoppingList";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { useShoppingStore } from "~/utils/shopping-store";

export default function CreateShoppingList() {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const groupId = selectedGroupId ?? 0;
  const createShoppingList = useCreateShoppingList(groupId);

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: "",
    },
  });

  const handleCreateShoppingList = (values: ShoppingListFormValues) => {
    createShoppingList.mutate({ groupId, name: values.name });
    router.back();
  };

  return (
    <View className="bg-background flex-1 p-4">
      <Form {...form}>
        <View className="flex gap-2">
          <Label htmlFor="name">{t("shoppingList.listNameLabel")}</Label>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormControl>
                <Input
                  testID="shopping-list-create-input"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("shoppingList.create.namePlaceholder")}
                  className="w-full"
                  error={!!form.formState.errors.name}
                  maxLength={
                    shoppingListFormSchema.shape.name.maxLength ?? undefined
                  }
                  autoFocus
                />
              </FormControl>
            )}
          />
          {form.formState.errors.name && (
            <Text className="text-destructive">
              {translateIfKey(t, form.formState.errors.name.message ?? "")}
            </Text>
          )}

          <View className="flex flex-row gap-2">
            <Button
              title={t("common.cancel")}
              variant="secondary"
              onPress={() => router.back()}
              className="flex-1"
            />
            <Button
              testID="shopping-list-create-submit"
              title={t("shoppingList.create.submit")}
              className="flex-1"
              onPress={form.handleSubmit(handleCreateShoppingList)}
            />
          </View>
        </View>
      </Form>
    </View>
  );
}
