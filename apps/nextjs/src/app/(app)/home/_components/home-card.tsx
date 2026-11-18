"use client";

import type { Pace } from "@flatsby/validators/home";
import Link from "next/link";
import { skipToken, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card } from "@flatsby/ui/card";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  deviceTimeZone,
  formatCalendarDate,
} from "@flatsby/validators/calendar";
import { paceSummary, previousMonth } from "@flatsby/validators/home";

import { useTRPC } from "~/trpc/react";

export function useHomePace(groupId: number, today: string | null) {
  const trpc = useTRPC();
  const { data } = useQuery({
    ...trpc.stats.getHomePace.queryOptions(
      today ? { groupId, today, timeZone: deviceTimeZone() } : skipToken,
    ),
    staleTime: 0,
  });
  return data?.success ? data.data : undefined;
}

export function HomeCard({
  href,
  title,
  testId,
  children,
}: {
  href: string;
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} data-testid={testId} className="block rounded-3xl">
      <Card className="hover:border-foreground/30 flex flex-col rounded-3xl p-4 shadow-none transition-colors">
        <div className="text-muted-foreground flex items-center justify-between text-sm font-semibold">
          {title}
          <ChevronRight className="size-4" />
        </div>
        {children}
      </Card>
    </Link>
  );
}

export function PaceNumbers({
  pace,
  today,
  format,
  unit,
}: {
  pace: Pace | undefined;
  today: string | null;
  format: (value: number) => string;
  unit?: (count: number) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  if (!pace || !today)
    return (
      <>
        <Skeleton className="mt-2 h-10 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </>
    );

  const { total, difference } = paceSummary(pace);
  const direction = difference < 0 ? "less" : difference > 0 ? "more" : "same";

  return (
    <>
      <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
        {format(total)}
        {unit && (
          <span className="text-muted-foreground ml-1 text-base font-medium tracking-normal">
            {unit(total)}
          </span>
        )}
      </p>
      <p className="text-muted-foreground text-sm">
        {t.rich(`home.pace.${direction}`, {
          amount: format(Math.abs(difference)),
          month: formatCalendarDate(`${previousMonth(today)}-01`, locale, {
            month: "long",
          }),
          b: (chunks) => (
            <b className="text-foreground font-semibold">{chunks}</b>
          ),
        })}
      </p>
    </>
  );
}
