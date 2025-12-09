import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { z } from "zod/v4";

import { ProfileSection } from "~/components/ProfileSection";
import { TimedAlert } from "~/components/TimedAlert";
import { Button } from "~/lib/ui/button";
import { Form, FormControl, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "name is required",
    })
    .max(256, {
      message: "name is too long",
    }),
});

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: user } = useSuspenseQuery(
    trpc.shoppingList.getCurrentUser.queryOptions(),
  );

  const onUpdateUserNameError = (errorMessage: string) => {
    form.setError("name", {
      message: errorMessage,
    });
  };

  const updateUserNameMutation = useMutation(
    trpc.shoppingList.updateUserName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onUpdateUserNameError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getCurrentUser.queryOptions(),
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
    schema: formSchema,
    defaultValues: {
      name: user.name,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const newName = values.name;
    if (!newName) return;
    updateUserNameMutation.mutate({ name: newName });
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <ScrollView className="flex-1 p-4">
        {/* Profile Picture Section */}
        <ProfileSection
          name={user.name}
          subtitle={user.email}
          fallbackText={user.name.substring(0, 2).toUpperCase()}
          showChangePhoto={true}
          disabled={true}
        />

        {/* Name Edit Section */}
        <View className="bg-card gap-4 rounded-lg p-4">
          <Text className="text-foreground mb-4 text-lg font-semibold">
            Display Name
          </Text>

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
