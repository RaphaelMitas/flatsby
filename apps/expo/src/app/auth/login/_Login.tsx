"use client";

import { useState } from "react";
import { Linking, Text, View } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Redirect, Stack } from "expo-router";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { authClient, signIn } from "~/utils/auth/auth-client";
import { getBaseUrl } from "~/utils/base-url";

const Login = () => {
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");
  const { data: session } = authClient.useSession();

  const callbackURL = ExpoLinking.createURL("/");

  if (session) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <View className="bg-background flex-1 px-6 py-8">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 justify-center">
        {/* Header Section */}
        <View className="mb-12 items-center">
          <Icon
            name="flatsby"
            className="text-primary mb-6 h-40 w-full"
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
