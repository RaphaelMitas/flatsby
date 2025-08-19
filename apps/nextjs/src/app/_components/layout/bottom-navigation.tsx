"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { HomeIcon, ShoppingCartIcon } from "lucide-react";

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-background md:hidden">
      <nav className="flex justify-around py-2">
        <Link
          href={`/group/${currentGroupId ?? ""}`}
          className={cn(
            "flex flex-col items-center gap-1 text-foreground hover:text-foreground",
            currentShoppingListId && "text-muted-foreground",
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
            "flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground",
            currentShoppingListId && "text-foreground",
          )}
          prefetch={false}
        >
          <ShoppingCartIcon className="h-6 w-6" />
          <span className="text-xs">Shopping</span>
        </Link>
      </nav>
    </div>
  );
}
