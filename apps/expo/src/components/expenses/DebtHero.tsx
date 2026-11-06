import type { debtHero } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";

import { amountTone } from "@flatsby/validators/expenses/formatting";

import { cn } from "~/lib/utils";

interface DebtHeroProps {
  hero: ReturnType<typeof debtHero>;
  className?: string;
}

export function DebtHero({ hero, className }: DebtHeroProps) {
  const { label, amounts } = hero;

  return (
    <View testID="debt-hero" className={className}>
      <Text className="text-muted-foreground text-sm">{label}</Text>
      {amounts.map(({ currency, cents, text }) => (
        <Text
          key={currency}
          testID="debt-hero-amount"
          className={cn(
            "text-foreground font-bold tracking-tight",
            amounts.length > 1 ? "text-3xl" : "text-4xl",
            cents !== 0 && amountTone(cents),
          )}
        >
          {text}
        </Text>
      ))}
    </View>
  );
}
