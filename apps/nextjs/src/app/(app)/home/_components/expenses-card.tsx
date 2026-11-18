"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@flatsby/ui/skeleton";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import { HomeCard, PaceNumbers, useHomePace } from "./home-card";
import { PaceChart } from "./pace-chart";

export function ExpensesCard({
  groupId,
  today,
}: {
  groupId: number;
  today: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const pace = useHomePace(groupId, today);
  const currency = group?.success ? group.data.currency : undefined;
  const spending = currency ? pace?.spending : undefined;

  return (
    <HomeCard
      href="/expenses"
      title={t("navigation.expenses")}
      testId="home-card-expenses"
    >
      <PaceNumbers
        pace={spending}
        today={today}
        format={(cents) =>
          formatCurrencyFromCents({ cents, currency: currency ?? "", locale })
        }
      />
      {spending && today ? (
        <PaceChart pace={spending} today={today} className="h-22" labelled />
      ) : (
        <Skeleton className="mt-2 h-28" />
      )}
    </HomeCard>
  );
}
