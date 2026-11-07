import type { GroupFormValues } from "@flatsby/validators/group";
import { useState } from "react";
import { Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { useTranslations } from "use-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { groupFormSchema } from "@flatsby/validators/group";

import { CurrencyPicker } from "~/components/expenses/CurrencyPicker";
import {
  deviceCurrency,
  useCreateGroup,
} from "~/components/groupDashboard/useCreateGroup";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";

export default function CreateGroup() {
  const t = useTranslations();
  const navigation = useNavigation();
  const [currency, setCurrency] = useState(deviceCurrency);

  const createGroupMutation = useCreateGroup(() => {
    // Cancelled while pending: the group still exists and is selected, but stay put
    if (navigation.isFocused())
      router.replace({
        pathname: "/(tabs)/home/invite",
        params: { created: "1" },
      });
  });

  const form = useForm({
    schema: groupFormSchema,
    defaultValues: {
      name: "",
    },
  });

  const handleCreateGroup = (values: GroupFormValues) => {
    createGroupMutation.mutate({ ...values, currency });
  };

  const createFailure = failureOf(createGroupMutation, t("errors.unexpected"));

  return (
    <BottomSheetPickerProvider>
      <View className="bg-background flex-1 p-4">
        <Form {...form}>
          <View className="flex gap-2">
            <Label htmlFor="name">{t("group.nameLabel")}</Label>
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormControl>
                  <Input
                    testID="group-create-name-input"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={t("group.create.namePlaceholder")}
                    className="w-full"
                    error={!!form.formState.errors.name}
                  />
                </FormControl>
              )}
            />
            {form.formState.errors.name && (
              <Text className="text-destructive">
                {translateIfKey(t, form.formState.errors.name.message ?? "")}
              </Text>
            )}

            <Label className="mt-2">
              {t("group.expenseSettings.currency")}
            </Label>
            <CurrencyPicker
              testID="group-create-currency"
              value={currency}
              onChange={setCurrency}
            />
            <Text className="text-muted-foreground text-sm">
              {t("group.create.currencyHint")}
            </Text>

            {createFailure !== undefined && (
              <Text className="text-destructive">{createFailure}</Text>
            )}

            <View className="mt-2 flex flex-row gap-2">
              <Button
                title={t("common.cancel")}
                variant="secondary"
                onPress={() => router.back()}
                className="flex-1"
              />
              <Button
                testID="group-create-submit"
                title={
                  createGroupMutation.isPending
                    ? t("common.creating")
                    : t("group.create.submit")
                }
                className="flex-1"
                disabled={createGroupMutation.isPending}
                icon={createGroupMutation.isPending ? "loader" : undefined}
                onPress={form.handleSubmit(handleCreateGroup)}
              />
            </View>
          </View>
        </Form>
      </View>
    </BottomSheetPickerProvider>
  );
}
