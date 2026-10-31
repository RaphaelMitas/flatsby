"use client";

import type { ExpenseListFilter } from "@flatsby/validators/expenses/list-filter";
import Link from "next/link";
import {
  keepPreviousData,
  useInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { HandCoins, Plus, Search, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { InView } from "react-intersection-observer";

import {
  expenseSearchView,
  useExpenseFilters,
} from "@flatsby/api/hooks/useExpenseFilters";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { ExpenseCard } from "./ExpenseCard";
import { ExpenseFilterBar } from "./ExpenseFilterBar";

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
  const { currentGroup } = useGroupContext();

  const groupId = currentGroup?.id ?? 0;
  const filters = useExpenseFilters(groupId);

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const listOptions = (filter: ExpenseListFilter) =>
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId, limit: PAGE_SIZE.expenses, ...filter },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    );
  const base = useInfiniteQuery(listOptions({}));
  const filtered = useInfiniteQuery({
    ...listOptions(filters.query),
    enabled: filters.isQueryActive,
    placeholderData: keepPreviousData,
  });
  const search = expenseSearchView(base, filtered, filters);

  if (!groupData.success) {
    return null;
  }

  const hasExpenses = search.rows.length > 0;
  const showFilters = hasExpenses || filters.isActive;

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

      {showFilters && (
        <ExpenseFilterBar
          groupId={groupId}
          filters={filters}
          members={groupData.data.groupMembers}
          meId={groupData.data.thisGroupMember.id}
        />
      )}
      {search.offline && (
        <p className="text-muted-foreground bg-muted mx-4 mt-3 rounded-md px-3 py-2 text-sm">
          {t("expenses.filter.offline")}
        </p>
      )}

      {/* Expense List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {!hasExpenses && search.searching ? (
            <div className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-sm">
              <LoadingSpinner />
              {t("expenses.filter.searchingOlder")}
            </div>
          ) : !hasExpenses && filters.isActive ? (
            <div
              data-testid="expense-search-empty"
              className="flex flex-col items-center justify-center gap-4 py-12 text-center"
            >
              <Search className="text-muted-foreground h-12 w-12" />
              <div>
                <p className="text-lg font-semibold">
                  {t("expenses.filter.noResultsTitle")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("expenses.filter.noResultsHint")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={filters.reset}
                data-testid="expense-search-reset"
              >
                {t("expenses.filter.reset")}
              </Button>
            </div>
          ) : !hasExpenses ? (
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
              {search.rows.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  isNotConverted={isLeftUnconverted(expense, groupData.data)}
                  isSelected={expense.id === selectedExpenseId}
                  onSelect={() => onSelectExpense(expense.id)}
                />
              ))}

              {search.hasMore && (
                <InView
                  as="div"
                  // Re-observing after each page fires again when the sentinel never left view
                  skip={search.isFetchingMore}
                  onChange={(inView) => {
                    if (inView) search.loadMore();
                  }}
                >
                  <div className="flex justify-center py-4">
                    <LoadingSpinner />
                  </div>
                </InView>
              )}
              {search.searching && (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                  <LoadingSpinner />
                  {t("expenses.filter.loadingOlder")}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
