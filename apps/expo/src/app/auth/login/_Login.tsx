"use client";

import type { MessageKey } from "@flatsby/i18n/message-key";
import type {
  LoginAttempt,
  LoginMethod,
  LoginProvider,
} from "@flatsby/validators/login";
import { useState } from "react";
import { Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { uuidv7 } from "@posthog/core";
import { usePostHog } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  signInCodeError,
  startFailureCode,
  thrownFailureCode,
} from "@flatsby/validators/login";
import { userEmailSchema } from "@flatsby/validators/user";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { authClient, signIn } from "~/utils/auth/auth-client";
import { openLegalPage } from "~/utils/legal";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const posthog = usePostHog();
  const router = useRouter();
  const [loading, setLoading] = useState<LoginMethod | "false">("false");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<MessageKey | null>(null);

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
              distinctId: posthog.optedOut
                ? undefined
                : posthog.getDistinctId(),
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

  const sendCode = async () => {
    const parsed = userEmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setEmailError("settings.validation.emailInvalid");
      return;
    }
    const attemptId = uuidv7();
    const attempt = {
      provider: "email",
      platform: "app",
      attempt_id: attemptId,
    };
    posthog.capture("login_provider_tapped", attempt);
    setEmailError(null);
    setLoading("email");
    const failed = (errorCode: string) =>
      posthog.capture("login_failed", {
        ...attempt,
        stage: "start",
        error_code: errorCode,
      });
    try {
      const { error } = await authClient.emailOtp
        .sendVerificationOtp({ email: parsed.data, type: "sign-in" })
        .catch((thrown: unknown) => {
          failed(thrownFailureCode(thrown));
          setEmailError("auth.code.failed");
          throw thrown;
        });
      if (error) {
        failed(startFailureCode(error));
        setEmailError(signInCodeError(error));
        return;
      }
      router.push({
        pathname: "/auth/login/code",
        params: { email: parsed.data, attemptId },
      });
    } finally {
      setLoading("false");
    }
  };

  return (
    <View testID="login-screen" className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Keeps the continue button above the keyboard, not just the field */}
      <AppScrollView
        bottomOffset={96}
        contentContainerClassName="justify-center px-6 py-8"
      >
        <View className="mb-10 items-center">
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

        <View className="w-full gap-4">
          <View className="gap-2">
            <Input
              testID="sign-in-email-input"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError(null);
              }}
              onSubmitEditing={() => void sendCode()}
              placeholder={t("auth.login.emailPlaceholder")}
              accessibilityLabel={t("auth.login.email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="send"
              error={emailError !== null}
            />
            {emailError && (
              <Text
                testID="sign-in-email-error"
                className="text-destructive text-sm"
              >
                {t(emailError)}
              </Text>
            )}
          </View>
          <Button
            testID="sign-in-email-button"
            onPress={() => sendCode()}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "email"
                ? t("auth.login.sendingCode")
                : t("auth.login.continueWithEmail")
            }
            icon={loading === "email" ? "loader" : undefined}
          />

          <View className="flex-row items-center gap-3">
            <View className="bg-border h-px flex-1" />
            <Text className="text-muted-foreground text-xs">
              {t("auth.login.or")}
            </Text>
            <View className="bg-border h-px flex-1" />
          </View>

          <Button
            testID="sign-in-google-button"
            variant="outline"
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
            variant="outline"
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
      </AppScrollView>
    </View>
  );
};

export default Login;
