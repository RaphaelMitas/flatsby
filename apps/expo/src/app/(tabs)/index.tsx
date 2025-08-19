import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const { data: session } = authClient.useSession();

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
