import { useEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { authClient } from "~/utils/auth/auth-client";
import { installE2EBaseUrlOverride } from "~/utils/base-url";

/**
 * E2E-only deep link handler: flatsby://e2e-login?token=<session-token>&apiUrl=<url>
 *
 * Writes the session token as a cookie to SecureStore using the same key
 * format that @better-auth/expo uses ({storagePrefix}_cookie), then
 * navigates to the authenticated home screen.
 *
 * When apiUrl is provided, it overrides getBaseUrl() so the app talks to
 * the correct preview deployment instead of production.
 *
 * This route is only reachable via deep link from E2E test flows.
 * It is harmless in production since writing an invalid cookie does nothing.
 */
export default function E2ELogin() {
  const { token, apiUrl } = useLocalSearchParams<{
    token: string;
    apiUrl: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const injectSession = async () => {
      if (apiUrl) {
        installE2EBaseUrlOverride(apiUrl);
      }

      const cookieValue = JSON.stringify({
        "__Secure-better-auth.session_token": {
          value: token,
          expires: null,
        },
      });
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      // Force the auth client to re-read the session from SecureStore
      await authClient.getSession();

      // Navigate to the authenticated home screen
      router.replace("/(tabs)/home");
    };

    void injectSession();
  }, [token, apiUrl, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
