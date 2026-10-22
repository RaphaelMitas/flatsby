"use client";

import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { useLocale, useTranslations } from "use-intl";

import { localePath } from "@flatsby/i18n/locale";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { signIn, useSession } from "~/utils/auth/auth-client";
import { clearPostLoginPath } from "~/utils/auth/post-login-path";
import { getBaseUrl } from "~/utils/base-url";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");
  const { data: session } = useSession();
  const router = useRouter();

  const callbackURL = ExpoLinking.createURL("/");

  // Sign-in only stores the cookie and refetches the session; nothing navigates.
  // The join screen pushes this one and already serves the signed-in user.
  useEffect(() => {
    if (!session) return;
    if (router.canGoBack()) {
      clearPostLoginPath();
      router.back();
    } else {
      router.replace("/");
    }
  }, [session, router]);

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
                  onPress={() =>
                    Linking.openURL(
                      `${getBaseUrl()}${localePath(locale, "/legal/terms")}`,
                    )
                  }
                >
                  {chunks}
                </Text>
              ),
              privacy: (chunks) => (
                <Text
                  className="underline"
                  onPress={() =>
                    Linking.openURL(
                      `${getBaseUrl()}${localePath(locale, "/legal/privacy")}`,
                    )
                  }
                >
                  {chunks}
                </Text>
              ),
            })}
          </Text>
          <Text
            className="text-muted-foreground text-center text-xs underline"
            onPress={() =>
              Linking.openURL(
                `${getBaseUrl()}${localePath(locale, "/legal/legal-notice")}`,
              )
            }
          >
            {t("navigation.legalNotice")}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Login;
