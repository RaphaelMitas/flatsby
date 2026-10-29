import type { MessageKey } from "@flatsby/i18n/message-key";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import {
  isRetryableCodeError,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_RESEND_SECONDS,
  signInCodeError,
  startFailureCode,
  thrownFailureCode,
} from "@flatsby/validators/login";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { CodeInput } from "~/lib/ui/code-input";
import { authClient } from "~/utils/auth/auth-client";

export default function CodeScreen() {
  const t = useTranslations();
  const router = useRouter();
  const posthog = usePostHog();
  const { email = "", attemptId = "" } = useLocalSearchParams<{
    email: string;
    attemptId: string;
  }>();
  const attempt = { provider: "email", platform: "app", attempt_id: attemptId };
  const [code, setCode] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [expired, setExpired] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + SIGN_IN_CODE_RESEND_SECONDS * 1000,
  );
  const [now, setNow] = useState(() => Date.now());
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (waitSeconds === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const failed = (stage: "start" | "code", errorCode: string) =>
    posthog.capture("login_failed", {
      ...attempt,
      stage,
      error_code: errorCode,
    });

  // Signing in refreshes the session, and the root layout leaves login from there
  const verify = async (otp: string) => {
    setBusy(true);
    setResent(false);
    try {
      const { error: signInError } = await authClient.signIn
        .emailOtp({ email, otp })
        .catch((thrown: unknown) => {
          failed("code", thrownFailureCode(thrown));
          setError("auth.code.failed");
          setCode("");
          throw thrown;
        });
      if (signInError) {
        failed("code", startFailureCode(signInError));
        setError(signInCodeError(signInError));
        setCode("");
        setExpired(!isRetryableCodeError(signInError));
        return;
      }
      posthog.capture("login_succeeded", attempt);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setResent(false);
    try {
      const { error: sendError } = await authClient.emailOtp
        .sendVerificationOtp({ email, type: "sign-in" })
        .catch((thrown: unknown) => {
          failed("start", thrownFailureCode(thrown));
          setError("auth.code.failed");
          throw thrown;
        });
      if (sendError) {
        failed("start", startFailureCode(sendError));
        setError(signInCodeError(sendError));
        return;
      }
      setError(null);
      setExpired(false);
      setCode("");
      setResent(true);
      setResendAt(Date.now() + SIGN_IN_CODE_RESEND_SECONDS * 1000);
      setNow(Date.now());
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = () => {
    posthog.capture("login_cancelled", { ...attempt, stage: "code" });
    router.back();
  };

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
          onPress={changeEmail}
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
          groupSize={SIGN_IN_CODE_LENGTH / 2}
          error={error !== null}
          editable={!expired}
          onChangeText={(text) => {
            // A code pasted over a half-typed one lands at the end
            const digits = text.replace(/\D/g, "").slice(-SIGN_IN_CODE_LENGTH);
            setCode(digits);
            setError(null);
            if (digits.length === SIGN_IN_CODE_LENGTH) void verify(digits);
          }}
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
