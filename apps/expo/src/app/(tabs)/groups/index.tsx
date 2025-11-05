import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";
import Icon from "~/lib/ui/custom/icons/Icon";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  // Wait for session check to complete before redirecting
  if (isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Icon name="loader" size={32} className="text-primary" />
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
