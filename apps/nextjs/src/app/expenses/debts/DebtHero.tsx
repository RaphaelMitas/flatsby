import type { CounterpartDebts } from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";

import { cn } from "@flatsby/ui";
import { heroBalances } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  formatHeroAmount,
  heroLabel,
  heroMeta,
} from "@flatsby/validators/expenses/formatting";

import { amountTone } from "./debtDisplay";

interface DebtHeroProps {
  balances: Record<string, number>;
  fallbackCurrency: string;
  directDebts: CounterpartDebts[];
  person: PersonLookup;
}

export function DebtHero({
  balances,
  fallbackCurrency,
  directDebts,
  person,
}: DebtHeroProps) {
  const hero = heroBalances(balances);
  const { lines, mixed } = hero;

  return (
    <div data-testid="debt-hero">
      <p className="text-muted-foreground text-sm">{heroLabel(hero)}</p>
      {lines.length === 0 ? (
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          {formatCurrencyFromCents({ cents: 0, currency: fallbackCurrency })}
        </p>
      ) : (
        lines.map(({ currency, cents }) => (
          <p
            key={currency}
            className={cn(
              "font-bold tracking-tight tabular-nums",
              lines.length > 1 ? "text-3xl" : "text-4xl",
              amountTone(cents),
            )}
          >
            {formatHeroAmount(cents, currency, mixed)}
          </p>
        ))
      )}
      <p className="text-muted-foreground mt-1 text-sm">
        {heroMeta(directDebts, person)}
      </p>
    </div>
  );
}
