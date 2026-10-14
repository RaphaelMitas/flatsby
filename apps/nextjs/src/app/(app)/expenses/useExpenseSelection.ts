"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type ExpenseAction = "view" | "create" | "edit";

interface ExpenseSelection {
  selectedExpenseId: number | null;
  action: ExpenseAction | null;
  selectExpense: (expenseId: number) => void;
  editExpense: (expenseId: number) => void;
  createExpense: () => void;
  clearSelection: () => void;
}

export function useExpenseSelection(): ExpenseSelection {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedParam = searchParams.get("selected");
  const actionParam = searchParams.get("action");

  const selectedExpenseId = selectedParam ? parseInt(selectedParam, 10) : null;
  const action: ExpenseAction | null =
    actionParam === "create"
      ? "create"
      : actionParam === "edit"
        ? "edit"
        : selectedExpenseId
          ? "view"
          : null;

  const updateUrl = useCallback(
    (params: { selected?: number | null; action?: string | null }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.selected !== undefined) {
        if (params.selected === null) {
          newParams.delete("selected");
        } else {
          newParams.set("selected", params.selected.toString());
        }
      }

      if (params.action !== undefined) {
        if (params.action === null) {
          newParams.delete("action");
        } else {
          newParams.set("action", params.action);
        }
      }

      const queryString = newParams.toString();
      router.push(`/expenses${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const selectExpense = useCallback(
    (expenseId: number) => {
      updateUrl({ selected: expenseId, action: null });
    },
    [updateUrl],
  );

  const editExpense = useCallback(
    (expenseId: number) => {
      updateUrl({ selected: expenseId, action: "edit" });
    },
    [updateUrl],
  );

  const createExpense = useCallback(() => {
    updateUrl({ selected: null, action: "create" });
  }, [updateUrl]);

  const clearSelection = useCallback(() => {
    updateUrl({ selected: null, action: null });
  }, [updateUrl]);

  return {
    selectedExpenseId,
    action,
    selectExpense,
    editExpense,
    createExpense,
    clearSelection,
  };
}
