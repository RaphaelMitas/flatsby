import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";

import type { RouterOutputs } from ".";
import type { QuerySnapshot } from "./resultMutation";

export type ExpenseListData = InfiniteData<
  RouterOutputs["expense"]["getGroupExpenses"],
  unknown
>;

export const cancelExpenseLists = (
  queryClient: QueryClient,
  listKey: QueryKey,
) =>
  queryClient.cancelQueries({
    queryKey: listKey,
    predicate: (query) => query.state.data !== undefined,
  });

export function patchExpenseLists(
  queryClient: QueryClient,
  listKey: QueryKey,
  patch: (old: ExpenseListData) => ExpenseListData,
): QuerySnapshot {
  const unfiltered = hashKey(listKey);
  queryClient.removeQueries({
    queryKey: listKey,
    type: "inactive",
    predicate: (query) => query.queryHash !== unfiltered,
  });
  const snapshot = queryClient
    .getQueriesData<ExpenseListData>({ queryKey: listKey })
    .map(([queryKey, previous]) => ({ queryKey, previous }));
  queryClient.setQueriesData<ExpenseListData>(
    { queryKey: listKey },
    (old) => old && patch(old),
  );
  return snapshot;
}
