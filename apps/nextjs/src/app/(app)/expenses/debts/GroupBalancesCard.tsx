"use client";

import type { groupBalances } from "@flatsby/validators/expenses/debt";
import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import { useLocale } from "next-intl";

import { cn } from "@flatsby/ui";
import { Card } from "@flatsby/ui/card";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { formatSignedCents } from "@flatsby/validators/expenses/formatting";

import { amountTone } from "./debtDisplay";

interface GroupBalancesCardProps {
  currencies: ReturnType<typeof groupBalances>;
  person: PersonLookup;
}

export function GroupBalancesCard({
  currencies,
  person,
}: GroupBalancesCardProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        {currencies.map(({ currency, rows }) => (
          <BalanceBars
            key={currency}
            currency={currency}
            showHeading={currencies.length > 1}
            rows={rows}
            person={person}
          />
        ))}
      </div>
    </Card>
  );
}

interface BalanceBarsProps {
  currency: string;
  showHeading: boolean;
  rows: ReturnType<typeof groupBalances>[number]["rows"];
  person: PersonLookup;
}

function BalanceBars({
  currency,
  showHeading,
  rows,
  person,
}: BalanceBarsProps) {
  const locale = useLocale();
  return (
    <div>
      {showHeading && <p className="mb-1 font-semibold">{currency}</p>}
      <ul>
        {rows.map(({ memberId, isMe, cents, percent }) => {
          const { name, image, placeholder } = person(memberId);
          return (
            <li
              key={memberId}
              className="flex items-center gap-3 py-2 text-sm"
              data-testid="balance-row"
            >
              <UserAvatar
                name={name}
                image={image}
                placeholder={placeholder}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate",
                      isMe ? "font-bold" : "font-medium",
                    )}
                  >
                    {name}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums",
                      isMe ? "font-bold" : "font-semibold",
                      amountTone(cents),
                    )}
                  >
                    {formatSignedCents(cents, currency, locale)}
                  </span>
                </div>
                <div className="bg-muted relative h-1.5 rounded-full">
                  <div
                    className={cn(
                      "absolute inset-y-0 rounded-full",
                      cents > 0
                        ? "bg-success left-1/2"
                        : "bg-destructive right-1/2",
                    )}
                    style={{ width: `${percent / 2}%` }}
                  />
                  <div className="bg-muted-foreground/40 absolute inset-y-0 left-1/2 w-px" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
