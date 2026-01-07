"use client";

import { useCustomer } from "autumn-js/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { formatCredits } from "@flatsby/validators/billing";

export function UsageDisplay() {
  const { customer } = useCustomer();

  const creditsFeature = customer?.features.credits;
  const balance = creditsFeature?.balance ?? 0;
  const usage = creditsFeature?.usage ?? 0;
  const unlimited = creditsFeature?.unlimited ?? false;

  // Calculate total allowance from usage + balance
  const totalAllowance = usage + balance;
  const usagePercentage =
    unlimited || totalAllowance === 0 ? 0 : (usage / totalAllowance) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage</CardTitle>
        <CardDescription>
          {unlimited
            ? "Unlimited credits"
            : `${formatCredits(usage)} of ${formatCredits(totalAllowance)} credits used this period`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!unlimited && (
          <>
            <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>Remaining: {formatCredits(balance)} credits</span>
            </div>
          </>
        )}
        {balance === 0 && !unlimited && (
          <p className="text-destructive text-sm">
            You&apos;ve run out of credits. Upgrade to continue.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
