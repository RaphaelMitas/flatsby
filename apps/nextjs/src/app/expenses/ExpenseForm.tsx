"use client";

import type {
  ExpenseWithSplitsAndMembers,
  GroupWithAccess,
} from "@flatsby/api";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@flatsby/ui/sheet";

import { ExpenseFormContent } from "./ExpenseFormContent";
import { useExpenseForm } from "./useExpenseForm";

interface ExpenseFormProps {
  group: GroupWithAccess;
  expense?: ExpenseWithSplitsAndMembers;
  onClose: () => void;
  open: boolean;
}

export function ExpenseForm({
  group,
  expense,
  onClose,
  open,
}: ExpenseFormProps) {
  const formState = useExpenseForm({ group, expense, onClose });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {formState.isEditMode ? "Edit Expense" : "Add Expense"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ExpenseFormContent formState={formState} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
