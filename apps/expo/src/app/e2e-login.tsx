import { useEffect } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

import { E2E_API_URL_KEY } from "~/utils/base-url";

/**
 * E2E-only deep link handler:
 *   flatsby://e2e-login?token=<session-token>&apiUrl=<server-url>
 *
 * Persists the API URL and session cookie to SecureStore, then reloads
 * the app so the auth client initialises against the correct server.
 *
 * On the second render (after reload, when expo-router re-processes the
 * deep link) the cookie is already present, so we redirect straight to
 * the home screen instead of reloading again.
 *
 * This route is only reachable via deep link from E2E test flows.
 * It is harmless in production since writing an invalid cookie does nothing.
 */
export default function E2ELogin() {
  const { token, apiUrl } = useLocalSearchParams<{
    token: string;
    apiUrl: string;
  }>();

  // If the cookie was already injected (i.e. we're here after a reload),
  // skip straight to the root which will redirect to home.
  const alreadyInjected = !!SecureStore.getItem("flatsby_cookie");
  if (alreadyInjected) {
    return <Redirect href="/" />;
  }

  return <E2ELoginEffect token={token} apiUrl={apiUrl} />;
}

function E2ELoginEffect({
  token,
  apiUrl,
}: {
  token: string | undefined;
  apiUrl: string | undefined;
}) {
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

      // Reload the app so the auth client picks up both the API URL
      // and the cookie on fresh initialisation.
      await Updates.reloadAsync();
    };

    void injectSession();
  }, [token, apiUrl]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
