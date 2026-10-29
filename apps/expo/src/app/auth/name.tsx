import type { UpdateUserNameFormValues } from "@flatsby/validators/user";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { updateUserNameFormSchema } from "@flatsby/validators/user";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormMessage,
  useForm,
} from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { finishNameStep } from "~/utils/auth/post-login-path";

export default function NameScreen() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();

  const form = useForm({
    schema: updateUserNameFormSchema,
    defaultValues: { name: session.data?.user.name ?? "" },
  });

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: (result) => {
        if (!result.success) {
          form.setError("name", { message: result.error.message });
          return;
        }
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUser.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        finishNameStep();
        void session.refetch();
        router.replace("/");
      },
      onError: (err) => form.setError("name", { message: err.message }),
    }),
  );

  const save = form.handleSubmit((values: UpdateUserNameFormValues) =>
    updateName.mutate({ name: values.name.trim() }),
  );

  return (
    <View testID="name-screen" className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <AppScrollView
        bottomOffset={96}
        contentContainerClassName="justify-center gap-4 px-6 py-8"
      >
        <Text className="text-foreground text-center text-2xl font-bold">
          {t("auth.name.title")}
        </Text>
        <Form {...form}>
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <View className="gap-2">
                <FormControl>
                  <Input
                    testID="name-input"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    onSubmitEditing={() => save()}
                    placeholder={t("auth.name.placeholder")}
                    accessibilityLabel={t("auth.name.placeholder")}
                    autoFocus
                    autoComplete="name"
                    textContentType="givenName"
                    returnKeyType="done"
                    error={!!form.formState.errors.name}
                  />
                </FormControl>
                <FormMessage />
              </View>
            )}
          />
        </Form>
        <Text className="text-muted-foreground text-center text-sm">
          {t("auth.name.hint")}
        </Text>
        <Button
          testID="name-continue-button"
          className="w-full py-4"
          title={t("auth.name.continue")}
          icon={updateName.isPending ? "loader" : undefined}
          disabled={updateName.isPending}
          onPress={save}
        />
      </AppScrollView>
    </View>
  );
}
