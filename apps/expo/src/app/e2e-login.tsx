import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";

import { isE2ETestingEnabled, setupE2ESession } from "~/utils/e2e";

type E2ELoginState =
  | { status: "pending" }
  | { status: "done"; email: string }
  | { status: "error"; message: string };

/**
 * Test-only deep link target (`flatsby://e2e-login?apiUrl=...&bypass=...`).
 * Creates an isolated test user + session via the web app's e2e endpoint and
 * stores it for the next app launch. Inert outside e2e builds.
 */
export default function E2ELoginScreen() {
  const params = useLocalSearchParams<{
    apiUrl?: string;
    bypass?: string;
    name?: string;
    email?: string;
    seed?: string;
  }>();
  const [state, setState] = useState<E2ELoginState>({ status: "pending" });

  const apiUrl = typeof params.apiUrl === "string" ? params.apiUrl : "";
  const bypass = typeof params.bypass === "string" ? params.bypass : "";
  const name = typeof params.name === "string" ? params.name : undefined;
  const email = typeof params.email === "string" ? params.email : undefined;
  const seed = typeof params.seed === "string" ? params.seed : undefined;

  useEffect(() => {
    if (!isE2ETestingEnabled() || !apiUrl) return;
    setupE2ESession({ apiUrl, bypassSecret: bypass, name, email, seed })
      .then((session) => {
        setState({ status: "done", email: session.email });
      })
      .catch((error: unknown) => {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, [apiUrl, bypass, name, email, seed]);

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
