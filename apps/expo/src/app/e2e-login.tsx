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

interface E2ESessionProps {
  apiUrl: string;
  name?: string;
  email?: string;
  seed?: string;
  locale?: Locale;
  signedOut: boolean;
}

function E2ESession({ signedOut, ...options }: E2ESessionProps) {
  const { setPreference } = useLocalePreference();
  const [state, setState] = useState<E2ELoginState>({ status: "pending" });

  useMountEffect(() => {
    if (signedOut) {
      storeE2EApiUrl(options.apiUrl);
      setState({ status: "done", email: "" });
      return;
    }
    setupE2ESession(options)
      .then((session) => {
        if (options.locale) setPreference(options.locale);
        setState({ status: "done", email: session.email });
      })
      .catch((error: unknown) => {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  });

  if (state.status === "pending") {
    return (
      <Text testID="e2e-login-pending" className="text-foreground">
        Creating e2e session...
      </Text>
    );
  }
  if (state.status === "error") {
    return (
      <Text testID="e2e-login-error" className="text-destructive">
        {state.message}
      </Text>
    );
  }
  return (
    <>
      <Text testID="e2e-login-done" className="text-foreground">
        E2E session ready
      </Text>
      <Text testID="e2e-login-email" className="text-muted-foreground">
        {state.email}
      </Text>
    </>
  );
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

  return (
    <View
      testID="e2e-login-screen"
      className="bg-background flex-1 items-center justify-center gap-4 p-8"
    >
      <Stack.Screen options={{ headerShown: false }} />
      {apiUrl ? (
        <E2ESession
          key={JSON.stringify([apiUrl, name, email, seed, locale, signedOut])}
          apiUrl={apiUrl}
          name={name}
          email={email}
          seed={seed}
          locale={locale}
          signedOut={signedOut}
        />
      ) : (
        <Text testID="e2e-login-error" className="text-destructive">
          Missing apiUrl parameter
        </Text>
      )}
    </View>
  );
}
