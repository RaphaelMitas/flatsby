import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { ExpenseDisplay } from "~/components/expenses/ExpenseDisplay";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

interface ChatExpenseCardProps {
  expenseId: number;
}

export function ChatExpenseCard({ expenseId }: ChatExpenseCardProps) {
  const { data, isLoading, error } = useQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="items-center justify-center py-6">
          <Icon name="loader" size={20} color="muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.success) {
    return null;
  }

  const expense = data.data;
  const fromMember = expense.expenseSplits[0]?.groupMember;

  return (
    <Link href={`/(tabs)/expenses/${expense.id}`}>
      <ExpenseDisplay
        amountInCents={expense.amountInCents}
        currency={expense.currency}
        description={expense.description}
        paidByName={expense.paidByGroupMember.user.name}
        paidByImage={expense.paidByGroupMember.user.image}
        expenseDate={new Date(expense.expenseDate)}
        splitMethod={expense.splitMethod}
        splitCount={expense.expenseSplits.length}
        category={expense.category}
        fromName={fromMember?.user.name}
        fromImage={fromMember?.user.image}
      />
    </Link>
  );
}
