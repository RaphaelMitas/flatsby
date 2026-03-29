import { useEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { authClient } from "~/utils/auth/auth-client";
import { installE2EBaseUrlOverride } from "~/utils/base-url";

/**
 * E2E-only deep link handler:
 *   flatsby://e2e-login?token=<session-token>&apiUrl=<url>&cookieName=<name>
 *
 * 1. Installs a global fetch interceptor so all requests go to the preview
 *    deployment instead of production.
 * 2. Writes the session token to SecureStore using the cookie name the server
 *    actually uses (passed via deep link, not hardcoded).
 * 3. Calls authClient.getSession() to hydrate the reactive session state.
 * 4. Navigates to the authenticated home screen.
 *
 * This route is only reachable via deep link from E2E test flows.
 */
export default function E2ELogin() {
  const { token, apiUrl, cookieName } = useLocalSearchParams<{
    token: string;
    apiUrl: string;
    cookieName: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const injectSession = async () => {
      if (apiUrl) {
        installE2EBaseUrlOverride(apiUrl);
      }

      const effectiveCookieName =
        cookieName || "__Secure-better-auth.session_token";
      const cookieValue = JSON.stringify({
        [effectiveCookieName]: {
          value: token,
          expires: null,
        },
      });
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      await authClient.getSession();

      router.replace("/(tabs)/home");
    };

    void injectSession();
  }, [token, apiUrl, cookieName, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
