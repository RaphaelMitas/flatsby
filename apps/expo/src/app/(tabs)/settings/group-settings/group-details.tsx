import type { GroupFormValues } from "@flatsby/validators/group";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { groupFormSchema, hasJoined } from "@flatsby/validators/group";

import { ProfileSection } from "~/components/ProfileSection";
import { TimedAlert } from "~/components/TimedAlert";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useUpdateGroup } from "~/utils/useUpdateGroup";

export default function GroupDetailsScreen() {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  const updateGroupMutation = useUpdateGroup(Number(selectedGroupId));

  const form = useForm({
    schema: groupFormSchema,
    defaultValues: {
      name: group.success ? group.data.name : "",
    },
  });

  const handleSubmit = (values: GroupFormValues) => {
    const newName = values.name;
    if (!newName) return;
    updateGroupMutation.mutate(
      { id: Number(selectedGroupId), name: newName },
      {
        onSuccess: (data) => {
          if (!data.success) {
            form.setError("name", { message: data.error.message });
            return;
          }
          setShowSuccessMessage(true);
        },
        onError: (err) => {
          form.setError("name", { message: err.message });
        },
      },
    );
  };

  if (!group.success) {
    return null;
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";
  const memberCount = group.data.groupMembers.filter(hasJoined).length;

  return (
    <AppScrollView className="p-4">
      {/* Group Profile Section */}
      <ProfileSection
        name={group.data.name}
        subtitle={t("group.memberCount", { count: memberCount })}
        fallbackText={group.data.name.substring(0, 2).toUpperCase()}
        showChangePhoto={isAdmin}
        disabled={true}
      />

      {/* Group Name Edit Section */}
      <View className="bg-card gap-4 rounded-lg p-4">
        <Text className="text-foreground mb-4 text-lg font-semibold">
          {t("group.settings.details")}
        </Text>

        {!isAdmin && (
          <View className="bg-muted mb-4 rounded-lg p-3">
            <Text className="text-muted-foreground text-sm">
              {t("group.details.adminOnly")}
            </Text>
          </View>
        )}

        <Form {...form}>
          <View className="gap-4">
            <View>
              <Label htmlFor="name" className="mb-2">
                {t("group.nameLabel")}
              </Label>
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormControl>
                    <Input
                      testID="group-name-input"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      placeholder={t("group.namePlaceholder")}
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
              testID="group-name-save"
              icon={form.formState.isSubmitting ? "loader" : "save"}
              disabled={form.formState.isSubmitting || !isAdmin}
              title={
                form.formState.isSubmitting
                  ? t("common.saving")
                  : !isAdmin
                    ? t("group.details.notAdmin")
                    : t("group.details.saveChanges")
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
            title={t("common.error")}
            description={translateIfKey(
              t,
              form.formState.errors.name.message ?? "",
            )}
          />
        )}

        {/* Success Alert */}
        {showSuccessMessage && (
          <TimedAlert
            variant="success"
            title={t("group.details.success")}
            description={t("group.details.nameUpdated")}
            onDismiss={() => setShowSuccessMessage(false)}
          />
        )}
      </View>
    </AppScrollView>
  );
}
