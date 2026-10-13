"use client";

import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import {
  debtsBetweenOthers,
  debtsFor,
  groupBalances,
  hasDebts,
} from "@flatsby/validators/expenses/debt";
import {
  allSquareMessage,
  debtHero,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import type { SettlementPrefill } from "./SettlementForm";
import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { DebtHero } from "./DebtHero";
import { DirectDebtsCard } from "./DirectDebtsCard";
import { GroupBalancesCard } from "./GroupBalancesCard";
import { OtherDebtsCard } from "./OtherDebtsCard";
import { SettlementForm } from "./SettlementForm";

export function DebtSummaryView() {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const handleApiError = useHandleApiError();
  const [settling, setSettling] = useState<SettlementPrefill | "blank" | null>(
    null,
  );
  const [kind, setKind] = useState<DebtKind>("direct");

  const groupId = currentGroup?.id ?? 0;

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!debtData.success) {
    return handleApiError(debtData.error);
  }
  if (!groupData.success) {
    return handleApiError(groupData.error);
  }

  const summary = debtData.data;
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupData.data.groupMembers, meId);
  const others = debtsBetweenOthers(summary, meId, kind);
  const balances = groupBalances(summary, meId);
  const settle = (debt: DebtEntry) => setSettling({ source: kind, debt });

  return (
    <div className="flex w-full flex-col gap-6">
      <h2
        data-testid="debt-summary-title"
        className="text-2xl font-bold tracking-tight sm:text-3xl"
      >
        Debts
      </h2>

      {hasDebts(summary) ? (
        <>
          <DebtHero hero={debtHero(summary, meId)} />
          <ModeSwitch kind={kind} onChange={setKind} />
          <Section title="Between you and">
            <DirectDebtsCard
              groupId={groupId}
              meId={meId}
              kind={kind}
              debts={debtsFor(summary, meId, kind)}
              allSquare={allSquareMessage(summary, meId, kind, person)}
              person={person}
              onSettle={settle}
            />
          </Section>
          {others.length > 0 && (
            <Section title="Between others">
              <OtherDebtsCard
                debts={others}
                person={person}
                onSettle={settle}
              />
            </Section>
          )}
          {balances.length > 0 && (
            <Section title="Balances">
              <GroupBalancesCard currencies={balances} person={person} />
            </Section>
          )}
        </>
      ) : (
        <Card
          data-testid="debt-summary-empty"
          className="flex flex-col items-center gap-3 px-6 py-10 text-center"
        >
          <span className="bg-success/15 text-success flex size-16 items-center justify-center rounded-full">
            <CheckCircle2 className="size-8" />
          </span>
          <div>
            <p className="text-lg font-semibold">All settled up</p>
            <p className="text-muted-foreground text-sm">
              Nobody in {groupData.data.name} owes anything.
            </p>
          </div>
        </Card>
      )}

      <Button
        variant="ghost"
        className="text-muted-foreground self-center"
        onClick={() => setSettling("blank")}
        data-testid="record-payment-button"
      >
        <Plus />
        Record another payment
      </Button>

      {settling && (
        <SettlementForm
          prefill={settling === "blank" ? undefined : settling}
          onClose={() => setSettling(null)}
        />
      )}
    </div>
  );
}

const modes = [
  { kind: "direct", label: "Actual" },
  { kind: "simplified", label: "Simplified" },
] satisfies { kind: DebtKind; label: string }[];

function ModeSwitch({
  kind,
  onChange,
}: {
  kind: DebtKind;
  onChange: (kind: DebtKind) => void;
}) {
  return (
    <div className="bg-muted flex rounded-lg p-1">
      {modes.map((mode) => {
        const selected = mode.kind === kind;
        return (
          <button
            key={mode.kind}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(mode.kind)}
            data-testid={`debt-mode-${mode.label.toLowerCase()}`}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground px-1 text-sm font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
