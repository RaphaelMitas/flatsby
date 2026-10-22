import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useThemedScreenOptions } from "~/lib/utils";

export default function ExpenseDetailLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const t = useTranslations();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...screenOptions,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("expenses.editExpense"),
          headerBackTitle: t("common.back"),
          ...solidHeader,
        }}
        name="edit"
      />
    </Stack>
  );
}
