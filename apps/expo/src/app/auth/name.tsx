import { useState } from "react";
import { Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { translateIfKey } from "@flatsby/i18n/message-key";
import { userNameSchema } from "@flatsby/validators/user";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Input } from "~/lib/ui/input";
import { trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { finishNameStep } from "~/utils/auth/name-step";

export default function NameScreen() {
  const t = useTranslations();
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState(session.data?.user.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const updateName = useMutation(
    trpc.user.updateUserName.mutationOptions({
      onSuccess: async (result) => {
        if (!result.success) {
          setError(translateIfKey(t, result.error.message));
          return;
        }
        finishNameStep();
        await session.refetch();
        router.replace("/");
      },
      onError: (err) => setError(err.message),
    }),
  );

  const save = () => {
    const parsed = userNameSchema.safeParse(name.trim());
    if (!parsed.success) {
      setError(translateIfKey(t, parsed.error.issues[0]?.message ?? ""));
      return;
    }
    updateName.mutate({ name: parsed.data });
  };

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
        <Input
          testID="name-input"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          onSubmitEditing={save}
          placeholder={t("auth.name.placeholder")}
          accessibilityLabel={t("auth.name.placeholder")}
          autoFocus
          autoComplete="name"
          textContentType="givenName"
          returnKeyType="done"
          error={error !== null}
        />
        {error && (
          <Text testID="name-error" className="text-destructive text-sm">
            {error}
          </Text>
        )}
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
