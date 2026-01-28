"use client";

import Link from "next/link";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { InView } from "react-intersection-observer";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { ScrollArea } from "@flatsby/ui/scroll-area";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ExpenseCard } from "./ExpenseCard";

interface ExpenseListPanelProps {
  selectedExpenseId: number | null;
  onSelectExpense: (expenseId: number) => void;
  onCreateExpense: () => void;
}

export function ExpenseListPanel({
  selectedExpenseId,
  onSelectExpense,
  onCreateExpense,
}: ExpenseListPanelProps) {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();

  const groupId = currentGroup?.id ?? 0;

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const {
    data: expensesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId, limit: 20 },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const allExpenses =
    expensesData?.pages
      .flatMap((page) => (page.success === true ? page.data.items : []))
      .filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e.id === expense.id),
      ) ?? [];

  const hasExpenses = allExpenses.length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <h2 className="text-xl font-bold tracking-tight">Expenses</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href="/expenses/debts">
              <Receipt className="mr-2 h-4 w-4" />
              Debts
            </Link>
          </Button>
          <Button size="sm" onClick={onCreateExpense}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Expense List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {!hasExpenses ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Receipt className="text-muted-foreground h-12 w-12" />
              <div>
                <p className="text-lg font-semibold">No expenses yet</p>
                <p className="text-muted-foreground text-sm">
                  Start tracking expenses by adding your first one
                </p>
              </div>
              <Button onClick={onCreateExpense}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          ) : (
            <>
              {allExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  isSelected={expense.id === selectedExpenseId}
                  onSelect={() => onSelectExpense(expense.id)}
                />
              ))}

              {hasNextPage && (
                <InView
                  as="div"
                  onChange={(inView) => {
                    if (inView && !isFetchingNextPage) {
                      void fetchNextPage();
                    }
                  }}
                >
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                </InView>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
