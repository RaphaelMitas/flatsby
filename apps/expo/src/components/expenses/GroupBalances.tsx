import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type {
  DebtSummary,
  GroupDebtSummary,
  MemberBalances,
} from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { Text, View } from "react-native";

import {
  balanceBars,
  openCurrencies,
  settlePlanStats,
} from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  formatPlanPayments,
  formatSignedCents,
} from "@flatsby/validators/expenses/formatting";

import type { OnSettle } from "./DirectDebts";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Switch } from "~/lib/ui/switch";
import { cn } from "~/lib/utils";
import { MemberAvatar } from "./MemberAvatar";

interface GroupBalancesProps {
  summary: GroupDebtSummary;
  meId: number;
  person: PersonLookup;
  onSettle: OnSettle;
}

export function GroupBalances({
  summary,
  meId,
  person,
  onSettle,
}: GroupBalancesProps) {
  const [showPlan, setShowPlan] = useState(false);

  const currencies = openCurrencies(summary);
  const withHeading = currencies.length > 1;
  const { savesPayments, paymentCount } = settlePlanStats(currencies);

  return (
    <Card className="p-4">
      <View className="gap-4">
        {currencies.map(({ currency }) => (
          <BalanceBars
            key={currency}
            currency={currency}
            memberBalances={summary.memberBalances}
            meId={meId}
            person={person}
            withHeading={withHeading}
          />
        ))}
      </View>
      {savesPayments && (
        <>
          <View className="border-border mt-3 flex-row items-center gap-3 border-t pt-4">
            <View className="flex-1">
              <Text className="text-foreground font-semibold">
                Show settle plan
              </Text>
              <Text className="text-muted-foreground text-xs">
                {formatPlanPayments(paymentCount)}
              </Text>
            </View>
            <Switch
              testID="debt-plan-switch"
              checked={showPlan}
              onCheckedChange={setShowPlan}
            />
          </View>
          {showPlan &&
            currencies.map((debts) => (
              <PlanSteps
                key={debts.currency}
                debts={debts}
                meId={meId}
                person={person}
                withHeading={withHeading}
                onSettle={onSettle}
              />
            ))}
        </>
      )}
    </Card>
  );
}

interface BalanceBarsProps {
  currency: string;
  memberBalances: MemberBalances;
  meId: number;
  person: PersonLookup;
  withHeading: boolean;
}

function BalanceBars({
  currency,
  memberBalances,
  meId,
  person,
  withHeading,
}: BalanceBarsProps) {
  const { rows, scale } = balanceBars(memberBalances, currency, meId);

  return (
    <View>
      {withHeading && (
        <Text className="text-foreground mb-2 font-semibold">{currency}</Text>
      )}
      {rows.map(({ memberId, cents }) => {
        const isMe = memberId === meId;
        const percent = (Math.abs(cents) / scale) * 100;
        return (
          <View key={memberId} className="flex-row items-center gap-2 py-1.5">
            <MemberAvatar
              person={person(memberId)}
              className="h-6 w-6"
              textClassName="text-xs"
            />
            <Text
              className={cn(
                "text-foreground w-16 text-sm",
                isMe ? "font-bold" : "font-medium",
              )}
              numberOfLines={1}
            >
              {person(memberId).name}
            </Text>
            <View className="h-5 flex-1 flex-row">
              <View className="border-border flex-1 flex-row justify-end border-r">
                {cents < 0 && (
                  <View
                    className="bg-destructive/70 h-full rounded-l-md"
                    style={{ width: `${percent}%` }}
                  />
                )}
              </View>
              <View className="flex-1 flex-row">
                {cents > 0 && (
                  <View
                    className="bg-success/70 h-full rounded-r-md"
                    style={{ width: `${percent}%` }}
                  />
                )}
              </View>
            </View>
            <Text
              className={cn(
                "w-20 text-right text-sm font-semibold",
                cents > 0
                  ? "text-success"
                  : cents < 0
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
              numberOfLines={1}
            >
              {formatSignedCents(cents, currency)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface PlanStepsProps {
  debts: DebtSummary;
  meId: number;
  person: PersonLookup;
  withHeading: boolean;
  onSettle: OnSettle;
}

function PlanSteps({
  debts,
  meId,
  person,
  withHeading,
  onSettle,
}: PlanStepsProps) {
  return (
    <View className="mt-2">
      {withHeading && (
        <Text className="text-muted-foreground mt-2 text-xs font-semibold">
          {debts.currency}
        </Text>
      )}
      {debts.simplified.map((debt, index) => {
        const mine =
          debt.fromGroupMemberId === meId || debt.toGroupMemberId === meId;
        const from = person(debt.fromGroupMemberId);
        const to = person(debt.toGroupMemberId);
        return (
          <View
            key={`${debt.fromGroupMemberId}-${debt.toGroupMemberId}`}
            testID="debt-plan-step"
            className={cn(
              "-mx-4 flex-row items-center gap-2 px-4 py-2.5",
              index > 0 && "border-border border-t",
              mine && "bg-muted/50",
            )}
          >
            <View className="bg-muted h-6 w-6 items-center justify-center rounded-full">
              <Text className="text-muted-foreground text-xs font-semibold">
                {index + 1}
              </Text>
            </View>
            <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
              <MemberAvatar
                person={from}
                className="h-6 w-6"
                textClassName="text-xs"
              />
              <Text className="text-foreground text-sm font-medium">
                {from.name}
              </Text>
              <Icon name="arrow-right" size={14} color="muted-foreground" />
              <MemberAvatar
                person={to}
                className="h-6 w-6"
                textClassName="text-xs"
              />
              <Text className="text-foreground text-sm font-medium">
                {to.name}
              </Text>
            </View>
            <Text className="text-foreground text-sm font-semibold">
              {formatCurrencyFromCents({
                cents: debt.amountInCents,
                currency: debt.currency,
              })}
            </Text>
            <Button
              title={mine ? "Settle" : "Record"}
              size="sm"
              variant={mine ? "outline" : "ghost"}
              textClassName={mine ? undefined : "text-muted-foreground"}
              onPress={() => onSettle(debt, "plan")}
            />
          </View>
        );
      })}
    </View>
  );
}
