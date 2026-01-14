import { Text, View } from "react-native";

import { ChatExpenseCard } from "./ChatExpenseCard";

interface ExpenseOutput {
  id: number;
  description: string | null;
  amountInCents: number;
  currency: string;
  paidByMember: string;
  expenseDate: string;
}

interface ExpenseListCardProps {
  expenses: ExpenseOutput[];
  groupName: string;
}

export function ExpenseListCard({ expenses, groupName }: ExpenseListCardProps) {
  if (expenses.length === 0) {
    return (
      <View className="py-2">
        <Text className="text-muted-foreground text-sm">
          No recent expenses in {groupName}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-sm">
        Recent Expenses in {groupName}
      </Text>
      {expenses.map((expense) => (
        <ChatExpenseCard key={expense.id} expenseId={expense.id} />
      ))}
    </View>
  );
}
