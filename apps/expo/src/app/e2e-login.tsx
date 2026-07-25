import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { isE2EBuild, setE2EConfig } from "~/utils/e2e-config";

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

interface SessionCookie {
  name: string;
  value: string;
  expires?: number;
}

const isSessionCookie = (v: unknown): v is SessionCookie =>
  typeof v === "object" &&
  v !== null &&
  "name" in v &&
  typeof v.name === "string" &&
  "value" in v &&
  typeof v.value === "string" &&
  (!("expires" in v) ||
    v.expires === undefined ||
    typeof v.expires === "number");

export default function E2ELogin() {
  const params = useLocalSearchParams<{ apiUrl?: string; bypass?: string }>();
  const [done, setDone] = useState(false);
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

      const res = await fetch(`${apiUrl}/api/e2e/create-session`, {
        method: "POST",
        headers: bypass ? { "x-vercel-protection-bypass": bypass } : {},
      });
      if (!res.ok) throw new Error(`create-session failed: ${res.status}`);

      const body: unknown = await res.json();
      if (
        typeof body !== "object" ||
        body === null ||
        !("cookies" in body) ||
        !Array.isArray(body.cookies)
      ) {
        throw new Error("create-session response missing cookies");
      }

      const cookieStore: Record<
        string,
        { value: string; expires: string | null }
      > = {};
      for (const c of body.cookies) {
        if (!isSessionCookie(c)) continue;
        cookieStore[c.name] = {
          value: c.value,
          expires: c.expires ? new Date(c.expires * 1000).toISOString() : null,
        };
      }
      await SecureStore.setItemAsync(
        "flatsby_cookie",
        JSON.stringify(cookieStore),
      );

      setDone(true);
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

  if (done) {
    return (
      <View
        testID="e2e-bootstrap-done"
        className="bg-background flex-1 items-center justify-center"
      >
        <Text className="text-foreground">session ready</Text>
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
