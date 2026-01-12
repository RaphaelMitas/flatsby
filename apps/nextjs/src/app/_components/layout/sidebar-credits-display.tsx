"use client";

import Link from "next/link";
import { useCustomer } from "autumn-js/react";
import { CreditCardIcon } from "lucide-react";

import { Progress } from "@flatsby/ui/progress";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@flatsby/ui/sidebar";
import { formatCredits } from "@flatsby/validators/billing";

export function SidebarCreditsDisplay() {
  const { customer, isLoading } = useCustomer();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const creditsFeature = customer?.features.credits;
  const balance = creditsFeature?.balance ?? 0;
  const usage = creditsFeature?.usage ?? 0;

  const totalAllowance = usage + balance;
  const usagePercentage =
    totalAllowance === 0 ? 0 : (usage / totalAllowance) * 100;

  if (isLoading) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={`Billing - ${formatCredits(balance)} credits remaining`}
      >
        <Link href="/billing" className="flex h-fit w-full flex-col gap-1">
          <div className="flex w-full justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="text-xs font-medium">Billing</span>
              )}
            </div>
            {!isCollapsed && (
              <span className="text-muted-foreground truncate text-xs">
                {formatCredits(balance)} credits remaining
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
