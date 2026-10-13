import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type {
  DebtEntry,
  GroupDebtSummary,
} from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { Text, View } from "react-native";

import { groupBalances } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
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

  const { currencies, paymentsLabel } = groupBalances(summary, meId);
  const withHeading = currencies.length > 1;

  return (
    <Card className="p-4">
      <View className="gap-4">
        {currencies.map(({ currency, rows }) => (
          <BalanceBars
            key={currency}
            currency={currency}
            rows={rows}
            person={person}
            withHeading={withHeading}
          />
        ))}
      </View>
      <View className="border-border mt-3 flex-row items-center gap-3 border-t pt-4">
        <View className="flex-1">
          <Text className="text-foreground font-semibold">
            Show settle plan
          </Text>
          <Text className="text-muted-foreground text-xs">{paymentsLabel}</Text>
        </View>
        <Switch
          testID="debt-plan-switch"
          checked={showPlan}
          onCheckedChange={setShowPlan}
        />
      </View>
      {showPlan &&
        currencies.map(({ currency, steps }) => (
          <PlanSteps
            key={currency}
            currency={currency}
            steps={steps}
            meId={meId}
            person={person}
            withHeading={withHeading}
            onSettle={onSettle}
          />
        ))}
    </Card>
  );
}

interface BalanceBarsProps {
  currency: string;
  rows: ReturnType<typeof groupBalances>["currencies"][number]["rows"];
  person: PersonLookup;
  withHeading: boolean;
}

function BalanceBars({
  currency,
  rows,
  person,
  withHeading,
}: BalanceBarsProps) {
  return (
    <View>
      {withHeading && (
        <Text className="text-foreground mb-2 font-semibold">{currency}</Text>
      )}
      {rows.map(({ memberId, isMe, cents, percent }) => (
        <View key={memberId} className="flex-row items-center gap-3 py-2">
          <MemberAvatar
            person={person(memberId)}
            className="h-7 w-7"
            textClassName="text-xs"
          />
          <View className="flex-1 gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className={cn(
                  "text-foreground flex-1 text-sm",
                  isMe ? "font-bold" : "font-medium",
                )}
                numberOfLines={1}
              >
                {person(memberId).name}
              </Text>
              <Text
                className={cn(
                  "text-sm",
                  isMe ? "font-bold" : "font-semibold",
                  cents > 0
                    ? "text-success"
                    : cents < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {formatSignedCents(cents, currency)}
              </Text>
            </View>
            <View className="bg-muted relative h-1.5 rounded-full">
              <View
                className={cn(
                  "absolute top-0 h-full rounded-full",
                  cents > 0
                    ? "bg-success left-1/2"
                    : "bg-destructive right-1/2",
                )}
                style={{ width: `${percent / 2}%` }}
              />
              <View className="bg-muted-foreground/40 absolute top-0 left-1/2 h-full w-px" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

interface PlanStepsProps {
  currency: string;
  steps: DebtEntry[];
  meId: number;
  person: PersonLookup;
  withHeading: boolean;
  onSettle: OnSettle;
}

function PlanSteps({
  currency,
  steps,
  meId,
  person,
  withHeading,
  onSettle,
}: PlanStepsProps) {
  if (steps.length === 0) return null;

  return (
    <View className="mt-2">
      {withHeading && (
        <Text className="text-muted-foreground mt-2 text-xs font-semibold">
          {currency}
        </Text>
      )}
      {steps.map((debt, index) => {
        const mine =
          debt.fromGroupMemberId === meId || debt.toGroupMemberId === meId;
        const from = person(debt.fromGroupMemberId);
        const to = person(debt.toGroupMemberId);
        return (
          <View
            key={`${debt.fromGroupMemberId}-${debt.toGroupMemberId}`}
            testID="debt-plan-step"
            className={cn(
              "flex-row items-center gap-2 py-2.5",
              index > 0 && "border-border border-t",
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
              variant={mine ? "primary" : "outline"}
              onPress={() => onSettle(debt, "plan")}
            />
          </View>
        );
      })}
    </View>
  );
}
