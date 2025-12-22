import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ExpenseDashboard } from "./ExpenseDashboard";

export default async function ExpensesPage(props: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ create?: string }>;
}) {
  const params = await props.params;
  const groupId = parseInt(params.groupId);

  // Prefetch initial expenses and group data
  prefetch(trpc.expense.getGroupExpenses.queryOptions({ groupId, limit: 20 }));
  prefetch(trpc.shoppingList.getGroup.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="flex w-full max-w-prose flex-col p-4 md:p-6">
        <ExpenseDashboard groupId={groupId} />
      </div>
    </HydrateClient>
  );
}
