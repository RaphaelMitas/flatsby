import type {
  ExpenseFilterChoice,
  ExpenseListFilter,
  FilterableExpense,
} from "@flatsby/validators/expenses/list-filter";
import { useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";

import {
  dayRangeFilter,
  isExpenseFilterActive,
  matchesExpenseFilter,
} from "@flatsby/validators/expenses/list-filter";

const noChoice: ExpenseFilterChoice = { memberRole: "any" };

const toFilter = (
  search: string,
  { memberId, memberRole, category, range }: ExpenseFilterChoice,
): ExpenseListFilter => ({
  ...(search && { search }),
  ...(memberId !== undefined && { memberId, memberRole }),
  ...(category && { category }),
  ...(range && dayRangeFilter(range)),
});

/** Filters reset when the group changes, since its members and history differ. */
export function useExpenseFilters(groupId: number) {
  const [state, setState] = useState({ groupId, search: "", choice: noChoice });
  const current =
    state.groupId === groupId
      ? state
      : { groupId, search: "", choice: noChoice };
  const typed = current.search.trim();
  const [debounced] = useDebouncedValue(typed, { wait: 200 });
  // Clearing the field goes back to the cached list without waiting
  const sent = typed === "" ? "" : debounced;
  const live = toFilter(typed, current.choice);
  const query = toFilter(sent, current.choice);

  return {
    search: current.search,
    choice: current.choice,
    setSearch: (search: string) => setState({ ...current, search }),
    choose: (patch: Partial<ExpenseFilterChoice>) =>
      setState({ ...current, choice: { ...current.choice, ...patch } }),
    clearChoice: () => setState({ ...current, choice: noChoice }),
    reset: () => setState({ groupId, search: "", choice: noChoice }),
    live,
    query,
    isActive: isExpenseFilterActive(live),
    isQueryActive: isExpenseFilterActive(query),
    isDebouncing: typed !== sent,
  };
}

type ExpenseFilters = ReturnType<typeof useExpenseFilters>;

interface ListQuery<T> {
  data?: {
    pages: ({ success: true; data: { items: T[] } } | { success: false })[];
  };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  fetchStatus: "fetching" | "paused" | "idle";
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

const itemsOf = <T>(query: ListQuery<T>) =>
  query.data?.pages.flatMap((page) => (page.success ? page.data.items : [])) ??
  [];

/**
 * Shows every cached expense that matches what is on screen right now, and
 * lets the filtered query add older matches underneath as they arrive.
 */
export function expenseSearchView<T extends FilterableExpense & { id: number }>(
  base: ListQuery<T>,
  filtered: ListQuery<T>,
  filters: ExpenseFilters,
) {
  const byId = new Map<number, T>();
  const sources = filters.isQueryActive ? [base, filtered] : [base];
  for (const item of sources.flatMap(itemsOf)) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const all = [...byId.values()];
  const rows = filters.isActive
    ? all
        .filter((expense) => matchesExpenseFilter(expense, filters.live))
        .sort(
          (a, b) =>
            new Date(b.expenseDate).getTime() -
              new Date(a.expenseDate).getTime() || b.id - a.id,
        )
    : all;

  const offline =
    filters.isQueryActive &&
    (filtered.fetchStatus === "paused" || filtered.isError);
  const searching =
    filters.isActive &&
    !offline &&
    (filters.isDebouncing || filtered.isPending || filtered.isPlaceholderData);
  const source = filters.isActive ? filtered : base;
  const canLoadMore =
    (!filters.isActive || filters.isQueryActive) && !searching;

  return {
    rows,
    searching,
    offline,
    hasMore: canLoadMore && source.hasNextPage,
    isFetchingMore: source.isFetchingNextPage,
    loadMore: () => {
      if (canLoadMore && source.hasNextPage && !source.isFetchingNextPage) {
        void source.fetchNextPage();
      }
    },
    refetch: () =>
      Promise.all([
        base.refetch(),
        filters.isQueryActive && filtered.refetch(),
      ]),
  };
}
