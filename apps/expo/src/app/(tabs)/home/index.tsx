import { useEffect } from "react";
import { Text, View } from "react-native";
import { Redirect } from "expo-router";
import { TRPCClientError } from "@trpc/client";

import { Dashboard } from "~/components/dashboard/Dashboard";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient, signOut } from "~/utils/auth/auth-client";

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const data: unknown = error instanceof TRPCClientError ? error.data : null;
  const isUnauthorized =
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "UNAUTHORIZED";

  useEffect(() => {
    if (isUnauthorized) {
      void signOut();
    }
  }, [isUnauthorized]);

  if (isUnauthorized) {
    return null;
  }

  return (
    <SafeAreaView>
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Text className="text-foreground text-center text-lg font-semibold">
          Something went wrong
        </Text>
        <Text className="text-muted-foreground text-center text-sm">
          {error.message}
        </Text>
        <Button title="Retry" onPress={retry} variant="primary" size="lg" />
      </View>
    </SafeAreaView>
  );
}

export default function Index() {
  const { data: session } = authClient.useSession();

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <SafeAreaView>
      <Dashboard />
    </SafeAreaView>
  );
}
