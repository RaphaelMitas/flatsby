import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { passkeyDevice, useAddPasskey } from "~/utils/auth/passkey-device";
import { finishSignInStep } from "~/utils/auth/post-login-path";

export default function PasskeyOfferScreen() {
  const t = useTranslations();
  const router = useRouter();
  const [created, setCreated] = useState(false);

  const leave = () => {
    finishSignInStep("passkey");
    router.replace("/");
  };

  const passkey = useAddPasskey("offer", () => setCreated(true));

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
            {created ? t("auth.passkey.createdTitle") : t("auth.passkey.title")}
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-relaxed">
            {created
              ? t("auth.passkey.createdBody")
              : Platform.OS === "ios"
                ? t("auth.passkey.bodyIos")
                : t("auth.passkey.bodyAndroid")}
          </Text>
        </View>
        {passkey.error && (
          <Text
            testID="passkey-offer-error"
            className="text-destructive text-center text-sm"
          >
            {t(passkey.error)}
          </Text>
        )}
        {created ? (
          <Button
            testID="passkey-offer-continue"
            className="w-full py-4"
            title={t("auth.passkey.continue")}
            onPress={leave}
          />
        ) : (
          <View className="gap-2">
            <Button
              testID="passkey-offer-create"
              className="w-full py-4"
              title={t("auth.passkey.create")}
              icon={passkey.busy ? "loader" : undefined}
              disabled={passkey.busy}
              onPress={() => passkey.start()}
            />
            <Button
              testID="passkey-offer-later"
              variant="ghost"
              className="w-full py-4"
              title={t("auth.passkey.later")}
              disabled={passkey.busy}
              onPress={later}
            />
          </View>
        )}
      </AppScrollView>
    </View>
  );
}
