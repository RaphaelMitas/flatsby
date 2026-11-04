import type { debtHero } from "@flatsby/validators/expenses/formatting";

import { cn } from "@flatsby/ui";
import { amountTone } from "@flatsby/validators/expenses/formatting";

interface DebtHeroProps {
  hero: ReturnType<typeof debtHero>;
  testId?: string;
  className?: string;
}

export function DebtHero({
  hero,
  testId = "debt-hero",
  className,
}: DebtHeroProps) {
  const { label, amounts } = hero;

  return (
    <div data-testid={testId} className={className}>
      <p className="text-muted-foreground text-sm">{label}</p>
      {amounts.map(({ currency, cents, text }) => (
        <p
          key={currency}
          className={cn(
            "font-bold tracking-tight tabular-nums",
            amounts.length > 1 ? "text-3xl" : "text-4xl",
            cents !== 0 && amountTone(cents),
          )}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
