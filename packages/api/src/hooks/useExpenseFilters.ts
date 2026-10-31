import type {
  ExpenseFilterChoice,
  ExpenseListFilter,
} from "@flatsby/validators/expenses/list-filter";
import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";

import { localDate } from "@flatsby/validators/calendar";
import {
  dayRangeFilter,
  isExpenseFilterActive,
  matchesExpenseFilter,
  presetRange,
} from "@flatsby/validators/expenses/list-filter";

import type { ExpenseWithSplitsAndMembers } from "..";
import type { ExpenseListData } from "../expenseListCache";

const noChoice: ExpenseFilterChoice = { memberRole: "any" };

const toFilter = (
  search: string,
  { memberId, memberRole, category, range }: ExpenseFilterChoice,
): ExpenseListFilter => ({
  ...(search && { search }),
  ...(memberId !== undefined && { memberId, memberRole }),
  ...(category && { category }),
  // A preset means "this month" whenever it runs, not the month it was picked in
  ...(range &&
    dayRangeFilter(
      range.preset ? presetRange(range.preset, localDate()) : range,
    )),
});

export function useExpenseFilters(groupId: number) {
  const fresh = { groupId, search: "", choice: noChoice };
  const [state, setState] = useState(fresh);
  // Another group's members and history make its filters meaningless here
  if (state.groupId !== groupId) setState(fresh);
  const current = state.groupId === groupId ? state : fresh;
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
    reset: () => setState(fresh),
    live,
    query,
    isActive: isExpenseFilterActive(live),
    hasChoice: isExpenseFilterActive(toFilter("", current.choice)),
    isQueryActive: isExpenseFilterActive(query),
    isDebouncing: typed !== sent,
  };
}

type ExpenseFilters = ReturnType<typeof useExpenseFilters>;

type ListQuery = UseInfiniteQueryResult<ExpenseListData, unknown>;
type ListItem = ExpenseWithSplitsAndMembers;

const itemsOf = (query: ListQuery) =>
  query.data?.pages.flatMap((page) => (page.success ? page.data.items : [])) ??
  [];

// Cached matches show instantly; the filtered query appends older ones as they arrive
export function expenseSearchView(
  base: ListQuery,
  filtered: ListQuery,
  filters: ExpenseFilters,
) {
  const byId = new Map<number, ListItem>();
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
