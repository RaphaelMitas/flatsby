"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { ExpenseCard } from "~/app/expenses/ExpenseCard";
import { useTRPC } from "~/trpc/react";

interface ChatExpenseCardProps {
  expenseId: number;
}

export function ChatExpenseCard({ expenseId }: ChatExpenseCardProps) {
  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.expense.getExpense.queryOptions({ expenseId }),
  );

  if (isLoading) {
    return (
      <div className="bg-muted my-2 flex h-24 max-w-sm items-center justify-center rounded-lg">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (error || !data?.success) {
    return null;
  }

  const expense = data.data;

  return (
    <div className="my-2 max-w-sm">
      <ExpenseCard expense={expense} />
    </div>
  );
}
