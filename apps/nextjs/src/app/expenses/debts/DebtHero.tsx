import type { debtHero } from "@flatsby/validators/expenses/formatting";

import { cn } from "@flatsby/ui";

import { amountTone } from "./debtDisplay";

export function DebtHero({ hero }: { hero: ReturnType<typeof debtHero> }) {
  const { label, amounts, meta } = hero;

  return (
    <div data-testid="debt-hero">
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
      <p className="text-muted-foreground mt-1 text-sm">{meta}</p>
    </div>
  );
}
