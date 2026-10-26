import type { GroupFormValues } from "@flatsby/validators/group";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import { translateIfKey } from "@flatsby/i18n/message-key";
import { groupFormSchema } from "@flatsby/validators/group";

import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";

export default function CreateGroup() {
  const t = useTranslations();
  const handleGoBack = () => {
    router.back();
  };
  const queryClient = useQueryClient();

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
            id: -1,
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
          router.back();

          return [
            {
              queryKey: trpc.group.getUserGroups.queryKey(),
              previous: previousGroups,
            },
          ];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          );
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
    createGroupMutation.mutate(values);
  };

  return (
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

          <View className="flex flex-row gap-2">
            <Button
              title={t("common.cancel")}
              variant="secondary"
              onPress={handleGoBack}
              className="flex-1"
            />
            <Button
              testID="group-create-submit"
              title={
                form.formState.isSubmitting
                  ? t("common.creating")
                  : t("group.create.submit")
              }
              className="flex-1"
              disabled={form.formState.isSubmitting}
              icon={form.formState.isSubmitting ? "loader" : undefined}
              onPress={form.handleSubmit(handleCreateGroup)}
            />
          </View>
        </View>
      </Form>
    </View>
  );
}
