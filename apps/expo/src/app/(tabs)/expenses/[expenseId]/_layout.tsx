import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ExpenseDetailLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen options={{ presentation: "modal" }} name="edit" />
    </Stack>
  );
}
