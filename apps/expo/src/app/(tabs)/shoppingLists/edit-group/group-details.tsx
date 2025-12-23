import type { ApiResult, GroupWithAccess } from "@flatsby/api";
import type { GroupFormValues } from "@flatsby/validators/group";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { groupFormSchema } from "@flatsby/validators/group";

import { ProfileSection } from "~/components/ProfileSection";
import { TimedAlert } from "~/components/TimedAlert";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function GroupDetailsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  const onUpdateGroupNameError = (
    errorMessage: string,
    previousGroup: ApiResult<GroupWithAccess> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.group.getGroup.queryKey({
        id: Number(selectedGroupId),
      }),
      previousGroup,
    );
    form.setError("name", {
      message: errorMessage,
    });
  };

  const updateGroupNameMutation = useMutation(
    trpc.group.changeGroupName.mutationOptions({
      onMutate: (data) => {
        void queryClient.cancelQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId),
          }),
        );
        const previousGroup = queryClient.getQueryData(
          trpc.group.getGroup.queryKey({
            id: Number(selectedGroupId),
          }),
        );

        queryClient.setQueryData(
          trpc.group.getGroup.queryKey({
            id: Number(selectedGroupId),
          }),
          (old) => {
            if (!old) return old;
            return { ...old, name: data.name };
          },
        );
        return { previousGroup };
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onUpdateGroupNameError(data.error.message, context.previousGroup);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId),
          }),
        );
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );

        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      },
      onError: (err, variables, context) => {
        onUpdateGroupNameError(err.message, context?.previousGroup);
      },
    }),
  );

  const form = useForm({
    schema: groupFormSchema,
    defaultValues: {
      name: group.success ? group.data.name : "",
    },
  });

  const handleSubmit = (values: GroupFormValues) => {
    const newName = values.name;
    if (!newName) return;
    updateGroupNameMutation.mutate({
      id: Number(selectedGroupId),
      name: newName,
    });
  };

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";
  const memberCount = group.data.groupMembers.length;

  return (
    <SafeAreaView className="bg-background flex-1">
      <ScrollView className="p-4">
        {/* Group Profile Section */}
        <ProfileSection
          name={group.data.name}
          subtitle={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
          fallbackText={group.data.name.substring(0, 2).toUpperCase()}
          showChangePhoto={isAdmin}
          disabled={true}
        />

        {/* Group Name Edit Section */}
        <View className="bg-card gap-4 rounded-lg p-4">
          <Text className="text-foreground mb-4 text-lg font-semibold">
            Group Details
          </Text>

          {!isAdmin && (
            <View className="bg-muted mb-4 rounded-lg p-3">
              <Text className="text-muted-foreground text-sm">
                Only group administrators can edit group details.
              </Text>
            </View>
          )}

          <Form {...form}>
            <View className="gap-4">
              <View>
                <Label htmlFor="name" className="mb-2">
                  Group Name
                </Label>
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormControl>
                      <Input
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter group name"
                        className="w-full"
                        error={!!form.formState.errors.name}
                        maxLength={256}
                        editable={isAdmin && !form.formState.isSubmitting}
                      />
                    </FormControl>
                  )}
                />
              </View>

              <Button
                icon={form.formState.isSubmitting ? "loader" : "save"}
                disabled={form.formState.isSubmitting || !isAdmin}
                title={
                  form.formState.isSubmitting
                    ? "Saving..."
                    : !isAdmin
                      ? "Not an admin"
                      : "Save Changes"
                }
                onPress={form.handleSubmit(handleSubmit)}
                className="w-full"
              />
            </View>
          </Form>

          {/* Error Alert */}
          {form.formState.errors.name && (
            <TimedAlert
              variant="destructive"
              title="Error"
              description={form.formState.errors.name.message}
            />
          )}

          {/* Success Alert */}
          {showSuccessMessage && (
            <TimedAlert
              variant="success"
              title="Success!"
              description="Group name has been updated successfully."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
