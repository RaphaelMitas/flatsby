import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  debtsBetweenOthers,
  debtsFor,
  groupBalances,
  hasDebts,
} from "@flatsby/validators/expenses/debt";
import {
  allSquareMessage,
  debtHero,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn, handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { DirectDebts } from "./DirectDebts";
import { GroupBalances } from "./GroupBalances";
import { OtherDebts } from "./OtherDebts";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface DebtSummaryViewProps {
  groupId: number;
}

export function DebtSummaryView({ groupId }: DebtSummaryViewProps) {
  const router = useRouter();
  const { invalidateDebtSummary } = useInvalidateExpenses(groupId);
  const [refreshing, setRefreshing] = useState(false);
  const [kind, setKind] = useState<DebtKind>("direct");

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
  const others = debtsBetweenOthers(summary, meId, kind);
  const balances = groupBalances(summary, meId);

  const openSettle = (debt: DebtEntry) =>
    router.push({
      pathname: "/(tabs)/expenses/settle",
      params: {
        fromGroupMemberId: debt.fromGroupMemberId.toString(),
        toGroupMemberId: debt.toGroupMemberId.toString(),
        currency: debt.currency,
        amount: debt.amountInCents.toString(),
        source: kind,
      },
    });

  return (
    <AppScrollView
      className="flex-1"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View testID="debt-summary-title" className="w-full gap-2 p-4">
        {hasDebts(summary) ? (
          <>
            <DebtHero hero={debtHero(summary, meId, person)} />
            <ModeSwitch kind={kind} onChange={setKind} />
            <SectionLabel>Between you and</SectionLabel>
            <DirectDebts
              groupId={groupId}
              meId={meId}
              kind={kind}
              counterparts={debtsFor(summary, meId, kind)}
              allSquare={allSquareMessage(summary, meId, kind, person)}
              person={person}
              onSettle={openSettle}
            />
            {others.length > 0 && (
              <>
                <SectionLabel>Between others</SectionLabel>
                <OtherDebts
                  debts={others}
                  person={person}
                  onSettle={openSettle}
                />
              </>
            )}
            {balances.length > 0 && (
              <>
                <SectionLabel>Balances</SectionLabel>
                <GroupBalances currencies={balances} person={person} />
              </>
            )}
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

const modes = [
  { kind: "direct", label: "Actual" },
  { kind: "simplified", label: "Simplified" },
] satisfies { kind: DebtKind; label: string }[];

function ModeSwitch({
  kind,
  onChange,
}: {
  kind: DebtKind;
  onChange: (kind: DebtKind) => void;
}) {
  return (
    <View className="bg-muted mt-2 flex-row rounded-lg p-1">
      {modes.map((mode) => {
        const selected = mode.kind === kind;
        return (
          <Pressable
            key={mode.kind}
            testID={`debt-mode-${mode.label.toLowerCase()}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(mode.kind)}
            className={cn(
              "flex-1 items-center rounded-md py-1.5",
              selected && "bg-background shadow-sm",
            )}
          >
            <Text
              className={cn(
                "text-sm font-medium",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {mode.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-muted-foreground mx-1 mt-4 text-sm font-semibold">
      {children}
    </Text>
  );
}

function DebtHero({ hero }: { hero: ReturnType<typeof debtHero> }) {
  const { label, amounts, meta } = hero;

  return (
    <View testID="debt-hero" className="pt-4 pb-2">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      {amounts.map(({ currency, cents, text }) => (
        <Text
          key={currency}
          testID="debt-hero-amount"
          className={cn(
            "font-bold tracking-tight",
            amounts.length > 1 ? "text-3xl" : "text-4xl",
            cents > 0
              ? "text-success"
              : cents < 0
                ? "text-destructive"
                : "text-foreground",
          )}
        >
          {text}
        </Text>
      ))}
      <Text className="text-muted-foreground mt-0.5 text-sm">{meta}</Text>
    </View>
  );
}
