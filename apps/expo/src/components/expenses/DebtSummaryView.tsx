import type { CounterpartDebts } from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { directDebtsFor } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  formatSignedCents,
  joinNames,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import type { OnSettle } from "./DirectDebts";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn, handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { DirectDebts } from "./DirectDebts";
import { GroupBalances } from "./GroupBalances";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface DebtSummaryViewProps {
  groupId: number;
}

export function DebtSummaryView({ groupId }: DebtSummaryViewProps) {
  const router = useRouter();
  const { invalidateDebtSummary } = useInvalidateExpenses(groupId);
  const [refreshing, setRefreshing] = useState(false);

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await invalidateDebtSummary();
    setRefreshing(false);
  }, [invalidateDebtSummary]);

  if (!debtData.success) {
    return handleApiError({ router, error: debtData.error });
  }
  if (!groupData.success) {
    return handleApiError({ router, error: groupData.error });
  }

  const summary = debtData.data;
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupData.data.groupMembers, meId);
  const hasDebts = Object.values(summary.currencies).some(
    (debts) => debts.direct.length > 0,
  );
  const counterparts = directDebtsFor(summary, meId);
  const othersWithDebts = Object.entries(summary.memberBalances)
    .filter(
      ([memberId, balances]) =>
        Number(memberId) !== meId &&
        Object.values(balances).some((cents) => cents !== 0),
    )
    .map(([memberId]) => person(Number(memberId)).name);

  const openSettle: OnSettle = (debt, source) =>
    router.push({
      pathname: "/(tabs)/expenses/settle",
      params: {
        fromGroupMemberId: debt.fromGroupMemberId.toString(),
        toGroupMemberId: debt.toGroupMemberId.toString(),
        currency: debt.currency,
        amount: debt.amountInCents.toString(),
        source,
      },
    });

  return (
    <AppScrollView
      className="flex-1"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View className="w-full gap-2 p-4">
        <Text
          testID="debt-summary-title"
          className="text-foreground text-3xl font-bold tracking-tight"
        >
          Debts
        </Text>

        {hasDebts ? (
          <>
            <DebtHero
              balances={summary.memberBalances[meId] ?? {}}
              fallbackCurrency={Object.keys(summary.currencies)[0] ?? "EUR"}
              counterparts={counterparts}
              person={person}
            />
            <SectionLabel>Between you and</SectionLabel>
            <DirectDebts
              groupId={groupId}
              meId={meId}
              counterparts={counterparts}
              othersWithDebts={othersWithDebts}
              person={person}
              onSettle={openSettle}
            />
            <SectionLabel>Group balances</SectionLabel>
            <GroupBalances
              summary={summary}
              meId={meId}
              person={person}
              onSettle={openSettle}
            />
          </>
        ) : (
          <Card testID="debt-summary-empty" className="mt-4 items-center p-6">
            <View className="bg-success/10 mb-3 h-16 w-16 items-center justify-center rounded-full">
              <Icon name="check" size={30} color="success" />
            </View>
            <Text className="text-foreground text-lg font-semibold">
              All settled up
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Nobody in {groupData.data.name} owes anything.
            </Text>
          </Card>
        )}

        <Pressable
          testID="debt-record-payment"
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/expenses/settle")}
          className="mt-4 flex-row items-center justify-center gap-1.5 py-2"
        >
          <Icon name="plus" size={16} color="muted-foreground" />
          <Text className="text-muted-foreground text-sm">
            Record another payment
          </Text>
        </Pressable>
      </View>
    </AppScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-muted-foreground mx-1 mt-4 text-sm font-semibold">
      {children}
    </Text>
  );
}

interface DebtHeroProps {
  balances: Record<string, number>;
  fallbackCurrency: string;
  counterparts: CounterpartDebts[];
  person: PersonLookup;
}

function DebtHero({
  balances,
  fallbackCurrency,
  counterparts,
  person,
}: DebtHeroProps) {
  const lines = Object.entries(balances).filter(([, cents]) => cents !== 0);
  const owed = lines.length > 0 && lines.every(([, cents]) => cents > 0);
  const owing = lines.length > 0 && lines.every(([, cents]) => cents < 0);
  const label = owed
    ? "Overall you are owed"
    : owing
      ? "Overall you owe"
      : "Overall";

  const namesWhere = (sign: 1 | -1) =>
    counterparts
      .filter(({ amounts }) =>
        amounts.some(({ amountInCents }) => amountInCents * sign > 0),
      )
      .map(({ groupMemberId }) => person(groupMemberId).name);
  const owesYou = namesWhere(1);
  const youOwe = namesWhere(-1);
  const meta =
    [
      owesYou.length > 0 &&
        `${joinNames(owesYou)} ${owesYou.length === 1 ? "owes" : "owe"} you`,
      youOwe.length > 0 &&
        `${owesYou.length > 0 ? "you" : "You"} owe ${joinNames(youOwe)}`,
    ]
      .filter(Boolean)
      .join(", ") || "You don't owe anyone and nobody owes you";

  return (
    <View testID="debt-hero" className="pt-4 pb-2">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      {lines.length === 0 ? (
        <Text
          testID="debt-hero-amount"
          className="text-foreground text-4xl font-bold tracking-tight"
        >
          {formatCurrencyFromCents({ cents: 0, currency: fallbackCurrency })}
        </Text>
      ) : (
        lines.map(([currency, cents]) => (
          <Text
            key={currency}
            testID="debt-hero-amount"
            className={cn(
              "font-bold tracking-tight",
              lines.length > 1 ? "text-3xl" : "text-4xl",
              cents > 0 ? "text-success" : "text-destructive",
            )}
          >
            {owed || owing
              ? formatCurrencyFromCents({ cents: Math.abs(cents), currency })
              : formatSignedCents(cents, currency)}
          </Text>
        ))
      )}
      <Text className="text-muted-foreground mt-0.5 text-sm">{meta}</Text>
    </View>
  );
}
