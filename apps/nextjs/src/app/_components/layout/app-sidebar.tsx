"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, HandCoins, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@flatsby/ui/sidebar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { SidebarGroupSwitcher } from "./sidebar-group-switcher";
import { SidebarShoppingListSwitcher } from "./sidebar-shopping-list-switcher";
import { SidebarThemeToggle } from "./sidebar-theme-toggle";
import { SidebarUserMenu } from "./sidebar-user-menu";

export function AppSidebar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { hasCurrentGroup } = useGroupContext();

  // Determine active pages based on pathname
  const isExpensesPage = pathname.startsWith("/expenses");
  const isDebtsPage = pathname === "/expenses/debts";
  const isCalendarPage = pathname.startsWith("/calendar");

  return (
    <Sidebar collapsible="icon">
      <SidebarGroupSwitcher />

      <SidebarContent>
        {hasCurrentGroup && <SidebarShoppingListSwitcher />}

        {hasCurrentGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("navigation.expenses")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isExpensesPage && !isDebtsPage}
                    tooltip={t("navigation.expenses")}
                  >
                    <Link href="/expenses">
                      <Wallet />
                      <span>{t("navigation.allExpenses")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isDebtsPage}
                    tooltip={t("navigation.debts")}
                  >
                    <Link href="/expenses/debts">
                      <HandCoins />
                      <span>{t("navigation.debts")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasCurrentGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>{t("navigation.calendar")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isCalendarPage}
                    tooltip={t("navigation.calendar")}
                  >
                    <Link href="/calendar">
                      <Calendar />
                      <span>{t("navigation.calendar")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarThemeToggle />
          </SidebarMenuItem>
          <SidebarUserMenu />
        </SidebarMenu>
        <div className="text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 px-2 py-2 text-xs group-data-[collapsible=icon]:hidden">
          <Link
            href={localePath(locale, "/legal/legal-notice")}
            className="hover:underline"
          >
            {t("navigation.legalNotice")}
          </Link>
          <Link
            href={localePath(locale, "/legal/privacy")}
            className="hover:underline"
          >
            {t("navigation.privacy")}
          </Link>
          <Link
            href={localePath(locale, "/legal/terms")}
            className="hover:underline"
          >
            {t("navigation.terms")}
          </Link>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
