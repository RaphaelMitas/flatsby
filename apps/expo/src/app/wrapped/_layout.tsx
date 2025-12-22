import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack } from "expo-router";

import { SafeAreaView } from "~/lib/ui/safe-area";
import { useThemedScreenOptions } from "~/lib/utils";

function LoadingFallback() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-zinc-950">
      <View className="items-center gap-4">
        <ActivityIndicator size="large" color="#a855f7" />
        <Text className="text-white/60">Loading your year...</Text>
      </View>
    </SafeAreaView>
  );
}

export default function WrappedLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
          ...themedScreenOptions,
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </Suspense>
  );
}
