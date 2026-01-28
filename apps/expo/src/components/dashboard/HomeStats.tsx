import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import type { ColorName } from "~/lib/utils";
import { Card, CardContent } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";

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
  iconName: "wallet" | "circle-check" | "message-square" | "trending-up";
  value: number;
  format?: (value: number) => string;
  label: string;
  iconColor: ColorName;
  loading?: boolean;
}

function StatCard({
  iconName,
  value,
  format,
  label,
  iconColor,
  loading,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const displayValue = loading
    ? "-"
    : format
      ? format(animatedValue)
      : String(animatedValue);

  return (
    <Card className="flex-1">
      <CardContent className="items-center justify-center p-4">
        <View className="mb-2">
          <Icon name={iconName} size={25} color={iconColor} />
        </View>
        <Text className="text-foreground text-2xl font-bold">
          {displayValue}
        </Text>
        <Text className="text-muted-foreground text-sm">{label}</Text>
      </CardContent>
    </Card>
  );
}

interface HomeStatsProps {
  groupId: number;
}

export function HomeStats({ groupId }: HomeStatsProps) {
  const { data: groupData } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const { data: debtData } = useQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );

  const { data: statsData } = useQuery(
    trpc.stats.getHomeStats.queryOptions({ groupId }),
  );

  const hasData = groupData?.success && debtData?.success && statsData?.success;

  let spendingCents = 0;
  let spendingCurrency = "EUR";
  let itemsCompleted = 0;
  let chatMessages = 0;
  let balanceAmount = 0;
  let balanceCurrency = "EUR";
  let balanceLabel = "balanced";
  let balanceIconColor: ColorName = "success";

  if (hasData) {
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

    const primarySpending = statsData.data.spending[0];
    spendingCents = primarySpending?.totalInCents ?? 0;
    spendingCurrency = primarySpending?.currency ?? "EUR";
    itemsCompleted = statsData.data.itemsCompleted;
    chatMessages = statsData.data.chatMessages;

    balanceAmount = userBalance ? Math.abs(userBalance.amount) : 0;
    balanceCurrency = userBalance?.currency ?? "EUR";
    const isOwed = userBalance ? userBalance.amount > 0 : false;
    balanceLabel = userBalance
      ? isOwed
        ? "owed to you"
        : "you owe"
      : "balanced";
    balanceIconColor = userBalance ? (isOwed ? "success" : "error") : "success";
  }

  const formatCurrency = (currency: string) => (cents: number) =>
    formatCurrencyFromCents({ cents, currency });

  const isLoading = !hasData;

  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-sm">Last 30 days</Text>
      <View className="flex-row gap-3">
        <StatCard
          iconName="wallet"
          value={spendingCents}
          format={formatCurrency(spendingCurrency)}
          label="spent"
          iconColor="info"
          loading={isLoading}
        />
        <StatCard
          iconName="circle-check"
          value={itemsCompleted}
          label="items"
          iconColor="success"
          loading={isLoading}
        />
      </View>
      <View className="flex-row gap-3">
        <StatCard
          iconName="message-square"
          value={chatMessages}
          label="messages"
          iconColor="purple"
          loading={isLoading}
        />
        <StatCard
          iconName="trending-up"
          value={balanceAmount}
          format={formatCurrency(balanceCurrency)}
          label={balanceLabel}
          iconColor={balanceIconColor}
          loading={isLoading}
        />
      </View>
    </View>
  );
}
