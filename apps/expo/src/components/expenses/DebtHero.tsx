import type { debtHero } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";

import { cn } from "~/lib/utils";

interface DebtHeroProps {
  hero: ReturnType<typeof debtHero>;
  testID?: string;
  className?: string;
}

export function DebtHero({
  hero,
  testID = "debt-hero",
  className,
}: DebtHeroProps) {
  const { label, amounts } = hero;

  return (
    <View testID={testID} className={className}>
      <Text className="text-muted-foreground text-sm">{label}</Text>
      {amounts.map(({ currency, cents, text }) => (
        <Text
          key={currency}
          testID={`${testID}-amount`}
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
