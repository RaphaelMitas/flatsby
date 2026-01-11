import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ChatLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="new"
        options={{
          headerShown: true,
          headerTitle: "New Chat",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="[conversationId]"
        options={{
          headerShown: true,
          headerTitle: "Chat",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
