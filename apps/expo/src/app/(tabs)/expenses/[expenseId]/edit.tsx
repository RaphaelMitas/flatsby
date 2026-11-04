import type { GroupWithAccess } from "@flatsby/api";
import { useLocalSearchParams } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { ExpenseForm } from "~/components/expenses/ExpenseForm";
import { GroupGate } from "~/components/GroupGate";
import { ErrorMessage } from "~/lib/ui/error-message";
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
    return <ErrorMessage message={t("expenses.failedToLoadExpense")} />;
  }

  return <ExpenseForm group={group} expense={expenseData.data} />;
}
