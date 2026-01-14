"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { InView } from "react-intersection-observer";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";
import { ExpenseCard } from "./ExpenseCard";
import { ExpenseForm } from "./ExpenseForm";

export function ExpenseDashboard() {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const groupId = currentGroup?.id ?? 0;

  // Get group members for the form
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  // Get expenses with infinite scroll
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
    <div className="flex w-full max-w-prose flex-col gap-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Expenses
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link href="/expenses/debts">
              <Receipt className="mr-2 h-4 w-4" />
              Debts
            </Link>
          </Button>
          <Button asChild size="sm">
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      {!hasExpenses ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <Receipt className="text-muted-foreground h-12 w-12" />
          <div>
            <p className="text-lg font-semibold">No expenses yet</p>
            <p className="text-muted-foreground text-sm">
              Start tracking expenses by adding your first one
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allExpenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}

          {/* Infinite Scroll Trigger */}
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
        </div>
      )}

      {/* Create Expense Form */}
      {showCreateForm && (
        <ExpenseForm
          group={groupData.data}
          onClose={() => setShowCreateForm(false)}
          open={showCreateForm}
        />
      )}
    </div>
  );
}
