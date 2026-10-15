import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ExpenseDetailLayout() {
  const themedScreenOptions = useThemedScreenOptions();
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
        options={{
          headerShown: true,
          headerTitle: t("expenses.editExpense"),
          headerBackTitle: t("common.back"),
        }}
        name="edit"
      />
    </Stack>
  );
}
