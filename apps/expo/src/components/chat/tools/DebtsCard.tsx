import { Text, View } from "react-native";

import { DebtDisplay } from "~/components/expenses/DebtDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "~/lib/ui/card";
import Icon from "~/lib/ui/custom/icons/Icon";

interface DebtEntry {
  fromMember: string;
  toMember: string;
  amountInCents: number;
  currency: string;
}

interface DebtsCardProps {
  debts: DebtEntry[];
  groupName: string;
}

export function DebtsCard({ debts, groupName }: DebtsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Debts in {groupName}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {debts.length === 0 ? (
          <View className="flex-row items-center gap-2">
            <Icon name="circle-check" size={16} color="success" />
            <Text className="text-muted-foreground text-sm">
              All settled up!
            </Text>
          </View>
        ) : (
          <View className="gap-1">
            {debts.map((debt, index) => (
              <DebtDisplay
                key={index}
                fromMember={debt.fromMember}
                toMember={debt.toMember}
                amountInCents={debt.amountInCents}
                currency={debt.currency}
              />
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}
