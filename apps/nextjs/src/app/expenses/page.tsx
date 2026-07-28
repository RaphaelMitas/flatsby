import { Suspense } from "react";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ExpensesSplitView } from "./ExpensesSplitView";

export default async function ExpensesPage(props: {
  searchParams: Promise<{ selected?: string; action?: string }>;
}) {
  const searchParams = await props.searchParams;
  const userWithGroups = await caller.user.getCurrentUserWithGroups();

  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    return null;
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch initial expenses and group data
  prefetch(
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId, limit: PAGE_SIZE.expenses },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));

  // Prefetch selected expense if present
  if (searchParams.selected) {
    const expenseId = parseInt(searchParams.selected, 10);
    if (!isNaN(expenseId)) {
      prefetch(trpc.expense.getExpense.queryOptions({ expenseId }));
    }
  }

  return (
    <HydrateClient>
      <div className="flex h-full flex-1 flex-col">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner />
            </div>
          }
        >
          <ExpensesSplitView />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
