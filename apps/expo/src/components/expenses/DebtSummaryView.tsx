import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { undecidedDebtCurrencies } from "@flatsby/validators/expenses/conversion";
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
import { Segmented } from "~/lib/ui/segmented";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { ConvertCurrencyBanner } from "./ConvertCurrencyBanner";
import { DirectDebts } from "./DirectDebts";
import { GroupBalances } from "./GroupBalances";
import { OtherDebts } from "./OtherDebts";
import { settleHref } from "./settleHref";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

interface DebtSummaryViewProps {
  groupId: number;
}

export function DebtSummaryView({ groupId }: DebtSummaryViewProps) {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
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
    return null;
  }
  if (!groupData.success) {
    return null;
  }

  const summary = debtData.data;
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupData.data.groupMembers, meId, t);
  const others = debtsBetweenOthers(summary, meId, kind);
  const balances = groupBalances(summary, meId);
  const group = groupData.data;
  const bannerCurrencies = undecidedDebtCurrencies(group, balances);

  const openSettle = (debt: DebtEntry) => router.push(settleHref(debt, kind));

  return (
    <AppScrollView
      className="flex-1"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View testID="debt-summary-title" className="w-full gap-2 p-4">
        {bannerCurrencies && (
          <ConvertCurrencyBanner
            groupId={groupId}
            groupCurrency={group.currency}
            currencies={bannerCurrencies}
          />
        )}
        {hasDebts(summary) ? (
          <>
            <DebtHero hero={debtHero(summary, meId, t, locale)} />
            <View className="mt-2">
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  {
                    value: "direct",
                    label: t("debts.mode.actual"),
                    testID: "debt-mode-actual",
                  },
                  {
                    value: "simplified",
                    label: t("debts.mode.simplified"),
                    testID: "debt-mode-simplified",
                  },
                ]}
              />
            </View>
            <SectionLabel>{t("debts.betweenYouAnd")}</SectionLabel>
            <DirectDebts
              groupId={groupId}
              meId={meId}
              kind={kind}
              counterparts={debtsFor(summary, meId, kind, t)}
              allSquare={allSquareMessage(summary, meId, kind, person, t)}
              person={person}
              onSettle={openSettle}
            />
            {others.length > 0 && (
              <>
                <SectionLabel>{t("debts.betweenOthers")}</SectionLabel>
                <OtherDebts
                  debts={others}
                  person={person}
                  onSettle={openSettle}
                />
              </>
            )}
            {balances.length > 0 && (
              <>
                <SectionLabel>{t("debts.balances")}</SectionLabel>
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
              {t("debts.allSettledUp")}
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {t("debts.nobodyOwes", { group: groupData.data.name })}
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
            {t("debts.recordAnotherPayment")}
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

function DebtHero({ hero }: { hero: ReturnType<typeof debtHero> }) {
  const { label, amounts } = hero;

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
    </View>
  );
}
