import { useEffect, useEffectEvent, useRef } from "react";
import { Platform, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import {
  SIGN_IN_CODE_GROUP,
  SIGN_IN_CODE_LENGTH,
} from "@flatsby/validators/login";
import { asksForName } from "@flatsby/validators/user";
import { useSignInCode } from "@flatsby/validators/useSignInCode";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { CodeInput } from "~/lib/ui/code-input";
import { signInCode } from "~/utils/auth/auth-client";
import { askForName } from "~/utils/auth/name-step";

export default function CodeScreen() {
  const t = useTranslations();
  const router = useRouter();
  const posthog = usePostHog();
  const { email = "", attemptId = "" } = useLocalSearchParams<{
    email: string;
    attemptId: string;
  }>();
  const attempt = { provider: "email", platform: "app", attempt_id: attemptId };
  const signedIn = useRef(false);

  // Signing in refreshes the session, and the root layout leaves login from there
  const { code, change, error, expired, resent, busy, waitSeconds, resend } =
    useSignInCode({
      email,
      client: signInCode,
      onFailed: (stage, errorCode) =>
        posthog.capture("login_failed", {
          ...attempt,
          stage,
          error_code: errorCode,
        }),
      onSignedIn: (user) => {
        signedIn.current = true;
        posthog.capture("login_succeeded", attempt);
        if (asksForName(user)) askForName();
      },
    });

  const leave = useEffectEvent(() => {
    if (!signedIn.current) {
      posthog.capture("login_cancelled", { ...attempt, stage: "code" });
    }
  });
  // Back button, swipe and Android back all leave through here
  useEffect(() => () => leave(), []);

  return (
    <View testID="code-screen" className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <AppScrollView contentContainerClassName="gap-6 px-6 py-8">
        <Button
          testID="code-change-email-button"
          variant="ghost"
          size="sm"
          icon="chevron-left"
          className="self-start px-0"
          title={t("auth.code.changeEmail")}
          onPress={() => router.back()}
        />
        <View className="gap-2">
          <Text className="text-foreground text-2xl font-bold">
            {t("auth.code.title")}
          </Text>
          <Text className="text-muted-foreground text-base leading-relaxed">
            {t.rich("auth.code.sentTo", {
              email,
              b: (chunks) => (
                <Text className="text-foreground font-semibold">{chunks}</Text>
              ),
            })}
          </Text>
        </View>
        <CodeInput
          testID="code-input"
          value={code}
          length={SIGN_IN_CODE_LENGTH}
          groupSize={SIGN_IN_CODE_GROUP}
          error={error !== null}
          editable={!expired}
          onChangeText={change}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        />
        {error && (
          <Text testID="code-error" className="text-destructive text-sm">
            {t(error)}
          </Text>
        )}
        {resent && (
          <Text testID="code-resent" className="text-muted-foreground text-sm">
            {t("auth.code.resent")}
          </Text>
        )}
        <View className="items-center gap-2">
          <Text className="text-muted-foreground text-center text-xs">
            {t("auth.code.notArrived")}
          </Text>
          <Button
            testID="code-resend-button"
            variant={expired ? "primary" : "link"}
            className={expired ? "w-full py-4" : undefined}
            disabled={busy || (!expired && waitSeconds > 0)}
            onPress={() => resend()}
            title={
              !expired && waitSeconds > 0
                ? t("auth.code.resendIn", { seconds: waitSeconds })
                : t("auth.code.resend")
            }
            icon={busy ? "loader" : undefined}
          />
        </View>
      </AppScrollView>
    </View>
  );
}
