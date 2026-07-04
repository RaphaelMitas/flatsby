"use client";

import { useCallback, useState } from "react";
import { Linking, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { Stack, useRouter } from "expo-router";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { signIn } from "~/utils/auth/auth-client";
import { getBaseUrl } from "~/utils/base-url";

const COOKIE_KEY = "flatsby_cookie";
const SESSION_DATA_KEY = "flatsby_session_data";

const Login = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<"apple" | "google" | "e2e" | "false">("false");
  const [e2eError, setE2eError] = useState("");
  const callbackURL = ExpoLinking.createURL("/");

  const handleE2eLogin = useCallback(async () => {
    setLoading("e2e");
    setE2eError("");
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/e2e/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`E2E session failed: ${res.status} ${body}`);
      }

      const data = (await res.json()) as {
        cookies: { name: string; value: string }[];
        userId: string;
        email: string;
      };

      const cookieJar: Record<string, { value: string; expires: string }> = {};
      const expiresInDays = 7;
      const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toUTCString();

      for (const cookie of data.cookies) {
        cookieJar[cookie.name] = {
          value: cookie.value,
          expires,
        };
      }

      await SecureStore.setItemAsync(COOKIE_KEY, JSON.stringify(cookieJar));
      await SecureStore.setItemAsync(SESSION_DATA_KEY, JSON.stringify({
        user: { id: data.userId, email: data.email },
        expires: expiresInDays,
      }));

      router.replace("/(tabs)/home");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setE2eError(message);
      setLoading("false");
    }
  }, [router]);

  return (
    <View testID="login-screen" className="bg-background flex-1 px-6 py-8">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-center">
        {/* Header Section */}
        <View className="mb-12 items-center">
          <Icon
            name="flatsby"
            className="mb-6 h-40 w-full"
            color="primary"
            size={160}
          />
          <Text className="text-foreground mb-2 text-3xl font-bold">
            Flatsby
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-relaxed">
            Manage your daily life with your flatmates.
          </Text>
        </View>

        {/* Auth Buttons Section */}
        <View className="w-full gap-4">
          <Button
            testID="sign-in-google-button"
            onPress={async () => {
              setLoading("google");
              await signIn.social({
                provider: "google",
                callbackURL,
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "google"
                ? "Signing in with Google"
                : "Sign in with Google"
            }
            icon={loading === "google" ? "loader" : "google"}
          />

          <Button
            testID="sign-in-apple-button"
            onPress={async () => {
              setLoading("apple");
              await signIn.social({
                provider: "apple",
                callbackURL,
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "apple"
                ? "Signing in with Apple"
                : "Sign in with Apple"
            }
            icon={loading === "apple" ? "loader" : "apple"}
          />

          {/* E2E Test Login Button */}
          <Button
            testID="sign-in-e2e-button"
            onPress={handleE2eLogin}
            disabled={loading !== "false"}
            className="w-full py-4"
            title={
              loading === "e2e"
                ? "Signing in..."
                : "Sign in (E2E Test)"
            }
            icon={loading === "e2e" ? "loader" : undefined}
            variant="secondary"
          />
          {e2eError ? (
            <Text testID="e2e-login-error" className="text-destructive text-center text-sm">
              {e2eError}
            </Text>
          ) : null}
        </View>

        {/* Legal Links */}
        <View className="mt-6 gap-2">
          <Text className="text-muted-foreground text-center text-xs">
            By signing in, you agree to our{" "}
            <Text
              className="underline"
              onPress={() => Linking.openURL(`${getBaseUrl()}/legal/terms`)}
            >
              Terms
            </Text>{" "}
            and{" "}
            <Text
              className="underline"
              onPress={() => Linking.openURL(`${getBaseUrl()}/legal/privacy`)}
            >
              Privacy Policy
            </Text>
          </Text>
          <Text
            className="text-muted-foreground text-center text-xs underline"
            onPress={() =>
              Linking.openURL(`${getBaseUrl()}/legal/legal-notice`)
            }
          >
            Legal Notice
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Login;
