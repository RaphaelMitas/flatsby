import type { Locale } from "@flatsby/i18n/locale";
import { useState } from "react";
import { Text, View } from "react-native";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import { isLocale } from "@flatsby/i18n/locale";
import { useMountEffect } from "@flatsby/validators/useMountEffect";

import {
  isE2ETestingEnabled,
  setupE2ESession,
  storeE2EApiUrl,
} from "~/utils/e2e";
import { useLocalePreference } from "~/utils/intl-provider";

type E2ELoginState =
  | { status: "pending" }
  | { status: "done"; email: string }
  | { status: "error"; message: string };

interface E2ESessionSetupProps {
  apiUrl: string;
  name?: string;
  email?: string;
  seed?: string;
  locale?: Locale;
  signedOut: boolean;
  onChange: (state: E2ELoginState) => void;
}

function E2ESessionSetup({
  signedOut,
  onChange,
  ...options
}: E2ESessionSetupProps) {
  const { setPreference } = useLocalePreference();

  useMountEffect(() => {
    if (signedOut) {
      storeE2EApiUrl(options.apiUrl);
      onChange({ status: "done", email: "" });
      return;
    }
    setupE2ESession(options)
      .then((session) => {
        if (options.locale) setPreference(options.locale);
        onChange({ status: "done", email: session.email });
      })
      .catch((error: unknown) => {
        onChange({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  });

  return null;
}

export default function E2ELoginScreen() {
  const params = useLocalSearchParams<{
    apiUrl?: string;
    name?: string;
    email?: string;
    seed?: string;
    locale?: string;
    signedOut?: string;
  }>();
  const [state, setState] = useState<E2ELoginState>({ status: "pending" });

  const apiUrl = typeof params.apiUrl === "string" ? params.apiUrl : "";
  const name = typeof params.name === "string" ? params.name : undefined;
  const email = typeof params.email === "string" ? params.email : undefined;
  const seed = typeof params.seed === "string" ? params.seed : undefined;
  const locale =
    typeof params.locale === "string" && isLocale(params.locale)
      ? params.locale
      : undefined;
  const signedOut = params.signedOut !== undefined;

  if (!isE2ETestingEnabled()) {
    return <Redirect href="/" />;
  }

  const displayState: E2ELoginState = apiUrl
    ? state
    : { status: "error", message: "Missing apiUrl parameter" };

  return (
    <View
      testID="e2e-login-screen"
      className="bg-background flex-1 items-center justify-center gap-4 p-8"
    >
      <Stack.Screen options={{ headerShown: false }} />
      {apiUrl !== "" && (
        <E2ESessionSetup
          key={JSON.stringify([apiUrl, name, email, seed, locale, signedOut])}
          apiUrl={apiUrl}
          name={name}
          email={email}
          seed={seed}
          locale={locale}
          signedOut={signedOut}
          onChange={setState}
        />
      )}
      {displayState.status === "pending" && (
        <Text testID="e2e-login-pending" className="text-foreground">
          Creating e2e session...
        </Text>
      )}
      {displayState.status === "done" && (
        <>
          <Text testID="e2e-login-done" className="text-foreground">
            E2E session ready
          </Text>
          <Text testID="e2e-login-email" className="text-muted-foreground">
            {displayState.email}
          </Text>
        </>
      )}
      {displayState.status === "error" && (
        <Text testID="e2e-login-error" className="text-destructive">
          {displayState.message}
        </Text>
      )}
    </View>
  );
}
