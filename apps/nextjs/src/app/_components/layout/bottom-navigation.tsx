"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MessageSquareIcon,
  Receipt,
  ShoppingCartIcon,
} from "lucide-react";

import { cn } from "@flatsby/ui";

import { useGroupContext } from "~/app/_components/context/group-context";

export function BottomNavigation() {
  const pathname = usePathname();
  const { hasCurrentGroup } = useGroupContext();

  const isGroupPage = pathname === "/group" || pathname.startsWith("/group/");
  const isShoppingPage = pathname.startsWith("/shopping-list");
  const isExpensesPage = pathname.startsWith("/expenses");
  const isChatPage = pathname.startsWith("/chat");

  // Determine active state - only one can be active
  const isGroupActive = isGroupPage && !pathname.startsWith("/group/settings");
  const isShoppingActive = isShoppingPage;
  const isExpensesActive = isExpensesPage;
  const isChatActive = isChatPage;

  return (
    <div className="bg-background fixed right-0 bottom-0 left-0 z-50 h-16 border-t md:hidden">
      <nav className="flex justify-around py-2">
        <Link
          href="/group"
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isGroupActive ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href={hasCurrentGroup ? "/shopping-list" : "/group"}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isShoppingActive ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <ShoppingCartIcon className="h-6 w-6" />
          <span className="text-xs">Shopping</span>
        </Link>
        <Link
          href={hasCurrentGroup ? "/expenses" : "/group"}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isExpensesActive ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <Receipt className="h-6 w-6" />
          <span className="text-xs">Expenses</span>
        </Link>
        <Link
          href="/chat"
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isChatActive ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <MessageSquareIcon className="h-6 w-6" />
          <span className="text-xs">Chat</span>
        </Link>
      </nav>
    </div>
  );
}
