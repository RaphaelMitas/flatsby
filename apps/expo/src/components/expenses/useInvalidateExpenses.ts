import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { trpc } from "~/utils/api";

/**
 * Hook that provides invalidation functions for expense queries.
 * This reduces duplicate code across expense components.
 */
export function useInvalidateExpenses(groupId: number) {
  const queryClient = useQueryClient();

  const expenseListQueryKey = useMemo(
    () =>
      trpc.expense.getGroupExpenses.infiniteQueryKey({
        groupId,
        limit: PAGE_SIZE.expenses,
      }),
    [groupId],
  );

  const invalidateList = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: expenseListQueryKey });
  }, [queryClient, expenseListQueryKey]);

  const invalidateDebtSummary = useCallback(() => {
    return queryClient.invalidateQueries(
      trpc.expense.getDebtSummary.queryOptions({ groupId }),
    );
  }, [queryClient, groupId]);

  const invalidateExpense = useCallback(
    (expenseId: number) => {
      return queryClient.invalidateQueries(
        trpc.expense.getExpense.queryOptions({ expenseId }),
      );
    },
    [queryClient],
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
    invalidateList,
    invalidateDebtSummary,
    invalidateExpense,
    invalidateAll,
  };
}
