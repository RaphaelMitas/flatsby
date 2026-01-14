import { Text, View } from "react-native";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import Icon from "~/lib/ui/custom/icons/Icon";

interface DebtDisplayProps {
  fromMember: string;
  toMember: string;
  amountInCents: number;
  currency: string;
}

export function DebtDisplay({
  fromMember,
  toMember,
  amountInCents,
  currency,
}: DebtDisplayProps) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-foreground text-sm font-medium">
          {fromMember}
        </Text>
        <Icon name="arrow-right" size={12} color="muted-foreground" />
        <Text className="text-foreground text-sm font-medium">{toMember}</Text>
      </View>
      <Text className="text-foreground text-sm">
        {formatCurrencyFromCents({ cents: amountInCents, currency })}
      </Text>
    </View>
  );
}
