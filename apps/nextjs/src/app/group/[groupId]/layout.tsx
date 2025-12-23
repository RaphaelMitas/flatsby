import Link from "next/link";

import { Button } from "@flatsby/ui/button";

import { caller } from "~/trpc/server";

export default async function GroupLayout(props: {
  params: Promise<{ groupId: string }>;
  children: React.ReactNode;
}) {
  const params = await props.params;

  const { children } = props;

  try {
    await caller.shoppingList.getGroup({
      id: parseInt(params.groupId),
    });
    await caller.shoppingList.updateLastUsed({
      groupId: parseInt(params.groupId),
      shoppingListId: null,
    });
  } catch (error) {
    let errorMessage = "Error loading group";
    await caller.shoppingList.updateLastUsed({
      groupId: null,
      shoppingListId: null,
    });
    if (error instanceof Error) errorMessage = error.message;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center text-lg font-semibold">{errorMessage}</div>
        <Button asChild className="mx-auto grid max-w-6xl gap-2">
          <Link href="/group">Back to groups</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
