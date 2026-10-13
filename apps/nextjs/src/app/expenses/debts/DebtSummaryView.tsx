"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import { directDebtsFor, hasDebts } from "@flatsby/validators/expenses/debt";
import {
  debtHero,
  formatOthersWithDebts,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import type { SettlementPrefill } from "./SettlementForm";
import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { DebtHero } from "./DebtHero";
import { DirectDebtsCard } from "./DirectDebtsCard";
import { GroupBalancesCard } from "./GroupBalancesCard";
import { SettlementForm } from "./SettlementForm";

export function DebtSummaryView() {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const handleApiError = useHandleApiError();
  const [settling, setSettling] = useState<SettlementPrefill | "blank" | null>(
    null,
  );

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
  const directDebts = directDebtsFor(summary, meId);

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
          <DebtHero hero={debtHero(summary, meId, directDebts, person)} />
          <Section title="Between you and">
            <DirectDebtsCard
              groupId={groupId}
              meId={meId}
              debts={directDebts}
              othersWithDebts={formatOthersWithDebts(summary, meId, person)}
              person={person}
              onSettle={setSettling}
            />
          </Section>
          <Section title="Group balances">
            <GroupBalancesCard
              summary={summary}
              meId={meId}
              person={person}
              onSettle={setSettling}
            />
          </Section>
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
          open
        />
      )}
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
