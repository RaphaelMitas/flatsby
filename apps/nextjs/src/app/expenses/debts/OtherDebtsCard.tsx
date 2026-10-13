"use client";

import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import { ArrowRight } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

interface OtherDebtsCardProps {
  debts: DebtEntry[];
  person: PersonLookup;
  onSettle: (debt: DebtEntry) => void;
}

export function OtherDebtsCard({
  debts,
  person,
  onSettle,
}: OtherDebtsCardProps) {
  return (
    <Card className="divide-y px-4">
      {debts.map((debt) => {
        const from = person(debt.fromGroupMemberId);
        const to = person(debt.toGroupMemberId);
        return (
          <div
            key={`${debt.currency}-${debt.fromGroupMemberId}-${debt.toGroupMemberId}`}
            className="flex items-center gap-3 py-3"
            data-testid="debt-others-row"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm font-medium">
              <UserAvatar name={from.name} image={from.image} size="xs" />
              {from.name}
              <ArrowRight className="text-muted-foreground size-4" />
              <UserAvatar name={to.name} image={to.image} size="xs" />
              {to.name}
            </div>
            <span className="font-semibold tabular-nums">
              {formatCurrencyFromCents({
                cents: debt.amountInCents,
                currency: debt.currency,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="debt-others-record"
              onClick={() => onSettle(debt)}
            >
              Record
            </Button>
          </div>
        );
      })}
    </Card>
  );
}
