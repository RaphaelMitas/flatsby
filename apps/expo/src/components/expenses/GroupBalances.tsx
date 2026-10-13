import type { groupBalances } from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";

import { formatSignedCents } from "@flatsby/validators/expenses/formatting";

import { Card } from "~/lib/ui/card";
import { cn } from "~/lib/utils";
import { MemberAvatar } from "./MemberAvatar";

interface GroupBalancesProps {
  currencies: ReturnType<typeof groupBalances>;
  person: PersonLookup;
}

export function GroupBalances({ currencies, person }: GroupBalancesProps) {
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
    </Card>
  );
}

interface BalanceBarsProps {
  currency: string;
  rows: ReturnType<typeof groupBalances>[number]["rows"];
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
