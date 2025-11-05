import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useThemeColors } from "~/lib/utils";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const {
    data: session,
    status,
    isLoading,
    isFetching,
    fetchStatus,
  } = authClient.useSession();
  const { getColor } = useThemeColors();

  const isSessionLoading =
    status === "pending" || isLoading || isFetching || fetchStatus === "fetching";

  if (isSessionLoading) {
    return (
      <SafeAreaView className="bg-background">
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator color={getColor("primary")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <SafeAreaView className="bg-background">
      <View className="h-full w-full bg-background p-4">
        <GroupsDashboard />
      </View>
    </SafeAreaView>
  );
}
