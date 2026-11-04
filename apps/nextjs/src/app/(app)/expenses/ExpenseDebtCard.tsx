"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card } from "@flatsby/ui/card";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { debtsFor } from "@flatsby/validators/expenses/debt";
import {
  debtHero,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { DebtHero } from "./debts/DebtHero";

export function ExpenseDebtCard({ groupId }: { groupId: number }) {
  const trpc = useTRPC();
  const t = useTranslations();
  const locale = useLocale();

  const { data: debtData } = useSuspenseQuery(
    trpc.expense.getDebtSummary.queryOptions({ groupId }),
  );
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!debtData.success || !groupData.success) return null;

  const summary = debtData.data;
  const meId = groupData.data.thisGroupMember.id;
  const person = personLookup(groupData.data.groupMembers, meId, t);
  const counterparts = debtsFor(summary, meId, "direct", t);

  return (
    <Link
      href="/expenses/debts"
      data-testid="expense-debt-card"
      className="mt-4 block rounded-xl"
    >
      <Card className="hover:bg-muted/50 flex flex-row items-center gap-3 p-4 transition-colors">
        {counterparts.length === 0 ? (
          <>
            <span className="bg-success/15 text-success flex size-9 shrink-0 items-center justify-center rounded-full">
              <Check className="size-5" />
            </span>
            <p className="flex-1 font-semibold">{t("debts.allSquare")}</p>
          </>
        ) : (
          <>
            <DebtHero
              hero={debtHero(summary, meId, t, locale)}
              testId="expense-debt-hero"
              className="flex-1"
            />
            <div className="flex -space-x-2">
              {counterparts.slice(0, 3).map(({ groupMemberId }) => (
                <UserAvatar
                  key={groupMemberId}
                  {...person(groupMemberId)}
                  size="sm"
                  className="ring-card ring-2"
                />
              ))}
            </div>
          </>
        )}
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Card>
    </Link>
  );
}
