import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useTranslations } from "use-intl";

import { ExpenseListPanel } from "~/components/expenses/ExpenseListPanel";
import { useMediaQuery } from "~/components/splitview/useMediaQuery";
import { usePaneHeaderShown } from "~/components/splitview/usePaneHeaderShown";
import { TabSafeArea } from "~/lib/ui/safe-area";
import { useThemedScreenOptions } from "~/lib/utils";
import { useShoppingStore } from "~/utils/shopping-store";

export const unstable_settings = { anchor: "index" };

export default function ExpensesLayout() {
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const isLargeScreen = useMediaQuery("md");
  const headerShown = usePaneHeaderShown();
  const insets = useSafeAreaInsets();

  // The stack keeps its tree position across widths, so folding, unfolding or
  // rotating never remounts it and an open expense or edit survives.
  return (
    <TabSafeArea>
      <View className="flex-1 flex-row">
        {isLargeScreen && !!selectedGroupId && (
          <View className="border-border flex-1 border-r">
            <ExpenseListPanel />
          </View>
        )}
        <View
          className="flex-1"
          style={{ paddingTop: headerShown ? 0 : insets.top }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              ...screenOptions,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="create"
              options={{
                headerShown,
                headerTitle: t("expenses.addExpense"),
                headerBackTitle: t("expenses.backToExpenses"),
                ...solidHeader,
              }}
            />
            <Stack.Screen
              name="debts"
              options={{
                headerShown,
                headerTitle: t("navigation.debts"),
                headerBackTitle: t("navigation.expenses"),
                ...solidHeader,
              }}
            />
            <Stack.Screen
              name="settle"
              options={{
                headerShown,
                headerTitle: t("debts.settleUp"),
                headerBackTitle: t("common.back"),
              }}
            />
            <Stack.Screen
              name="[expenseId]"
              options={{
                headerShown,
                headerTitle: t("expenses.expenseDetails"),
                headerBackTitle: t("common.back"),
                ...solidHeader,
              }}
            />
          </Stack>
        </View>
      </View>
    </TabSafeArea>
  );
}
