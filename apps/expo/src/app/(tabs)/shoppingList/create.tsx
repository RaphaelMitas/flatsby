import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslations } from "use-intl";

import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { ListNameField } from "~/components/shoppingList/ListNameField";
import { useCreateShoppingList } from "~/components/shoppingList/useCreateShoppingList";
import { Button } from "~/lib/ui/button";
import { Form, useForm } from "~/lib/ui/form";
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
          <ListNameField
            control={form.control}
            testID="shopping-list-create-input"
            placeholder={t("shoppingList.create.namePlaceholder")}
            autoFocus
          />

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
