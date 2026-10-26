import type { ShoppingListFormValues } from "@flatsby/validators/shopping-list";
import { Alert, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { shoppingListFormSchema } from "@flatsby/validators/shopping-list";

import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";

export default function CreateShoppingList() {
  const t = useTranslations();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const handleGoBack = () => {
    router.back();
  };
  const queryClient = useQueryClient();
  const groupIdNumber = groupId ? parseInt(groupId, 10) : 0;
  const listsQueryKey = trpc.shoppingList.getShoppingLists.queryKey({
    groupId: groupIdNumber,
  });

  const createShoppingListMutation = useMutation(
    trpc.shoppingList.createShoppingList.mutationOptions(
      resultMutation({
        onMutate: (data) => {
          void queryClient.cancelQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId: groupIdNumber,
            }),
          );

          const previousLists = queryClient.getQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId: groupIdNumber,
            }),
          );

          const newShoppingList = {
            ...data,
            id: -1,
            uncheckedItemLength: 0,
            description: null,
            icon: null,
          };

          queryClient.setQueryData(
            trpc.shoppingList.getShoppingLists.queryKey({
              groupId: groupIdNumber,
            }),
            (old) => {
              if (!old?.success) {
                return old;
              }

              return {
                success: true as const,
                data: [...old.data, newShoppingList],
              };
            },
          );
          router.back();

          return [{ queryKey: listsQueryKey, previous: previousLists }];
        },
        rollback: restoreSnapshot(queryClient),
        onFailure: (message) =>
          Alert.alert(
            t("common.error"),
            message ?? t("shoppingList.createFailed"),
          ),
        onSuccess: () => {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getShoppingLists.queryOptions({
              groupId: groupIdNumber,
            }),
          );
        },
      }),
    ),
  );

  const form = useForm({
    schema: shoppingListFormSchema,
    defaultValues: {
      name: "",
    },
  });

  const handleCreateShoppingList = (values: ShoppingListFormValues) => {
    createShoppingListMutation.mutate({
      groupId: groupIdNumber,
      name: values.name,
    });
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
              onPress={handleGoBack}
              className="flex-1"
            />
            <Button
              testID="shopping-list-create-submit"
              title={
                form.formState.isSubmitting
                  ? t("common.creating")
                  : t("shoppingList.create.submit")
              }
              className="flex-1"
              disabled={form.formState.isSubmitting}
              icon={form.formState.isSubmitting ? "loader" : undefined}
              onPress={form.handleSubmit(handleCreateShoppingList)}
            />
          </View>
        </View>
      </Form>
    </View>
  );
}
