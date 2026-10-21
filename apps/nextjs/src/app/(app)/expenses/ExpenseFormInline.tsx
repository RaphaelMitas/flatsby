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
  closeOnSubmit?: boolean;
}

export function ExpenseFormInline({
  group,
  expense,
  onClose,
  onSuccess,
  closeOnSubmit,
}: ExpenseFormInlineProps) {
  const formState = useExpenseForm({
    group,
    expense,
    onClose,
    onSuccess,
    closeOnSubmit,
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <ExpenseFormContent formState={formState} />
    </div>
  );
}
