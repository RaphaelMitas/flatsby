import type { ExpenseListData } from "@flatsby/api/expenseListCache";
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { patchExpenseLists } from "@flatsby/api/expenseListCache";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useTRPC } from "~/trpc/react";

/**
 * Hook that provides invalidation functions for expense queries.
 * This reduces duplicate code across expense components.
 */
export function useExpenseInvalidation(groupId: number) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const expenseListQueryKey = useMemo(
    () =>
      trpc.expense.getGroupExpenses.infiniteQueryKey({
        groupId,
        limit: PAGE_SIZE.expenses,
      }),
    [trpc, groupId],
  );

  const patchLists = useCallback(
    (patch: (old: ExpenseListData) => ExpenseListData) =>
      patchExpenseLists(queryClient, expenseListQueryKey, patch),
    [queryClient, expenseListQueryKey],
  );

  const invalidateList = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: expenseListQueryKey });
  }, [queryClient, expenseListQueryKey]);

  const debtSummaryQueryKey = useMemo(
    () => trpc.expense.getDebtSummary.queryKey({ groupId }),
    [trpc, groupId],
  );

  const invalidateDebtSummary = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: debtSummaryQueryKey }),
      queryClient.invalidateQueries(trpc.expense.getPairActivity.pathFilter()),
    ]);
  }, [queryClient, trpc, debtSummaryQueryKey]);

  const invalidateExpense = useCallback(
    (expenseId: number) => {
      return queryClient.invalidateQueries(
        trpc.expense.getExpense.queryOptions({ expenseId }),
      );
    },
    [queryClient, trpc],
  );

  const invalidateAll = useCallback(
    (expenseId?: number) => {
      void invalidateList();
      void invalidateDebtSummary();
      if (expenseId !== undefined) {
        void invalidateExpense(expenseId);
      }
    },
    [invalidateList, invalidateDebtSummary, invalidateExpense],
  );

  return {
    expenseListQueryKey,
    debtSummaryQueryKey,
    patchLists,
    invalidateList,
    invalidateDebtSummary,
    invalidateExpense,
    invalidateAll,
  };
}
