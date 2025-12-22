import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { WrappedExperience } from "~/components/wrapped/WrappedExperience";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";

export default function WrappedScreen() {
  const router = useRouter();

  const { data: result } = useSuspenseQuery(
    trpc.wrapped.getUserWrappedSummary.queryOptions({}),
  );

  if (!result.success) {
    handleApiError({ router, error: result.error });
    return (
      <SafeAreaView className="bg-background flex-1 items-center justify-center">
        <Text className="text-destructive">
          Failed to load your wrapped summary
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <WrappedExperience summary={result.data} onClose={() => router.back()} />
  );
}

export function WrappedScreenFallback() {
  return (
    <SafeAreaView className="bg-background flex-1 items-center justify-center">
      <View className="items-center gap-4">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground">Loading your year...</Text>
      </View>
    </SafeAreaView>
  );
}
