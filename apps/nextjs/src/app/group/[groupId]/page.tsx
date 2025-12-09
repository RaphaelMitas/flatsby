import Link from "next/link";
import { Plus, Settings as SettingsIcon } from "lucide-react";

import { Button } from "@flatsby/ui/button";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ShoppingListDashboard } from "./shopping-list/ShoppingListDashboard";

const GroupPage = async (props: { params: Promise<{ groupId: string }> }) => {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="flex w-full max-w-prose flex-col p-4">
        <div className="flex w-full flex-row">
          <div className="mb-4 flex-1">
            <Button className="w-fit">
              <Link
                className="flex items-center gap-2"
                href={`/group/${groupId}/settings#manage-members`}
              >
                <Plus className="h-4 w-4" /> add member
              </Link>
            </Button>
          </div>
          <Button variant="outline" asChild size="icon">
            <Link href={`/group/${groupId}/settings`}>
              <SettingsIcon />
            </Link>
          </Button>
        </div>
        <ShoppingListDashboard groupId={groupId} />
      </div>
    </HydrateClient>
  );
};

export default GroupPage;
