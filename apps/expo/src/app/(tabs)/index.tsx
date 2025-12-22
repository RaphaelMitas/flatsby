import { Pressable, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";

import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { authClient } from "~/utils/auth/auth-client";

export default function Index() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <SafeAreaView className="bg-background">
      <View className="bg-background h-full w-full p-4">
        {/* Wrapped Banner */}
        <Pressable
          onPress={() => router.push("/wrapped")}
          className="border-border mb-4 overflow-hidden rounded-lg border p-4"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-foreground text-xs font-medium tracking-widest uppercase">
                Your year in review
              </Text>
              <Text className="text-foreground mt-1 text-xl font-bold">
                {new Date().getFullYear()} Wrapped
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
              <Icon name="sparkles" size={24} className="text-foreground" />
            </View>
          </View>
        </Pressable>

        <GroupsDashboard />
      </View>
    </SafeAreaView>
  );
}
