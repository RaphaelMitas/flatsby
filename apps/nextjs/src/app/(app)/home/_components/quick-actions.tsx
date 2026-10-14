"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus, ShoppingCart } from "lucide-react";

import { Button } from "@flatsby/ui/button";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";

export function QuickActions() {
  const trpc = useTRPC();
  const { currentGroup, currentShoppingList } = useGroupContext();

  const groupId = currentGroup?.id;

  const { data: shoppingListsData } = useQuery({
    ...trpc.shoppingList.getShoppingLists.queryOptions({
      groupId: groupId ?? 0,
    }),
    enabled: !!groupId,
  });

  let recentShoppingList: { id: number; name: string } | null = null;

  if (shoppingListsData?.success && shoppingListsData.data.length > 0) {
    if (
      currentShoppingList &&
      shoppingListsData.data.some((l) => l.id === currentShoppingList.id)
    ) {
      recentShoppingList = {
        id: currentShoppingList.id,
        name: currentShoppingList.name,
      };
    } else {
      const first = shoppingListsData.data[0];
      if (first) {
        recentShoppingList = { id: first.id, name: first.name };
      }
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">Quick actions</p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/chat">
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Link>
        </Button>
        <Button variant="outline" className="min-w-0 flex-1" asChild>
          <Link
            href={
              recentShoppingList
                ? `/shopping-list/${recentShoppingList.id}`
                : "/shopping-list"
            }
          >
            <ShoppingCart className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {recentShoppingList?.name ?? "Shop"}
            </span>
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/expenses?action=create">
            <Plus className="mr-2 h-4 w-4" />
            Expense
          </Link>
        </Button>
      </div>
    </div>
  );
}
