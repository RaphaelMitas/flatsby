import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslations } from "use-intl";

import { ExpenseDetailView } from "~/components/expenses/ExpenseDetailView";
import { useShoppingStore } from "~/utils/shopping-store";

export default function ExpenseDetailPage() {
  const params = useLocalSearchParams<{ expenseId: string }>();
  const expenseId = params.expenseId ? parseInt(params.expenseId, 10) : null;
  const { selectedGroupId } = useShoppingStore();
  const t = useTranslations();

  if (!expenseId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">
          {t("expenses.noExpenseId")}
        </Text>
      </View>
    );
  }

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground">
          {t("common.noGroupSelected")}
        </Text>
      </View>
    );
  }

  return <ExpenseDetailView expenseId={expenseId} groupId={selectedGroupId} />;
}
