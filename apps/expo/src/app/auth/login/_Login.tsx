"use client";

import type { LoginAttempt, LoginProvider } from "@flatsby/validators/login";
import { useState } from "react";
import { Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Stack } from "expo-router";
import { uuidv7 } from "@posthog/core";
import { usePostHog } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import { startFailureCode, thrownFailureCode } from "@flatsby/validators/login";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { getAnalyticsConsent, storesDeviceId } from "~/utils/analytics/posthog";
import { authClient, signIn } from "~/utils/auth/auth-client";
import { openLegalPage } from "~/utils/legal";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const posthog = usePostHog();
  const [loading, setLoading] = useState<LoginProvider | "false">("false");

  const callbackURL = ExpoLinking.createURL("/");

  const signInWith = async (provider: LoginProvider) => {
    const attemptId = uuidv7();
    const attempt = { provider, platform: "app", attempt_id: attemptId };
    posthog.capture("login_provider_tapped", attempt);
    setLoading(provider);
    const failed = (errorCode: string) =>
      posthog.capture("login_failed", {
        ...attempt,
        stage: "start",
        error_code: errorCode,
      });
    try {
      const { error } = await signIn
        .social({
          provider,
          callbackURL,
          additionalData: {
            login: {
              attemptId,
              // Without consent the ID dies with the app, so it can't join the callback to an install
              distinctId: storesDeviceId(getAnalyticsConsent())
                ? posthog.getDistinctId()
                : undefined,
            } satisfies LoginAttempt,
          },
        })
        .catch((thrown: unknown) => {
          failed(thrownFailureCode(thrown));
          throw thrown;
        });
      if (error) return failed(startFailureCode(error));
      // The Expo plugin drops the browser's result, so whether a session came back is all we can know
      const session = await authClient.getSession();
      if (!session.data && !session.error) {
        posthog.capture("login_cancelled", { ...attempt, stage: "sheet" });
      }
    } finally {
      setLoading("false");
    }
  };

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
            onPress={() => signInWith("google")}
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
            onPress={() => signInWith("apple")}
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
          {/* Art. 21(4) GDPR: the right to object, on its own line, before the first sign-in */}
          <Text
            testID="login-right-to-object"
            className="text-foreground text-center text-xs"
          >
            {t.rich("settings.analytics.rightToObject", {
              strong: (chunks) => (
                <Text className="font-semibold">{chunks}</Text>
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
