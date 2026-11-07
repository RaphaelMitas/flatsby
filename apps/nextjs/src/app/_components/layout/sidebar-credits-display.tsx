"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCardIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Progress } from "@flatsby/ui/progress";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@flatsby/ui/sidebar";
import { formatCredits } from "@flatsby/validators/billing";

import { useTRPC } from "~/trpc/react";

export function SidebarCreditsDisplay() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.user.getUsage.queryOptions());
  const { state } = useSidebar();
  const t = useTranslations("billing");
  const locale = useLocale();
  const isCollapsed = state === "collapsed";

  // A failed load would otherwise render "0 credits remaining", which reads
  // as a spent account rather than a missing one.
  if (!data?.credits) {
    return null;
  }

  const { balance, usage } = data.credits;

  const credits = { count: balance, credits: formatCredits(balance, locale) };
  const totalAllowance = usage + balance;
  const usagePercentage =
    totalAllowance === 0 ? 0 : (usage / totalAllowance) * 100;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={t("sidebar.tooltip", credits)}>
        <Link href="/billing" className="flex h-fit w-full flex-col gap-1">
          <div className="flex w-full justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-medium">{t("title")}</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-muted-foreground truncate text-xs">
                {t("sidebar.remaining", credits)}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <Progress value={100 - usagePercentage} className="h-1" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
