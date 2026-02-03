"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";

import { ExpenseFormContent } from "./ExpenseFormContent";
import { useExpenseForm } from "./useExpenseForm";

interface ExpenseFormInlineProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  onSuccess?: (expenseId: number) => void;
}

export function ExpenseFormInline({
  group,
  expense,
  onClose,
  onSuccess,
}: ExpenseFormInlineProps) {
  const formState = useExpenseForm({ group, expense, onClose, onSuccess });

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <ExpenseFormContent formState={formState} />
    </div>
  );
}
