import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ExpenseDetailView } from "./ExpenseDetailView";

export default async function ExpenseDetailPage(props: {
  params: Promise<{ expenseId: string }>;
}) {
  const params = await props.params;
  const expenseId = parseInt(params.expenseId);

  const userWithGroups = await caller.user.getCurrentUserWithGroups();
  if (!userWithGroups.success || !userWithGroups.data.user?.lastGroupUsed) {
    return null;
  }

  const groupId = userWithGroups.data.user.lastGroupUsed.id;

  // Prefetch expense data
  prefetch(trpc.expense.getExpense.queryOptions({ expenseId }));
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-prose flex-col p-4 md:p-6">
        <ExpenseDetailView expenseId={expenseId} />
      </div>
    </HydrateClient>
  );
}
