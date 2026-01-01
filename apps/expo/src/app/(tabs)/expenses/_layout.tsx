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
      <Stack.Screen
        name="create"
        options={{
          headerShown: true,
          headerTitle: "Add Expense",
          headerBackTitle: "Back to Expenses",
        }}
      />
      <Stack.Screen name="debts" />
      <Stack.Screen
        name="settle"
        options={{
          headerShown: true,
          headerTitle: "Settle Up",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="[expenseId]"
        options={{
          headerShown: true,
          headerTitle: "Expense Details",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
