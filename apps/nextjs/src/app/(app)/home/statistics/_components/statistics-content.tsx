"use client";

import type { StatisticsRange } from "@flatsby/validators/statistics";
import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@flatsby/ui/dropdown-menu";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  deviceTimeZone,
  formatCalendarDate,
} from "@flatsby/validators/calendar";
import { centsToDecimal } from "@flatsby/validators/expenses/conversion";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import {
  statisticsMonth,
  statisticsRanges,
} from "@flatsby/validators/statistics";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useToday } from "~/app/_components/local-clock";
import { useTRPC } from "~/trpc/react";
import { bold, PaceComparison } from "../../_components/home-card";
import { PaceChart } from "../../_components/pace-chart";
import {
  CategoriesCard,
  ChoresStatsCard,
  MonthByMonthCard,
  ShoppingStatsCard,
} from "./statistics-cards";

export function StatisticsContent() {
  const t = useTranslations();
  const { currentGroup } = useGroupContext();
  const today = useToday();
  const [range, setRange] = useState<StatisticsRange>("thisMonth");

  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-6 p-4">
      <div className="flex flex-col items-start">
        <Button variant="ghost" asChild className="-ml-3">
          <Link href="/home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Link>
        </Button>
        <RangeTitle range={range} today={today} onChange={setRange} />
        <p className="text-muted-foreground mt-1">{currentGroup?.name}</p>
      </div>

      {currentGroup && (
        <StatisticsBody groupId={currentGroup.id} range={range} today={today} />
      )}
    </div>
  );
}

function RangeTitle({
  range,
  today,
  onChange,
}: {
  range: StatisticsRange;
  today: string | null;
  onChange: (range: StatisticsRange) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const month = today && statisticsMonth(range, today);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="statistics-range"
        className="mt-4 flex items-center gap-2 text-left text-3xl font-extrabold tracking-tight"
      >
        {today === null ? (
          <Skeleton className="h-9 w-40" />
        ) : month ? (
          formatCalendarDate(`${month}-01`, locale, { month: "long" })
        ) : (
          t(`statistics.ranges.${range}`)
        )}
        <ChevronDown className="text-muted-foreground size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64 rounded-2xl p-2">
        <DropdownMenuLabel>{t("statistics.ranges.title")}</DropdownMenuLabel>
        {statisticsRanges.map((option) => (
          <DropdownMenuItem
            key={option}
            data-testid={`statistics-range-${option}`}
            onSelect={() => onChange(option)}
            className={cn(
              "justify-between rounded-xl p-2",
              option === range && "font-semibold",
            )}
          >
            {t(`statistics.ranges.${option}`)}
            {option === range && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatisticsBody({
  groupId,
  range,
  today,
}: {
  groupId: number;
  range: StatisticsRange;
  today: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data, isError, isFetching, refetch } = useQuery({
    ...trpc.stats.getStatistics.queryOptions(
      today ? { groupId, range, timeZone: deviceTimeZone() } : skipToken,
    ),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const stats = data?.success ? data.data : undefined;
  const [fadeIn] = useState(stats === undefined);
  const currency = group?.success ? group.data.currency : undefined;
  const memberId = group?.success ? group.data.thisGroupMember.id : undefined;

  if (!stats || currency === undefined || memberId === undefined) {
    if (isError || data?.success === false)
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-muted-foreground">
            {t("home.somethingWentWrong")}
          </p>
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {t("home.retry")}
          </Button>
        </div>
      );
    return <StatisticsSkeleton />;
  }

  const { spending, shopping, chores } = stats;
  const nothingYet = [
    ...spending.months.map(({ household }) => household),
    ...shopping.months.map(({ total }) => total),
    ...chores.months.map(({ total }) => total),
  ].every((value) => value === 0);

  if (nothingYet)
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-lg font-semibold">{t("statistics.empty.title")}</p>
        <p className="text-muted-foreground text-sm">
          {t("statistics.empty.description")}
        </p>
      </div>
    );

  const money = (cents: number) =>
    formatCurrencyFromCents({ cents, currency, locale });
  const wholeAmount = (cents: number) =>
    Math.round(centsToDecimal(cents)).toLocaleString(locale);
  const period = {
    from: stats.from,
    to: stats.to,
    wholeMonth: stats.to !== stats.today,
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        fadeIn && "animate-in fade-in duration-300",
      )}
    >
      <section className="mb-2">
        <p className="text-muted-foreground text-sm font-semibold">
          {t("statistics.yourShare")}
        </p>
        <p
          data-testid="statistics-share"
          className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums"
        >
          {money(spending.share)}
        </p>
        <p className="text-muted-foreground mt-2 text-balance">
          {t.rich("statistics.ofHousehold", {
            amount: money(spending.household),
            b: bold,
          })}
          {spending.pace && (
            <>
              {" "}
              <PaceComparison
                pace={spending.pace}
                today={stats.to}
                format={money}
                wholeMonth={period.wholeMonth}
              />
            </>
          )}
        </p>
        {spending.pace && (
          <PaceChart
            pace={spending.pace}
            today={stats.to}
            className="h-28"
            labelled
            fadeIn={fadeIn}
          />
        )}
      </section>

      {spending.categories.length > 0 && (
        <CategoriesCard
          categories={spending.categories}
          period={period}
          memberId={memberId}
          money={money}
        />
      )}
      <MonthByMonthCard months={spending.months} wholeAmount={wholeAmount} />
      <ShoppingStatsCard shopping={shopping} period={period} />
      <ChoresStatsCard chores={chores} period={period} />
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2 flex flex-col">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-1 h-12 w-48" />
        <Skeleton className="mt-2 h-6 w-64" />
        <Skeleton className="mt-2 h-34" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-60 rounded-3xl" />
    </div>
  );
}
