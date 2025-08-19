import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import ShoppingList from "./ShoppingList";

const shoppingListPage = async (props: {
  params: Promise<{ groupId: string; shoppingListId: string }>;
}) => {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  const shoppingListId = parseInt(params.shoppingListId);
  prefetch(
    trpc.shoppingList.getShoppingList.queryOptions({
      groupId,
      shoppingListId,
    }),
  );
  prefetch(
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
      groupId,
      shoppingListId,
      limit: 20,
    }),
  );

  try {
    await caller.shoppingList.updateLastUsed({
      groupId,
      shoppingListId,
    });
  } catch (error) {
    console.error(error);
  }

  return (
    <HydrateClient>
      <div className="mt-4 flex h-full w-full max-w-prose flex-col">
        <ShoppingList groupId={groupId} shoppingListId={shoppingListId} />
      </div>
    </HydrateClient>
  );
};

export default shoppingListPage;
