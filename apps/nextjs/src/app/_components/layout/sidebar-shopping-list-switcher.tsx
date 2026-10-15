"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@flatsby/ui/sidebar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";

export function SidebarShoppingListSwitcher() {
  const t = useTranslations("shoppingList");
  const pathname = usePathname();
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();

  // Get shopping lists for current group
  const { data: shoppingListsData, isLoading } = useQuery({
    ...trpc.shoppingList.getShoppingLists.queryOptions({
      groupId: currentGroup?.id ?? 0,
    }),
    enabled: !!currentGroup?.id,
  });

  const shoppingLists =
    shoppingListsData?.success === true ? shoppingListsData.data : [];

  // Check if on shopping list dashboard or detail page
  const isShoppingListDashboard = pathname === "/shopping-list";
  const shoppingListMatch = /\/shopping-list\/(\d+)/.exec(pathname);
  const currentShoppingListId = shoppingListMatch?.[1]
    ? parseInt(shoppingListMatch[1], 10)
    : null;

  if (!currentGroup) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("sidebarTitle")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isShoppingListDashboard}
              tooltip={t("allLists")}
            >
              <Link href="/shopping-list">
                <Plus />
                <span>{t("allLists")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isLoading ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            </>
          ) : shoppingLists.length === 0 ? (
            <SidebarMenuItem>
              <div className="text-muted-foreground px-2 py-1 text-sm">
                {t("noListsYet")}
              </div>
            </SidebarMenuItem>
          ) : (
            shoppingLists.map((list) => (
              <SidebarMenuItem key={list.id}>
                <SidebarMenuButton
                  asChild
                  isActive={list.id === currentShoppingListId}
                  tooltip={list.name}
                >
                  <Link href={`/shopping-list/${list.id}`}>
                    <ShoppingCart />
                    <span className="truncate">{list.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
