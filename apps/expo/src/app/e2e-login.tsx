import { useEffect } from "react";
import { DevSettings, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

import { E2E_API_URL_KEY } from "~/utils/base-url";

/**
 * E2E-only deep link handler:
 *   flatsby://e2e-login?token=<session-token>&apiUrl=<server-url>
 *
 * Persists the API URL and session cookie to SecureStore, then reloads
 * the JS bundle so the auth client initialises against the correct server.
 *
 * After the reload, the cookie is already present so we redirect straight
 * to the root (which sends the user to the home screen).
 */
export default function E2ELogin() {
  const { token, apiUrl } = useLocalSearchParams<{
    token: string;
    apiUrl: string;
  }>();

  // After a reload the cookie is already present. Redirect to root.
  if (SecureStore.getItem("flatsby_cookie")) {
    return <Redirect href="/" />;
  }

  return <E2ELoginEffect token={token} apiUrl={apiUrl} />;
}

function E2ELoginEffect({
  token,
  apiUrl,
}: {
  token?: string;
  apiUrl?: string;
}) {
  useEffect(() => {
    if (!token || !apiUrl) return;

    const injectSession = async () => {
      await SecureStore.setItemAsync(E2E_API_URL_KEY, apiUrl);

      const cookieValue = JSON.stringify({
        "__Secure-better-auth.session_token": {
          value: token,
          expires: null,
        },
      });
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      // Preview/production: full reload via expo-updates
      // Dev: JS-only reload via DevSettings
      try {
        await Updates.reloadAsync();
      } catch {
        DevSettings.reload();
      }
    };

    void injectSession();
  }, [token, apiUrl]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
