import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { DebtSummaryView } from "./DebtSummaryView";

export default async function DebtsPage(props: {
  params: Promise<{ groupId: string }>;
}) {
  const params = await props.params;
  const groupId = parseInt(params.groupId);

  // Prefetch debt summary and group data
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));
  prefetch(trpc.shoppingList.getGroup.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="flex w-full max-w-prose flex-col p-4 md:p-6">
        <DebtSummaryView groupId={groupId} />
      </div>
    </HydrateClient>
  );
}
