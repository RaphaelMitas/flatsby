import type { GroupWithAccess } from "@flatsby/api";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { GroupGate } from "~/components/GroupGate";
import { trpc } from "~/utils/api";

export default function EditExpensePage() {
  const params = useLocalSearchParams<{ expenseId: string }>();
  const expenseId = parseInt(params.expenseId, 10);

  return (
    <GroupGate>
      {(group) => <EditExpense group={group} expenseId={expenseId} />}
    </GroupGate>
  );
}

function EditExpense({
  group,
  expenseId,
}: {
  group: GroupWithAccess;
  expenseId: number;
}) {
  const t = useTranslations();
  const { data: expenseData } = useSuspenseQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (!expenseData.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {t("expenses.failedToLoadExpense")}
        </Text>
      </View>
    );
  }

  return <ExpenseForm group={group} expense={expenseData.data} />;
}
