import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { DebtSummaryView } from "./DebtSummaryView";

export default async function DebtsPage() {
  const userWithGroups = await caller.user.getCurrentUserWithGroups();

  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    return null;
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch debt summary and group data
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-prose flex-col p-4 md:p-6">
        <DebtSummaryView />
      </div>
    </HydrateClient>
  );
}
