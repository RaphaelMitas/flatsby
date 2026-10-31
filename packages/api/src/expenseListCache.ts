import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";

import type { RouterOutputs } from ".";
import type { QuerySnapshot } from "./resultMutation";

export type ExpenseListData = InfiniteData<
  RouterOutputs["expense"]["getGroupExpenses"],
  unknown
>;

/** The unfiltered list's key prefixes every filtered one, so this patches them all. */
export function patchExpenseLists(
  queryClient: QueryClient,
  listKey: QueryKey,
  patch: (old: ExpenseListData) => ExpenseListData,
): QuerySnapshot {
  const snapshot = queryClient
    .getQueriesData<ExpenseListData>({ queryKey: listKey })
    .map(([queryKey, previous]) => ({ queryKey, previous }));
  queryClient.setQueriesData<ExpenseListData>(
    { queryKey: listKey },
    (old) => old && patch(old),
  );
  return snapshot;
}
