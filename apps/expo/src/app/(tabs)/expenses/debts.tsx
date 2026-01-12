import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { DebtSummaryView } from "~/components/expenses/DebtSummaryView";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useShoppingStore } from "~/utils/shopping-store";

export default function DebtsPage() {
  const { selectedGroupId } = useShoppingStore();
  const router = useRouter();

  if (!selectedGroupId) {
    return (
      <SafeAreaView>
        <View className="flex-1 flex-col items-center justify-center gap-4 p-4">
          <Text className="text-muted-foreground text-center">
            No group selected. Please select a group first.
          </Text>
          <Button
            title="Go to groups"
            onPress={() => router.push("/(tabs)/home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Suspense
      fallback={
        <SafeAreaView>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">
              Loading debt summary...
            </Text>
          </View>
        </SafeAreaView>
      }
    >
      <SafeAreaView>
        <DebtSummaryView groupId={selectedGroupId} />
      </SafeAreaView>
    </Suspense>
  );
}
