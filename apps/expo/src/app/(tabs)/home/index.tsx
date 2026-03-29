import { View } from "react-native";
import { Redirect } from "expo-router";

import { Dashboard } from "~/components/dashboard/Dashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <View className="bg-background flex-1" />;
  }
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <SafeAreaView testID="home-screen">
      <Dashboard />
    </SafeAreaView>
  );
}
