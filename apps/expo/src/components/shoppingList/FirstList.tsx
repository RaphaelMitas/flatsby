import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { Pressable, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { useShoppingStore } from "~/utils/shopping-store";
import { useCreateShoppingList } from "./useCreateShoppingList";

const PRESETS = ["groceries", "drugstore", "hardware"] as const;

export function FirstList({ groupId }: { groupId: number }) {
  const t = useTranslations();
  const { selectedGroupName } = useShoppingStore();
  const createShoppingList = useCreateShoppingList(groupId);

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: { name: "" },
  });

  const create = ({ name }: ShoppingListFormValues) =>
    createShoppingList.mutate({ groupId, name });

  return (
    <AppScrollView contentContainerClassName="flex-grow justify-center gap-4 p-6">
      <View className="items-center gap-2">
        <Icon name="shopping-basket" size={48} color="muted-foreground" />
        <Text
          testID="first-list-title"
          className="text-foreground text-center text-xl font-bold"
        >
          {t("shoppingList.firstList.title")}
        </Text>
        <Text className="text-muted-foreground text-center text-sm">
          {t("shoppingList.firstList.body", { group: selectedGroupName ?? "" })}
        </Text>
      </View>
      <Form {...form}>
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormControl>
              <Input
                testID="first-list-input"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t("shoppingList.listNameLabel")}
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
        <View className="flex-row flex-wrap justify-center gap-2">
          {PRESETS.map((preset) => (
            <Pressable
              key={preset}
              testID={`first-list-preset-${preset}`}
              onPress={() =>
                form.setValue(
                  "name",
                  t(`shoppingList.firstList.presets.${preset}`),
                )
              }
              className="border-border rounded-full border px-3 py-1.5"
            >
              <Text className="text-foreground text-sm">
                {t(`shoppingList.firstList.presets.${preset}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          testID="first-list-create"
          title={t("shoppingList.create.createList")}
          disabled={createShoppingList.isPending}
          icon={createShoppingList.isPending ? "loader" : undefined}
          onPress={form.handleSubmit(create)}
        />
      </Form>
    </AppScrollView>
  );
}
