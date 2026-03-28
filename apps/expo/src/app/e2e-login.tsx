import { useEffect } from "react";
import { Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * E2E-only deep link handler: flatsby://e2e-login?token=<session-token>
 *
 * Writes the session token as a cookie to SecureStore using the same key
 * format that @better-auth/expo uses ({storagePrefix}_cookie), then
 * navigates to the authenticated home screen.
 *
 * Guarded by __DEV__ so it is stripped from production builds.
 */
export default function E2ELogin() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!__DEV__) return;
    if (!token) return;

    const injectSession = async () => {
      // Write the token as a cookie string in the format @better-auth/expo expects.
      // The expo client reads from "{storagePrefix}_cookie" and parses it with getCookie().
      // The cookie format is: "better-auth.session_token=<token>"
      const cookieValue = `better-auth.session_token=${token}`;
      await SecureStore.setItemAsync("flatsby_cookie", cookieValue);

      // Navigate to the authenticated home screen
      router.replace("/(tabs)/home");
    };

    void injectSession();
  }, [token, router]);

  if (!__DEV__) {
    return null;
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Authenticating for E2E...</Text>
    </View>
  );
}
