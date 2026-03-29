import { useEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { authClient } from "~/utils/auth/auth-client";

/**
 * E2E-only deep link handler: flatsby://e2e-login?token=<session-token>
 *
 * Writes the session token as a cookie to SecureStore using the same key
 * format that @better-auth/expo uses ({storagePrefix}_cookie), then
 * triggers a session refresh and navigates to the home screen.
 *
 * This route is only reachable via deep link from E2E test flows.
 * It is harmless in production since writing an invalid cookie does nothing.
 */
export default function E2ELogin() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const injectSession = async () => {
      // Write the token in the JSON format @better-auth/expo expects.
      // The expo client reads from "{storagePrefix}_cookie" and parses it as JSON:
      // { "cookie_name": { "value": "token", "expires": null } }
      const cookieValue = JSON.stringify({
        "__Secure-better-auth.session_token": {
          value: token,
          expires: null,
        },
      });
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      // Trigger useSession() hooks across the app to re-fetch
      authClient.$store.notify("$sessionSignal");

      // Confirm the session is valid before navigating
      const session = await authClient.getSession();
      if (session.data) {
        router.replace("/");
      }
    };

    void injectSession();
  }, [token, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
