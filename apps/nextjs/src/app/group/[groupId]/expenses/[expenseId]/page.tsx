import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ExpenseDetailView } from "./ExpenseDetailView";

export default async function ExpenseDetailPage(props: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const params = await props.params;
  const expenseId = parseInt(params.expenseId);
  const groupId = parseInt(params.groupId);

  // Prefetch expense data
  prefetch(trpc.expense.getExpense.queryOptions({ expenseId }));

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-prose flex-col p-4 md:p-6">
        <ExpenseDetailView expenseId={expenseId} groupId={groupId} />
      </div>
    </HydrateClient>
  );
}
