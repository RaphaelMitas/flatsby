import { HydrateClient, prefetch, trpc, caller } from "~/trpc/server";
import { ExpenseDashboard } from "./ExpenseDashboard";

export default async function ExpensesPage() {
  const userWithGroups = await caller.user.getCurrentUserWithGroups();

  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    return null;
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch initial expenses and group data
  prefetch(trpc.expense.getGroupExpenses.queryOptions({ groupId, limit: 20 }));
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-prose flex-col p-4 md:p-6">
        <ExpenseDashboard />
      </div>
    </HydrateClient>
  );
}
