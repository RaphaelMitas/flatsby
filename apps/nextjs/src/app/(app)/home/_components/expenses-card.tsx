"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@flatsby/ui/skeleton";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import { useTRPC } from "~/trpc/react";
import {
  HomeCard,
  PaceNumbers,
  useHomeCardOpened,
  useHomePace,
} from "./home-card";
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
  const { pace, fadeIn } = useHomePace(groupId, today);
  const opened = useHomeCardOpened(groupId);
  const currency = group?.success ? group.data.currency : undefined;
  const spending = currency ? pace?.spending : undefined;

  return (
    <HomeCard
      href="/expenses"
      title={t("navigation.expenses")}
      testId="home-card-expenses"
      onOpen={() => opened("expenses")}
    >
      <PaceNumbers
        pace={spending}
        today={pace?.today}
        fadeIn={fadeIn}
        format={(cents) =>
          formatCurrencyFromCents({ cents, currency: currency ?? "", locale })
        }
        firstDay="expenses"
      >
        {spending && pace ? (
          <PaceChart
            pace={spending}
            today={pace.today}
            className="h-22"
            labelled
            fadeIn={fadeIn}
          />
        ) : (
          <Skeleton className="mt-2 h-28" />
        )}
      </PaceNumbers>
    </HomeCard>
  );
}
