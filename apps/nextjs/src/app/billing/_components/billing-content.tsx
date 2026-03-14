"use client";

import { useCustomer } from "autumn-js/react";
import { ExternalLinkIcon } from "lucide-react";

import PricingTable from "@flatsby/ui/autumn/pricing-table";
import { Button } from "@flatsby/ui/button";
import { Card, CardContent } from "@flatsby/ui/card";
import { Separator } from "@flatsby/ui/separator";
import { Skeleton } from "@flatsby/ui/skeleton";
import { formatCredits, PLAN_IDS } from "@flatsby/validators/billing";

function BillingContentSkeleton() {
  return (
    <div className="grid gap-10">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4">
        <Skeleton className="h-7 w-36" />
        <Separator />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getUsageColor(percentage: number) {
  if (percentage > 85) return "bg-red-500";
  if (percentage > 60) return "bg-amber-500";
  return "bg-green-500";
}

export function BillingContent() {
  const { data: customer, isLoading, openCustomerPortal } = useCustomer({
    expand: ["subscriptions.plan"],
  });

  if (isLoading) return <BillingContentSkeleton />;

  const subscription = customer?.subscriptions[0];
  const isApplePlan = subscription?.planId === PLAN_IDS.PRO_APPLE;
  const isPaidPlan =
    subscription && subscription.planId !== PLAN_IDS.FREE;
  const isCanceled = subscription?.canceledAt !== null;

  const creditsBalance = customer?.balances.credits;
  const remaining = creditsBalance?.remaining ?? 0;
  const usage = creditsBalance?.usage ?? 0;
  const totalAllowance = usage + remaining;
  const usagePercentage =
    totalAllowance === 0 ? 0 : (usage / totalAllowance) * 100;

  return (
    <div className="grid gap-10">
      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {subscription?.plan?.name ?? "Free Plan"}
            </h2>
            {isCanceled && subscription?.currentPeriodEnd ? (
              <p className="text-muted-foreground text-sm">
                Active until {formatDate(subscription.currentPeriodEnd)}
              </p>
            ) : isApplePlan ? (
              <p className="text-muted-foreground text-sm">
                Subscribed via App Store
              </p>
            ) : !isPaidPlan ? (
              <p className="text-muted-foreground text-sm">
                Upgrade to unlock more credits and features
              </p>
            ) : null}
            {isPaidPlan &&
              (isApplePlan ? (
                <Button
                  variant="outline"
                  className="mt-2 w-fit"
                  onClick={() =>
                    window.open(
                      "https://apps.apple.com/account/subscriptions",
                      "_blank",
                    )
                  }
                >
                  Manage in App Store
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-2 w-fit"
                  onClick={async () => {
                    await openCustomerPortal();
                  }}
                >
                  Manage Subscription
                  <ExternalLinkIcon className="ml-2 h-4 w-4" />
                </Button>
              ))}
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm font-medium">
              Credits remaining
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCredits(remaining)}
            </p>
            <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full transition-all ${getUsageColor(usagePercentage)}`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {formatCredits(usage)} of {formatCredits(totalAllowance)} used
              this period
            </p>
            {remaining === 0 && (
              <p className="text-destructive text-sm font-medium">
                You&apos;ve run out of credits. Upgrade to continue.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Plans</h2>
          <p className="text-muted-foreground text-sm">
            Choose the plan that best fits your needs
          </p>
        </div>
        <Separator />
        <PricingTable />
      </div>
    </div>
  );
}
