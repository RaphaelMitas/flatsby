import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ShoppingListDashboard } from "./ShoppingListDashboard";

const shoppingListsPage = async (props: {
  params: Promise<{ groupId: string }>;
}) => {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));

  return (
    <HydrateClient>
      <div className="mx-auto mt-4 flex w-full max-w-prose flex-col p-4">
        <ShoppingListDashboard groupId={groupId} />
      </div>
    </HydrateClient>
  );
};

export default shoppingListsPage;
