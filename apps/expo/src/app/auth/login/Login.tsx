"use client";

import { useState } from "react";
import { Text, View } from "react-native";
import * as Linking from "expo-linking";
import { Redirect, Stack } from "expo-router";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { authClient, signIn } from "~/utils/auth/auth-client";

const Login = () => {
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");
  const { data: session } = authClient.useSession();

  const callbackURL = Linking.createURL("/");

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 bg-background px-6 py-8">
      <Stack.Screen name="/auth/login" options={{ headerShown: false }} />
      <View className="flex-1 justify-center">
        {/* Header Section */}
        <View className="mb-12 items-center">
          <Icon
            name="flatsby"
            className="mb-6 h-40 w-full text-primary"
            size={160}
          />
          <Text className="mb-2 text-3xl font-bold text-foreground">
            Flatsby
          </Text>
          <Text className="text-center text-base leading-relaxed text-muted-foreground">
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
      </View>
    </View>
  );
};

export default Login;
