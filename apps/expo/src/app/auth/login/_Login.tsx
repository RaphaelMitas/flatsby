"use client";

import type { LoginAttempt, LoginProvider } from "@flatsby/validators/login";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { uuidv7 } from "@posthog/core";
import { usePostHog } from "posthog-react-native";
import { useLocale, useTranslations } from "use-intl";

import { startFailureCode, thrownFailureCode } from "@flatsby/validators/login";
import { usePasskey } from "@flatsby/validators/usePasskey";
import { useSendSignInCode } from "@flatsby/validators/useSignInCode";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { Separator } from "~/lib/ui/separator";
import { authClient, signIn, signInCode } from "~/utils/auth/auth-client";
import { passkeyDevice, passkeysSupported } from "~/utils/auth/passkey-device";
import { openLegalPage } from "~/utils/legal";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const posthog = usePostHog();
  const router = useRouter();
  const [loading, setLoading] = useState<LoginProvider | "false">("false");
  const emailAttemptId = useRef("");
  const emailAttempt = () => ({
    provider: "email",
    platform: "app",
    attempt_id: emailAttemptId.current,
  });
  const emailStep = useSendSignInCode({
    client: signInCode,
    onTapped: () => {
      emailAttemptId.current = uuidv7();
      posthog.capture("login_provider_tapped", emailAttempt());
    },
    onFailed: (stage, errorCode) =>
      posthog.capture("login_failed", {
        ...emailAttempt(),
        stage,
        error_code: errorCode,
      }),
    onSent: (email) =>
      router.push({
        pathname: "/auth/login/code",
        params: { email, attemptId: emailAttemptId.current },
      }),
  });
  const passkeyAttemptId = useRef("");
  const passkeyAttempt = () => ({
    provider: "passkey",
    platform: "app",
    attempt_id: passkeyAttemptId.current,
  });
  const passkey = usePasskey({
    run: () => authClient.signIn.passkey(),
    onDone: () => {
      posthog.capture("login_succeeded", passkeyAttempt());
      passkeyDevice.save("used");
    },
    onCancelled: () =>
      posthog.capture("login_cancelled", {
        ...passkeyAttempt(),
        stage: "sheet",
      }),
    onFailed: (errorCode) =>
      posthog.capture("login_failed", {
        ...passkeyAttempt(),
        stage: "sheet",
        error_code: errorCode,
      }),
  });
  const signInWithPasskey = () => {
    passkeyAttemptId.current = uuidv7();
    posthog.capture("login_provider_tapped", passkeyAttempt());
    void passkey.start();
  };
  const device = passkeyDevice.useValue();
  const passkeyFirst = passkeysSupported && device === "used";
  const busy = loading !== "false" || emailStep.sending || passkey.busy;
  const passkeyError = passkey.error && (
    <Text testID="sign-in-passkey-error" className="text-destructive text-sm">
      {t(passkey.error)}
    </Text>
  );

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
          {passkeyFirst && (
            <>
              <Button
                testID="sign-in-passkey-button"
                onPress={signInWithPasskey}
                disabled={busy}
                className="w-full py-4"
                title={t("auth.login.signInWithPasskey")}
                icon={passkey.busy ? "loader" : "passkey"}
              />
              {passkeyError}
              <View className="flex-row items-center gap-3">
                <Separator className="flex-1" />
                <Text className="text-muted-foreground text-xs">
                  {t("auth.login.or")}
                </Text>
                <Separator className="flex-1" />
              </View>
            </>
          )}
          <View className="gap-2">
            <Input
              testID="sign-in-email-input"
              value={emailStep.email}
              onChangeText={emailStep.changeEmail}
              onSubmitEditing={() => void emailStep.send()}
              placeholder={t("auth.login.emailPlaceholder")}
              accessibilityLabel={t("auth.login.email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="send"
              error={emailStep.error !== null}
            />
            {emailStep.error && (
              <Text
                testID="sign-in-email-error"
                className="text-destructive text-sm"
              >
                {t(emailStep.error)}
              </Text>
            )}
          </View>
          <Button
            testID="sign-in-email-button"
            variant={passkeyFirst ? "outline" : "primary"}
            onPress={() => emailStep.send()}
            disabled={busy}
            className="w-full py-4"
            title={
              emailStep.sending
                ? t("auth.login.sendingCode")
                : t("auth.login.continueWithEmail")
            }
            icon={emailStep.sending ? "loader" : undefined}
          />

          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text className="text-muted-foreground text-xs">
              {t("auth.login.or")}
            </Text>
            <Separator className="flex-1" />
          </View>

          <Button
            testID="sign-in-google-button"
            variant="outline"
            onPress={() => signInWith("google")}
            disabled={busy}
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
            disabled={busy}
            className="w-full py-4"
            title={
              loading === "apple"
                ? t("auth.login.signingInWithApple")
                : t("auth.login.signInWithApple")
            }
            icon={loading === "apple" ? "loader" : "apple"}
          />

          {passkeysSupported && !passkeyFirst && (
            <View className="items-center gap-2">
              <Button
                testID="sign-in-passkey-link"
                variant="link"
                onPress={signInWithPasskey}
                disabled={busy}
                title={t("auth.login.signInWithPasskey")}
                icon={passkey.busy ? "loader" : undefined}
              />
              {passkeyError}
            </View>
          )}
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
