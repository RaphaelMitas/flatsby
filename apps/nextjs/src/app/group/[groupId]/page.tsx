import { Suspense } from "react";
import Link from "next/link";
import { Plus, Settings as SettingsIcon, ShoppingCart } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ShoppingListDashboard } from "./shopping-list/ShoppingListDashboard";
import { UserDebtSummary } from "./UserDebtSummary";

const GroupPage = async (props: { params: Promise<{ groupId: string }> }) => {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));
  prefetch(trpc.group.getGroup.queryOptions({ id: groupId }));
  prefetch(trpc.expense.getDebtSummary.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="flex w-svw max-w-prose flex-col gap-6 p-4">
        {/* Header with actions */}
        <div className="flex w-full items-center justify-between">
          <Button className="w-fit" asChild>
            <Link
              className="flex items-center gap-2"
              href={`/group/${groupId}/settings#manage-members`}
            >
              <Plus className="h-4 w-4" /> Add member
            </Link>
          </Button>
          <Button variant="outline" asChild size="icon">
            <Link href={`/group/${groupId}/settings`}>
              <SettingsIcon />
            </Link>
          </Button>
        </div>

        {/* User Debt Summary */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          }
        >
          <UserDebtSummary groupId={groupId} />
        </Suspense>

        {/* Shopping Lists Section */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ShoppingCart className="text-muted-foreground h-5 w-5" />
            <h2 className="text-lg font-semibold">Shopping Lists</h2>
          </div>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            }
          >
            <ShoppingListDashboard groupId={groupId} limit={5} />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
};

export default GroupPage;
