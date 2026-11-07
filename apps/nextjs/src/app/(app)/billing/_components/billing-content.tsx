"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent } from "@flatsby/ui/card";
import { Skeleton } from "@flatsby/ui/skeleton";
import { formatCredits } from "@flatsby/validators/billing";

import { useTRPC } from "~/trpc/react";

function getUsageColor(percentage: number) {
  if (percentage > 85) return "bg-red-500";
  if (percentage > 60) return "bg-amber-500";
  return "bg-green-500";
}

export function BillingContent() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.user.getUsage.queryOptions());

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  const remaining = data?.credits?.balance ?? 0;
  const usage = data?.credits?.usage ?? 0;
  const totalAllowance = usage + remaining;
  const usagePercentage =
    totalAllowance === 0 ? 0 : (usage / totalAllowance) * 100;

  return (
    <Card>
      <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("freePlan")}
        </h2>

        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm font-medium">
            {t("creditsRemaining")}
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {formatCredits(remaining, locale)}
          </p>
          <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full transition-all ${getUsageColor(usagePercentage)}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {t("usedThisPeriod", {
              used: formatCredits(usage, locale),
              total: formatCredits(totalAllowance, locale),
            })}
          </p>
          {remaining === 0 && (
            <p className="text-destructive text-sm font-medium">
              {t("outOfCredits")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
