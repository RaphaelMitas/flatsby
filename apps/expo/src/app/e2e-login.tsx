import { useEffect } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

import { E2E_API_URL_KEY } from "~/utils/base-url";
import { authClient } from "~/utils/auth/auth-client";

/**
 * E2E-only deep link handler:
 *   flatsby://e2e-login?token=<session-token>&apiUrl=<server-url>
 *
 * Persists the API URL and session cookie to SecureStore, then either
 * reloads (preview/production builds) or manually validates the session
 * and navigates (dev builds where Updates.reloadAsync is unavailable).
 */
export default function E2ELogin() {
  const { token, apiUrl } = useLocalSearchParams<{
    token: string;
    apiUrl: string;
  }>();
  const router = useRouter();

  // After a reload, the cookie is already present. Redirect to root
  // so the normal auth flow takes over.
  const alreadyInjected = !!SecureStore.getItem("flatsby_cookie");
  if (alreadyInjected && !token) {
    return <Redirect href="/" />;
  }

  useEffect(() => {
    if (!token || !apiUrl) return;

    const injectSession = async () => {
      // Store the API URL so getBaseUrl() returns it after reload.
      await SecureStore.setItemAsync(E2E_API_URL_KEY, apiUrl);

      // Write the token in the JSON format @better-auth/expo expects.
      const cookieValue = JSON.stringify({
        "__Secure-better-auth.session_token": {
          value: token,
          expires: null,
        },
      });
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      // In preview/production builds, reload so everything re-initialises
      // with the correct API URL. In dev builds this throws, so we fall
      // back to a manual session fetch against the correct server.
      try {
        await Updates.reloadAsync();
      } catch {
        // Dev build: validate the session directly against the preview server
        // and update the auth store so useSession() picks it up.
        const cookie = `__Secure-better-auth.session_token=${token}`;
        const res = await fetch(`${apiUrl}/api/auth/get-session`, {
          headers: { cookie },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.session) {
            // Cache the session so it persists across navigations
            await SecureStore.setItemAsync(
              "flatsby_session_data",
              JSON.stringify(data),
            );
            // Notify the auth client store to trigger useSession() re-renders
            authClient.$store.notify("$sessionSignal");
            router.replace("/");
            return;
          }
        }
        console.error("E2E login: session validation failed", res.status);
      }
    };

    void injectSession();
  }, [token, apiUrl, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
