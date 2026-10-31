"use client";

import Link from "next/link";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { HandCoins, Plus, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { InView } from "react-intersection-observer";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { withMonthHeaders } from "@flatsby/validators/expenses/formatting";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
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
  const t = useTranslations();
  const locale = useLocale();
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
      { groupId, limit: PAGE_SIZE.expenses },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  if (!groupData.success) {
    return null;
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
        <h2
          data-testid="expense-heading"
          className="text-xl font-bold tracking-tight"
        >
          {t("navigation.expenses")}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            asChild
            size="sm"
            data-testid="expense-debts-link"
          >
            <Link href="/expenses/debts">
              <HandCoins className="mr-2 h-4 w-4" />
              {t("navigation.debts")}
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={onCreateExpense}
            data-testid="expense-add-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("expenses.add")}
          </Button>
        </div>
      </div>

      {/* Expense List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col px-4 pb-4">
          {!hasExpenses ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Wallet className="text-muted-foreground h-12 w-12" />
              <div>
                <p className="text-lg font-semibold">
                  {t("expenses.emptyTitle")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("expenses.emptyHint")}
                </p>
              </div>
              <Button
                onClick={onCreateExpense}
                data-testid="expense-empty-add-button"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("expenses.addExpense")}
              </Button>
            </div>
          ) : (
            <>
              {withMonthHeaders(allExpenses, locale).map((item) =>
                item.type === "month" ? (
                  <h3
                    key={item.key}
                    className="text-muted-foreground px-1 pt-4 pb-2 text-sm font-semibold"
                  >
                    {item.label}
                  </h3>
                ) : (
                  <ExpenseCard
                    key={item.key}
                    expense={item.expense}
                    meId={groupData.data.thisGroupMember.id}
                    first={item.first}
                    last={item.last}
                    isNotConverted={isLeftUnconverted(
                      item.expense,
                      groupData.data,
                    )}
                    isSelected={item.expense.id === selectedExpenseId}
                    onSelect={() => onSelectExpense(item.expense.id)}
                  />
                ),
              )}

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
