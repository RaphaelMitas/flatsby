"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { HomeIcon, Receipt, ShoppingCartIcon } from "lucide-react";

import { cn } from "@flatsby/ui";

export function BottomNavigation() {
  const segments = useSelectedLayoutSegments();

  // Get IDs from segments
  const groupIndex = segments.indexOf("group") + 1;
  const currentGroupId = segments[groupIndex]
    ? parseInt(segments[groupIndex])
    : null;

  const shoppingListIndex = segments.indexOf("shopping-list") + 1;
  const currentShoppingListId = segments[shoppingListIndex]
    ? parseInt(segments[shoppingListIndex])
    : null;

  const expensesIndex = segments.indexOf("expenses");
  const isExpensesPage = expensesIndex >= 0;

  return (
    <div className="bg-background fixed right-0 bottom-0 left-0 z-50 h-16 border-t md:hidden">
      <nav className="flex justify-around py-2">
        <Link
          href={`/group/${currentGroupId ?? ""}`}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            currentShoppingListId || isExpensesPage
              ? "text-muted-foreground"
              : "text-foreground",
          )}
          prefetch={false}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href={
            currentGroupId ? `/group/${currentGroupId}/shopping-list` : "/group"
          }
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            currentShoppingListId ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <ShoppingCartIcon className="h-6 w-6" />
          <span className="text-xs">Shopping</span>
        </Link>
        <Link
          href={currentGroupId ? `/group/${currentGroupId}/expenses` : "/group"}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isExpensesPage && !currentShoppingListId
              ? "text-foreground"
              : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <Receipt className="h-6 w-6" />
          <span className="text-xs">Expenses</span>
        </Link>
      </nav>
    </div>
  );
}
