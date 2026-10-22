import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { useSolidHeader, useThemedScreenOptions } from "~/lib/utils";

export default function ExpenseDetailLayout() {
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
