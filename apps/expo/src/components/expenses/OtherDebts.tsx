import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { Text, View } from "react-native";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import type { OnSettle } from "./DirectDebts";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { MemberAvatar } from "./MemberAvatar";

interface OtherDebtsProps {
  debts: DebtEntry[];
  person: PersonLookup;
  onSettle: OnSettle;
}

export function OtherDebts({ debts, person, onSettle }: OtherDebtsProps) {
  return (
    <Card className="px-4">
      {debts.map((debt, index) => {
        const from = person(debt.fromGroupMemberId);
        const to = person(debt.toGroupMemberId);
        return (
          <View
            key={`${debt.currency}-${debt.fromGroupMemberId}-${debt.toGroupMemberId}`}
            testID="debt-others-row"
            className={cn(
              "flex-row items-center gap-3 py-3",
              index > 0 && "border-border border-t",
            )}
          >
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
            <Text className="text-foreground text-base font-semibold">
              {formatCurrencyFromCents({
                cents: debt.amountInCents,
                currency: debt.currency,
              })}
            </Text>
            <Button
              testID="debt-others-record"
              accessibilityLabel={`Record ${from.name} paying ${to.name}`}
              title="Record"
              size="sm"
              variant="outline"
              onPress={() => onSettle(debt)}
            />
          </View>
        );
      })}
    </Card>
  );
}
