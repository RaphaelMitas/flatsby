"use client";

import { useState } from "react";
import { Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Stack } from "expo-router";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { signIn } from "~/utils/auth/auth-client";
import { openLegalPage } from "~/utils/legal";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");

  const callbackURL = ExpoLinking.createURL("/");

  return (
    <View testID="login-screen" className="bg-background flex-1 px-6 py-8">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-center">
        {/* Header Section */}
        <View className="mb-12 items-center">
          <Icon
            name="flatsby"
            className="mb-6 h-40 w-full"
            color="primary"
            size={160}
          />
          <Text className="text-foreground mb-2 text-3xl font-bold">
            Flatsby
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-relaxed">
            {t("auth.login.tagline")}
          </Text>
        </View>

        {/* Auth Buttons Section */}
        <View className="w-full gap-4">
          <Button
            testID="sign-in-google-button"
            onPress={async () => {
              setLoading("google");
              await signIn.social({
                provider: "google",
                callbackURL,
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "google"
                ? t("auth.login.signingInWithGoogle")
                : t("auth.login.signInWithGoogle")
            }
            icon={loading === "google" ? "loader" : "google"}
          />

          <Button
            testID="sign-in-apple-button"
            onPress={async () => {
              setLoading("apple");
              await signIn.social({
                provider: "apple",
                callbackURL,
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "apple"
                ? t("auth.login.signingInWithApple")
                : t("auth.login.signInWithApple")
            }
            icon={loading === "apple" ? "loader" : "apple"}
          />
        </View>

        {/* Legal Links */}
        <View className="mt-6 gap-2">
          <Text className="text-muted-foreground text-center text-xs">
            {t.rich("auth.login.agreement", {
              terms: (chunks) => (
                <Text
                  className="underline"
                  onPress={() => openLegalPage(locale, "terms")}
                >
                  {chunks}
                </Text>
              ),
              privacy: (chunks) => (
                <Text
                  className="underline"
                  onPress={() => openLegalPage(locale, "privacy")}
                >
                  {chunks}
                </Text>
              ),
            })}
          </Text>
          <Text
            className="text-muted-foreground text-center text-xs underline"
            onPress={() => openLegalPage(locale, "legal-notice")}
          >
            {t("navigation.legalNotice")}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Login;
