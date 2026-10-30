import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import type { GroupFormValues } from "@flatsby/validators/group";
import { useState } from "react";
import { Text, View } from "react-native";
import { getLocales } from "expo-localization";
import { router, useNavigation } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  failureOf,
  PENDING_ID,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { isCurrencyCode } from "@flatsby/validators/expenses/types";
import { groupFormSchema } from "@flatsby/validators/group";

import { CurrencyPicker } from "~/components/expenses/CurrencyPicker";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

const deviceCurrency = (): CurrencyCode => {
  const code = getLocales()[0]?.currencyCode;
  return code && isCurrencyCode(code) ? code : "EUR";
};

export default function CreateGroup() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { setSelectedGroup } = useShoppingStore();
  const [currency, setCurrency] = useState(deviceCurrency);

  const createGroupMutation = useMutation(
    trpc.group.createGroup.mutationOptions(
      resultMutation({
        onMutate: ({ name }) => {
          void queryClient.cancelQueries(
            trpc.group.getUserGroups.queryOptions(),
          );

          const previousGroups = queryClient.getQueryData(
            trpc.group.getUserGroups.queryKey(),
          );

          const newGroup = {
            id: PENDING_ID,
            name: name,
            createdAt: new Date(),
            profilePicture: null,
            memberCount: 1,
          };

          queryClient.setQueryData(
            trpc.group.getUserGroups.queryKey(),
            (old) => {
              if (!old?.success) return old;
              return {
                success: true as const,
                data: [...old.data, newGroup],
              };
            },
          );

          return [
            {
              queryKey: trpc.group.getUserGroups.queryKey(),
              previous: previousGroups,
            },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        // The invite step needs the real group id, so navigation waits for it
        onSuccess: ({ groupId }, { name }) => {
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          );
          void queryClient.invalidateQueries(
            trpc.user.getCurrentUserWithGroups.queryOptions(),
          );
          setSelectedGroup(groupId, name);
          // Cancelled while pending: the group still exists and is selected, but stay put
          if (navigation.isFocused())
            router.replace({
              pathname: "/(tabs)/home/invite",
              params: { created: "1" },
            });
        },
      }),
    ),
  );

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
