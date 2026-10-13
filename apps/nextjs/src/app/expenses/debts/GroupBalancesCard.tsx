"use client";

import type { PersonLookup } from "@flatsby/validators/expenses/formatting";
import type {
  DebtEntry,
  GroupDebtSummary,
} from "@flatsby/validators/expenses/types";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { groupBalances } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  formatSignedCents,
} from "@flatsby/validators/expenses/formatting";

import type { SettlementPrefill } from "./SettlementForm";
import { amountTone } from "./debtDisplay";

interface GroupBalancesCardProps {
  summary: GroupDebtSummary;
  meId: number;
  person: PersonLookup;
  onSettle: (prefill: SettlementPrefill) => void;
}

export function GroupBalancesCard({
  summary,
  meId,
  person,
  onSettle,
}: GroupBalancesCardProps) {
  const [showPlan, setShowPlan] = useState(false);

  const { currencies, paymentsLabel } = groupBalances(summary, meId);

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

      <div className="mt-3 flex items-center gap-3 border-t pt-4">
        <Label
          htmlFor="settle-plan-switch"
          className="flex flex-1 flex-col items-start gap-0.5"
        >
          <span className="font-semibold">Show settle plan</span>
          <span className="text-muted-foreground text-xs font-normal">
            {paymentsLabel}
          </span>
        </Label>
        <Switch
          id="settle-plan-switch"
          checked={showPlan}
          onCheckedChange={setShowPlan}
          data-testid="settle-plan-switch"
        />
      </div>
      {showPlan &&
        currencies.map(({ currency, steps }) => (
          <PlanSteps
            key={currency}
            currency={currency}
            showHeading={currencies.length > 1}
            steps={steps}
            meId={meId}
            person={person}
            onSettle={onSettle}
          />
        ))}
    </Card>
  );
}

interface BalanceBarsProps {
  currency: string;
  showHeading: boolean;
  rows: ReturnType<typeof groupBalances>["currencies"][number]["rows"];
  person: PersonLookup;
}

function BalanceBars({
  currency,
  showHeading,
  rows,
  person,
}: BalanceBarsProps) {
  return (
    <div>
      {showHeading && <p className="mb-1 font-semibold">{currency}</p>}
      <ul>
        {rows.map(({ memberId, isMe, cents, percent }) => {
          const { name, image } = person(memberId);
          return (
            <li
              key={memberId}
              className="flex items-center gap-3 py-2 text-sm"
              data-testid="balance-row"
            >
              <UserAvatar name={name} image={image} size="sm" />
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
                    {formatSignedCents(cents, currency)}
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

interface PlanStepsProps {
  currency: string;
  showHeading: boolean;
  steps: DebtEntry[];
  meId: number;
  person: PersonLookup;
  onSettle: (prefill: SettlementPrefill) => void;
}

function PlanSteps({
  currency,
  showHeading,
  steps,
  meId,
  person,
  onSettle,
}: PlanStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-3" data-testid={`settle-plan-${currency}`}>
      {showHeading && <p className="mb-1 font-semibold">{currency}</p>}
      <ol className="divide-y">
        {steps.map((step, index) => {
          const mine =
            step.fromGroupMemberId === meId || step.toGroupMemberId === meId;
          const from = person(step.fromGroupMemberId);
          const to = person(step.toGroupMemberId);
          return (
            <li
              key={`${step.fromGroupMemberId}-${step.toGroupMemberId}`}
              className="flex items-center gap-3 py-2.5"
              data-testid="settle-plan-step"
            >
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm font-medium">
                <UserAvatar name={from.name} image={from.image} size="xs" />
                {from.name}
                <ArrowRight className="text-muted-foreground size-4" />
                <UserAvatar name={to.name} image={to.image} size="xs" />
                {to.name}
              </div>
              <span className="font-semibold tabular-nums">
                {formatCurrencyFromCents({
                  cents: step.amountInCents,
                  currency,
                })}
              </span>
              <Button
                size="sm"
                variant={mine ? "default" : "outline"}
                onClick={() => onSettle({ source: "plan", debt: step })}
              >
                {mine ? "Settle" : "Record"}
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
