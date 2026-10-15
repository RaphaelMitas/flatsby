"use client";

import type { DebtKind } from "@flatsby/validators/expenses/debt";
import type { DebtEntry } from "@flatsby/validators/expenses/types";
import type { ReactNode } from "react";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { undecidedDebtCurrencies } from "@flatsby/validators/expenses/conversion";
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
import { ConversionBanner } from "./ConversionBanner";
import { DebtHero } from "./DebtHero";
import { DirectDebtsCard } from "./DirectDebtsCard";
import { GroupBalancesCard } from "./GroupBalancesCard";
import { OtherDebtsCard } from "./OtherDebtsCard";
import { SettlementForm } from "./SettlementForm";

export function DebtSummaryView() {
  const trpc = useTRPC();
  const t = useTranslations();
  const locale = useLocale();
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
  const person = personLookup(groupData.data.groupMembers, meId, t);
  const others = debtsBetweenOthers(summary, meId, kind);
  const balances = groupBalances(summary, meId);
  const settle = (debt: DebtEntry) => setSettling({ source: kind, debt });
  const group = groupData.data;
  const bannerCurrencies = undecidedDebtCurrencies(group, balances);

  return (
    <div className="flex w-full flex-col gap-6">
      <h2
        data-testid="debt-summary-title"
        className="text-2xl font-bold tracking-tight sm:text-3xl"
      >
        {t("navigation.debts")}
      </h2>

      {bannerCurrencies && (
        <ConversionBanner
          groupId={groupId}
          groupCurrency={group.currency}
          currencies={bannerCurrencies}
        />
      )}

      {hasDebts(summary) ? (
        <>
          <DebtHero hero={debtHero(summary, meId, t, locale)} />
          <ModeSwitch kind={kind} onChange={setKind} />
          <Section title={t("debts.betweenYouAnd")}>
            <DirectDebtsCard
              groupId={groupId}
              meId={meId}
              kind={kind}
              debts={debtsFor(summary, meId, kind, t)}
              allSquare={allSquareMessage(summary, meId, kind, person, t)}
              person={person}
              onSettle={settle}
            />
          </Section>
          {others.length > 0 && (
            <Section title={t("debts.betweenOthers")}>
              <OtherDebtsCard
                debts={others}
                person={person}
                onSettle={settle}
              />
            </Section>
          )}
          {balances.length > 0 && (
            <Section title={t("debts.balances")}>
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
            <p className="text-lg font-semibold">{t("debts.allSettledUp")}</p>
            <p className="text-muted-foreground text-sm">
              {t("debts.nobodyOwes", { group: groupData.data.name })}
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
        {t("debts.recordAnotherPayment")}
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
  { kind: "direct", name: "actual" },
  { kind: "simplified", name: "simplified" },
] as const satisfies { kind: DebtKind; name: string }[];

function ModeSwitch({
  kind,
  onChange,
}: {
  kind: DebtKind;
  onChange: (kind: DebtKind) => void;
}) {
  const t = useTranslations("debts.mode");
  return (
    <Tabs
      value={kind}
      onValueChange={(value) => {
        const mode = modes.find((m) => m.kind === value);
        if (mode) onChange(mode.kind);
      }}
    >
      <TabsList className="w-full">
        {modes.map((mode) => (
          <TabsTrigger
            key={mode.kind}
            value={mode.kind}
            data-testid={`debt-mode-${mode.name}`}
          >
            {t(mode.name)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
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
