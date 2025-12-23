import type { ApiResult, GroupWithMemberCount } from "@flatsby/api";
import type { GroupFormValues } from "@flatsby/validators/group";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { groupFormSchema } from "@flatsby/validators/group";

import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";

export default function CreateGroup() {
  const handleGoBack = () => {
    router.back();
  };
  const queryClient = useQueryClient();

  const onCreateGroupError = (
    previousGroups: ApiResult<GroupWithMemberCount[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getUserGroups.queryKey(),
      previousGroups,
    );
  };

  const createGroupMutation = useMutation(
    trpc.shoppingList.createGroup.mutationOptions({
      onMutate: ({ name }) => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getUserGroups.queryOptions(),
        );

        const previousGroups = queryClient.getQueryData(
          trpc.shoppingList.getUserGroups.queryKey(),
        );

        const newGroup = {
          id: -1,
          name: name,
          createdAt: new Date(),
          profilePicture: null,
          memberCount: 1,
        };

        queryClient.setQueryData(
          trpc.shoppingList.getUserGroups.queryKey(),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: [...old.data, newGroup],
            };
          },
        );
        router.back();

        return { previousGroups };
      },
      onError: (error, variables, context) => {
        onCreateGroupError(context?.previousGroups);
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onCreateGroupError(context.previousGroups);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getUserGroups.queryOptions(),
        );
      },
    }),
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
    <View className="flex-1 p-4">
      <Form {...form}>
        <View className="flex gap-2">
          <Label htmlFor="name">Group Name</Label>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormControl>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter your group name"
                  className="w-full"
                  error={!!form.formState.errors.name}
                />
              </FormControl>
            )}
          />
          {form.formState.errors.name && (
            <Text className="text-destructive">
              {form.formState.errors.name.message}
            </Text>
          )}

          <View className="flex flex-row gap-2">
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleGoBack}
              className="flex-1"
            />
            <Button
              title={form.formState.isSubmitting ? "Creating..." : "Create"}
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
