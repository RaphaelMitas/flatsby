import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { usePaneHeaderShown } from "~/components/splitview/usePaneHeaderShown";
import { useThemedScreenOptions } from "~/lib/utils";

export default function ExpenseDetailLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const t = useTranslations();
  const headerShown = usePaneHeaderShown();
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
          headerShown,
          headerTitle: t("expenses.editExpense"),
          headerBackTitle: t("common.back"),
          ...solidHeader,
        }}
        name="edit"
      />
    </Stack>
  );
}
