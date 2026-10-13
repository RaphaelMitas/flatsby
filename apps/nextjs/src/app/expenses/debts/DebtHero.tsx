import type { CounterpartDebts } from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";

import { cn } from "@flatsby/ui";
import {
  formatCurrencyFromCents,
  formatSignedCents,
  joinNames,
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
  const lines = Object.entries(balances)
    .filter(([, cents]) => cents !== 0)
    .map(([currency, cents]) => ({ currency, cents }));
  const first = lines[0];
  const mixed = new Set(lines.map(({ cents }) => Math.sign(cents))).size > 1;

  let label = "Overall";
  if (first && !mixed) {
    label = first.cents > 0 ? "Overall you are owed" : "Overall you owe";
  }

  const namesWhere = (owedToMe: boolean) =>
    directDebts
      .filter(({ amounts }) =>
        amounts.some(({ amountInCents }) =>
          owedToMe ? amountInCents > 0 : amountInCents < 0,
        ),
      )
      .map(({ groupMemberId }) => person(groupMemberId).name);

  return (
    <div data-testid="debt-hero">
      <p className="text-muted-foreground text-sm">{label}</p>
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
            {mixed
              ? formatSignedCents(cents, currency)
              : formatCurrencyFromCents({ cents: Math.abs(cents), currency })}
          </p>
        ))
      )}
      <p className="text-muted-foreground mt-1 text-sm">
        {heroMeta(namesWhere(true), namesWhere(false))}
      </p>
    </div>
  );
}

function heroMeta(owedBy: string[], owing: string[]): string {
  const parts: string[] = [];
  if (owedBy.length > 0) {
    parts.push(
      `${joinNames(owedBy)} ${owedBy.length === 1 ? "owes" : "owe"} you`,
    );
  }
  if (owing.length > 0) {
    parts.push(`${parts.length > 0 ? "you" : "You"} owe ${joinNames(owing)}`);
  }
  return parts.join(", ") || "You don't owe anyone and nobody owes you";
}
