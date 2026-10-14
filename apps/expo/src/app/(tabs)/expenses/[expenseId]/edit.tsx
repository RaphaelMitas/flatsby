import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function EditExpensePage() {
  const { selectedGroupId } = useShoppingStore();
  const t = useTranslations();
  const params = useLocalSearchParams<{ expenseId: string }>();
  const expenseId = parseInt(params.expenseId, 10);

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted-foreground text-center">
          {t("common.noGroupSelectedHint")}
        </Text>
      </View>
    );
  }
  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            {t("expenses.loadingExpenseData")}
          </Text>
        </View>
      }
    >
      <EditExpensePageInner
        selectedGroupId={selectedGroupId}
        expenseId={expenseId}
      />
    </Suspense>
  );
}

function EditExpensePageInner({
  selectedGroupId,
  expenseId,
}: {
  selectedGroupId: number;
  expenseId: number;
}) {
  const t = useTranslations();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId }),
  );
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (!groupData.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {t("expenses.failedToLoadGroup")}
        </Text>
      </View>
    );
  }

  if (!expenseData.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {t("expenses.failedToLoadExpense")}
        </Text>
      </View>
    );
  }

  return <ExpenseForm group={groupData.data} expense={expenseData.data} />;
}
