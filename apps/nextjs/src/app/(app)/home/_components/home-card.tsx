"use client";

import type { HomeCardName, Pace } from "@flatsby/validators/home";
import { useState } from "react";
import Link from "next/link";
import {
  skipToken,
  useIsMutating,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Card } from "@flatsby/ui/card";
import { Skeleton } from "@flatsby/ui/skeleton";
import { deviceTimeZone } from "@flatsby/validators/calendar";
import { paceLabels, paceSummary } from "@flatsby/validators/home";

import { useTRPC } from "~/trpc/react";

export function useHomePace(groupId: number, today: string | null) {
  const trpc = useTRPC();
  const settled = useIsMutating() === 0;
  const { data } = useQuery({
    ...trpc.stats.getHomePace.queryOptions(
      today ? { groupId, timeZone: deviceTimeZone() } : skipToken,
    ),
    staleTime: 0,
    enabled: today !== null && settled,
  });
  const pace = data?.success ? data.data : undefined;
  const [fadeIn] = useState(pace === undefined);
  return { pace, fadeIn };
}

export function useHomeCardOpened(groupId: number) {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.stats.homeCardOpened.mutationOptions());
  return (card: HomeCardName) => mutate({ groupId, card });
}

export function HomeCard({
  href,
  title,
  testId,
  onOpen,
  children,
}: {
  href: string;
  title: string;
  testId: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      onClick={onOpen}
      className="block rounded-3xl"
    >
      <TitledCard
        title={title}
        aside={<ChevronRight className="size-4" />}
        className="hover:border-foreground/30 transition-colors"
      >
        {children}
      </TitledCard>
    </Link>
  );
}

export function TitledCard({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn("flex flex-col rounded-3xl p-4 shadow-none", className)}
    >
      <div className="text-muted-foreground flex items-center justify-between text-sm font-semibold">
        {title}
        {aside}
      </div>
      {children}
    </Card>
  );
}

export function PaceNumbers({
  pace,
  today,
  format,
  unit,
  fadeIn,
}: {
  pace: Pace | undefined;
  today: string | undefined;
  format: (value: number) => string;
  unit?: (count: number) => string;
  fadeIn: boolean;
}) {
  if (!pace || !today)
    return (
      <>
        <Skeleton className="mt-2 h-10 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </>
    );

  return (
    <div className={cn(fadeIn && "animate-in fade-in duration-300")}>
      <Headline value={paceSummary(pace).total} format={format} unit={unit} />
      <p className="text-muted-foreground text-sm">
        <PaceComparison pace={pace} today={today} format={format} />
      </p>
    </div>
  );
}

export const bold = (chunks: React.ReactNode) => (
  <b className="text-foreground font-semibold">{chunks}</b>
);

export function Headline({
  value,
  format,
  unit,
}: {
  value: number;
  format: (value: number) => string;
  unit?: (count: number) => string;
}) {
  return (
    <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
      {format(value)}
      {unit && (
        <span className="text-muted-foreground ml-1 text-base font-medium tracking-normal">
          {unit(value)}
        </span>
      )}
    </p>
  );
}

export function PaceComparison({
  pace,
  today,
  format,
  wholeMonth = false,
}: {
  pace: Pace;
  today: string;
  format: (value: number) => string;
  wholeMonth?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { difference, direction } = paceSummary(pace);

  return t.rich(
    wholeMonth
      ? `statistics.wholeMonth.${direction}`
      : `home.pace.${direction}`,
    {
      amount: format(Math.abs(difference)),
      month: paceLabels(today, locale).previousMonth,
      b: bold,
    },
  );
}
