import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { useState } from "react";
import { View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { PaymentDetailsCard } from "~/components/PaymentDetailsCard";
import { ProfileSection } from "~/components/ProfileSection";
import { TimedAlert } from "~/components/TimedAlert";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";

export default function ProfileScreen() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const onUpdateUserNameError = (errorMessage: string) => {
    form.setError("name", {
      message: errorMessage,
    });
  };

  const updateUserNameMutation = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onUpdateUserNameError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );

        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      },
      onError: (err) => {
        onUpdateUserNameError(err.message);
      },
    }),
  );

  const form = useForm({
    schema: updateUserNameFormSchema,
    defaultValues: {
      name: user.name,
    },
  });

  const handleSubmit = (values: UpdateUserNameFormValues) => {
    const newName = values.name;
    if (!newName) return;
    updateUserNameMutation.mutate({ name: newName });
  };

  return (
    <SafeAreaView>
      <AppScrollView contentContainerClassName="gap-4 p-4">
        {/* Profile Picture Section */}
        <ProfileSection
          name={user.name}
          subtitle={user.email}
          fallbackText={user.name.substring(0, 2).toUpperCase()}
          showChangePhoto={true}
          disabled={true}
        />

        {/* Name Edit Section */}
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{t("settings.profile.displayName")}</CardTitle>
            <CardDescription>
              {t("settings.profile.displayNameDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <View className="gap-4">
                <View>
                  <Label htmlFor="name" className="mb-2">
                    {t("settings.profile.userName")}
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
                          placeholder={t("settings.profile.namePlaceholder")}
                          className="w-full"
                          error={!!form.formState.errors.name}
                        />
                      </FormControl>
                    )}
                  />
                </View>

                <Button
                  icon={form.formState.isSubmitting ? "loader" : "save"}
                  disabled={form.formState.isSubmitting}
                  title={
                    form.formState.isSubmitting
                      ? t("common.saving")
                      : t("settings.profile.saveChanges")
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
                title={t("settings.profile.success")}
                description={t("settings.profile.nameUpdated")}
              />
            )}
          </CardContent>
        </Card>

        <PaymentDetailsCard />
      </AppScrollView>
    </SafeAreaView>
  );
}
