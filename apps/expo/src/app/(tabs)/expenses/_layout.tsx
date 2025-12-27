import { Stack } from "expo-router";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ExpensesLayout() {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[expenseId]" />
    </Stack>
  );
}
