"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ChartNoAxesColumn, HandCoins, Wallet } from "lucide-react";
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

  const isDebtsPage = pathname === "/expenses/debts";

  return (
    <Sidebar collapsible="icon">
      <SidebarGroupSwitcher />

      <SidebarContent>
        {hasCurrentGroup && <SidebarShoppingListSwitcher />}

        {hasCurrentGroup && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{t("navigation.expenses")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink
                    href="/expenses"
                    icon={Wallet}
                    label={t("navigation.allExpenses")}
                    tooltip={t("navigation.expenses")}
                    isActive={pathname.startsWith("/expenses") && !isDebtsPage}
                  />
                  <SidebarLink
                    href="/expenses/debts"
                    icon={HandCoins}
                    label={t("navigation.debts")}
                    isActive={isDebtsPage}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{t("navigation.calendar")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink
                    href="/calendar"
                    icon={Calendar}
                    label={t("navigation.calendar")}
                    isActive={pathname.startsWith("/calendar")}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{t("statistics.title")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink
                    href="/home/statistics"
                    icon={ChartNoAxesColumn}
                    label={t("statistics.title")}
                    isActive={pathname.startsWith("/home/statistics")}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
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

function SidebarLink({
  href,
  icon: Icon,
  label,
  tooltip = label,
  isActive,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
        <Link href={href}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
