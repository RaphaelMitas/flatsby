import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { useState } from "react";
import { View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { ProfileSection } from "~/components/ProfileSection";
import { TimedAlert } from "~/components/TimedAlert";
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
      <View className="flex flex-col gap-4 p-4">
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
            <CardTitle>Display Name</CardTitle>
            <CardDescription>Update your display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <View className="gap-4">
                <View>
                  <Label htmlFor="name" className="mb-2">
                    User Name
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
                          placeholder="Enter your name"
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
                    form.formState.isSubmitting ? "Saving..." : "Save Changes"
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
                description="Your name has been updated successfully."
              />
            )}
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}
