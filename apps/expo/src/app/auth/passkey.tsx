import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { usePasskey } from "@flatsby/validators/usePasskey";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { authClient } from "~/utils/auth/auth-client";
import { passkeyDevice } from "~/utils/auth/passkey-device";
import { finishSignInStep } from "~/utils/auth/post-login-path";

export default function PasskeyOfferScreen() {
  const t = useTranslations("auth.passkey");
  const router = useRouter();
  const posthog = usePostHog();
  const [created, setCreated] = useState(false);

  const leave = () => {
    finishSignInStep("passkey");
    router.replace("/");
  };

  const passkey = usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      passkeyDevice.save("used");
      posthog.capture("passkey_created", { source: "offer" });
      setCreated(true);
    },
  });

  const later = () => {
    passkeyDevice.save("dismissed");
    leave();
  };

  return (
    <View testID="passkey-offer-screen" className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <AppScrollView contentContainerClassName="flex-grow justify-center gap-4 px-6 py-8">
        <View className="items-center gap-4">
          <Icon
            name={created ? "circle-check" : "passkey"}
            size={56}
            color="primary"
          />
          <Text className="text-foreground text-center text-2xl font-bold">
            {created ? t("createdTitle") : t("title")}
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-relaxed">
            {created
              ? t("createdBody")
              : Platform.OS === "ios"
                ? t("bodyIos")
                : t("bodyAndroid")}
          </Text>
        </View>
        {passkey.error && (
          <Text
            testID="passkey-offer-error"
            className="text-destructive text-center text-sm"
          >
            {t("failed")}
          </Text>
        )}
        {created ? (
          <Button
            testID="passkey-offer-continue"
            className="w-full py-4"
            title={t("continue")}
            onPress={leave}
          />
        ) : (
          <View className="gap-2">
            <Button
              testID="passkey-offer-create"
              className="w-full py-4"
              title={t("create")}
              icon={passkey.busy ? "loader" : undefined}
              disabled={passkey.busy}
              onPress={() => passkey.start()}
            />
            <Button
              testID="passkey-offer-later"
              variant="ghost"
              className="w-full py-4"
              title={t("later")}
              disabled={passkey.busy}
              onPress={later}
            />
          </View>
        )}
      </AppScrollView>
    </View>
  );
}
