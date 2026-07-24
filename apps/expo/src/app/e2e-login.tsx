import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Updates from "expo-updates";

import { authClient } from "~/utils/auth/auth-client";
import { isE2EBuild, setE2EConfig } from "~/utils/e2e-config";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function E2ELogin() {
  const params = useLocalSearchParams<{ apiUrl?: string; bypass?: string }>();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const apiUrl = firstParam(params.apiUrl);
  const bypass = firstParam(params.bypass);

  useEffect(() => {
    if (!isE2EBuild() || !apiUrl || started.current) {
      return;
    }
    started.current = true;
    const bootstrap = async () => {
      await setE2EConfig({ apiUrl, bypass });
      await authClient.$fetch(`${apiUrl}/api/e2e/create-session`, {
        method: "POST",
        headers: bypass ? { "x-vercel-protection-bypass": bypass } : {},
      });
      await Updates.reloadAsync();
    };
    bootstrap().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [apiUrl, bypass]);

  if (!isE2EBuild()) {
    return <Redirect href="/" />;
  }

  if (!apiUrl) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text testID="e2e-login-error" className="text-foreground">
          missing apiUrl
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text testID="e2e-login-error" className="text-foreground">
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View
      testID="e2e-login-screen"
      className="bg-background flex-1 items-center justify-center"
    >
      <ActivityIndicator />
    </View>
  );
}
