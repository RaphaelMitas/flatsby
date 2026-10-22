import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useSolidHeader, useThemedScreenOptions } from "~/lib/utils";

export default function ExpensesLayout() {
  const themedScreenOptions = useThemedScreenOptions();
  const solidHeader = useSolidHeader();
  const t = useTranslations();

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
          headerTitle: t("expenses.addExpense"),
          headerBackTitle: t("expenses.backToExpenses"),
          ...solidHeader,
        }}
      />
      <Stack.Screen
        name="debts"
        options={{
          headerShown: true,
          headerTitle: t("navigation.debts"),
          headerBackTitle: t("navigation.expenses"),
          ...solidHeader,
        }}
      />
      <Stack.Screen
        name="settle"
        options={{
          headerShown: true,
          headerTitle: t("debts.settleUp"),
          headerBackTitle: t("common.back"),
        }}
      />
      <Stack.Screen
        name="[expenseId]"
        options={{
          headerShown: true,
          headerTitle: t("expenses.expenseDetails"),
          headerBackTitle: t("common.back"),
          ...solidHeader,
        }}
      />
    </Stack>
  );
}
