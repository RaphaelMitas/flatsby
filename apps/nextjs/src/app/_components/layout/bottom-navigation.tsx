"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  HomeIcon,
  MessageSquareIcon,
  ShoppingCartIcon,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";

import { useGroupContext } from "~/app/_components/context/group-context";

export function BottomNavigation() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const { hasCurrentGroup } = useGroupContext();

  const isGroupPage = pathname === "/group" || pathname.startsWith("/group/");
  const isShoppingPage = pathname.startsWith("/shopping-list");
  const isExpensesPage = pathname.startsWith("/expenses");
  const isCalendarPage = pathname.startsWith("/calendar");
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
          <span className="text-xs">{t("home")}</span>
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
          <span className="text-xs">{t("shopping")}</span>
        </Link>
        <Link
          href={hasCurrentGroup ? "/expenses" : "/group"}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isExpensesActive ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <Wallet className="h-6 w-6" />
          <span className="text-xs">{t("expenses")}</span>
        </Link>
        <Link
          href={hasCurrentGroup ? "/calendar" : "/group"}
          className={cn(
            "hover:text-foreground flex flex-col items-center gap-1",
            isCalendarPage ? "text-foreground" : "text-muted-foreground",
          )}
          prefetch={false}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs">{t("calendar")}</span>
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
          <span className="text-xs">{t("chat")}</span>
        </Link>
      </nav>
    </div>
  );
}
