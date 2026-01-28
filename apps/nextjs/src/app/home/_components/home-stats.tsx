"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageSquare, TrendingUp, Wallet } from "lucide-react";

import { Card, CardContent } from "@flatsby/ui/card";
import { Skeleton } from "@flatsby/ui/skeleton";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (prevTarget.current === target && value === target) return;
    prevTarget.current = target;

    const startTime = performance.now();
    const startValue = value;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);

      setValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, value]);

  return value;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  format?: (value: number) => string;
  label: string;
  colorClass?: string;
}

function StatCard({ icon, value, format, label, colorClass }: StatCardProps) {
  const animatedValue = useCountUp(value);
  const displayValue = format ? format(animatedValue) : String(animatedValue);

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-4">
        <div className={`mb-2 ${colorClass ?? "text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-4">
        <Skeleton className="mb-2 h-5 w-5" />
        <Skeleton className="mb-1 h-7 w-16" />
        <Skeleton className="h-3 w-12" />
      </CardContent>
    </Card>
  );
}

function HomeStatsInner() {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();

  const groupId = currentGroup?.id ?? 0;

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  const { data: statsData } = useSuspenseQuery(
    trpc.stats.getHomeStats.queryOptions({ groupId }),
  );

  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  if (!debtData.success) {
    return handleApiError(debtData.error);
  }

  if (!statsData.success) {
    return handleApiError(statsData.error);
  }

  const currentGroupMemberId = groupData.data.thisGroupMember.id;
  const memberBalances =
    debtData.data.memberBalances[currentGroupMemberId] ?? {};
  const currencies = Object.keys(memberBalances);

  let userBalance: { amount: number; currency: string } | null = null;
  const firstCurrency = currencies[0];
  if (firstCurrency) {
    const balance = memberBalances[firstCurrency] ?? 0;
    if (balance !== 0) {
      userBalance = { amount: balance, currency: firstCurrency };
    }
  }

  const { spending, itemsCompleted, chatMessages } = statsData.data;

  const primarySpending = spending[0];
  const spendingCents = primarySpending?.totalInCents ?? 0;
  const spendingCurrency = primarySpending?.currency ?? "EUR";

  const balanceAmount = userBalance ? Math.abs(userBalance.amount) : 0;
  const balanceCurrency = userBalance?.currency ?? "EUR";
  const isOwed = userBalance ? userBalance.amount > 0 : false;

  const formatCurrency = (currency: string) => (cents: number) =>
    formatCurrencyFromCents({ cents, currency });

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">Last 30 days</p>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          value={spendingCents}
          format={formatCurrency(spendingCurrency)}
          label="spent"
          colorClass="text-blue-500"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          value={itemsCompleted}
          label="items"
          colorClass="text-green-500"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          value={chatMessages}
          label="messages"
          colorClass="text-purple-500"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={balanceAmount}
          format={formatCurrency(balanceCurrency)}
          label={userBalance ? (isOwed ? "owed to you" : "you owe") : "balanced"}
          colorClass={userBalance ? (isOwed ? "text-green-500" : "text-red-500") : "text-green-500"}
        />
      </div>
    </div>
  );
}

export function HomeStats() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Last 30 days</p>
          <div className="grid grid-cols-2 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      }
    >
      <HomeStatsInner />
    </Suspense>
  );
}
