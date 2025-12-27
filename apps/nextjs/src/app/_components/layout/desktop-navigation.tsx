"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { Receipt, ShoppingCartIcon } from "lucide-react";

import { cn } from "@flatsby/ui";

export function DesktopNavigation() {
  const segments = useSelectedLayoutSegments();

  // Get groupId from segments
  const groupIndex = segments.indexOf("group") + 1;
  const currentGroupId = segments[groupIndex]
    ? parseInt(segments[groupIndex])
    : null;

  // Determine active page
  const isShoppingListPage = segments.includes("shopping-list");
  const isExpensesPage = segments.includes("expenses");

  // Only show navigation when a group is selected
  if (!currentGroupId) {
    return null;
  }

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <Link
        href={`/group/${currentGroupId}/shopping-list`}
        className={cn(
          "hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isShoppingListPage
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
        )}
      >
        <ShoppingCartIcon className="h-4 w-4" />
        <span>Shopping</span>
      </Link>
      <Link
        href={`/group/${currentGroupId}/expenses`}
        className={cn(
          "hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isExpensesPage
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
        )}
      >
        <Receipt className="h-4 w-4" />
        <span>Expenses</span>
      </Link>
    </nav>
  );
}
