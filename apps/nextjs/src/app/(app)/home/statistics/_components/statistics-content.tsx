"use client";

import type {
  Statistics,
  StatisticsAction,
  StatisticsRange,
} from "@flatsby/validators/statistics";
import { useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useCountUp } from "@flatsby/api/hooks/useCountUp";
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
  monthOf,
} from "@flatsby/validators/calendar";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { paceAt } from "@flatsby/validators/home";
import {
  isStatisticsEmpty,
  presetOf,
  scrubbedShare,
  statisticsChoices,
  statisticsPeriod,
} from "@flatsby/validators/statistics";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useToday } from "~/app/_components/local-clock";
import { useTRPC } from "~/trpc/react";
import { bold, PaceComparison } from "../../_components/home-card";
import { PACE_SIZE, PaceChart } from "../../_components/pace-chart";
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
  const trpc = useTRPC();
  const [chosen, setChosen] = useState<StatisticsRange>();
  const range =
    today === null
      ? undefined
      : chosen && statisticsPeriod(chosen, today, today)
        ? chosen
        : monthOf(today);
  const used = useMutation(trpc.stats.statisticsUsed.mutationOptions());
  const count = (action: StatisticsAction, counted = range) => {
    if (currentGroup && counted)
      used.mutate({ groupId: currentGroup.id, action, range: counted });
  };
  const choose = (action: StatisticsAction, next: StatisticsRange) => {
    count(action, next);
    setChosen(next);
  };

  return (
    <div className="mx-auto flex w-full max-w-prose flex-col gap-6 p-4">
      <div className="flex flex-col items-start">
        <Button variant="ghost" asChild className="-ml-3">
          <Link href="/home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Link>
        </Button>
        <RangeTitle
          range={range}
          today={today}
          onChange={(next) => choose("range", next)}
        />
        <p className="text-muted-foreground mt-1">{currentGroup?.name}</p>
      </div>

      {currentGroup && (
        <StatisticsBody
          key={currentGroup.id}
          groupId={currentGroup.id}
          range={range}
          onMonth={(month) => choose("month", month)}
          onUsed={count}
        />
      )}
    </div>
  );
}

function RangeTitle({
  range,
  today,
  onChange,
}: {
  range: StatisticsRange | undefined;
  today: string | null;
  onChange: (range: StatisticsRange) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const preset = range && presetOf(range);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="statistics-range"
        className="hover:bg-muted data-[state=open]:bg-muted mt-3 -ml-2 flex items-center gap-2 rounded-xl px-2 py-1 text-left text-3xl font-extrabold tracking-tight transition-colors"
      >
        {range === undefined ? (
          <Skeleton className="h-9 w-40" />
        ) : preset ? (
          t(`statistics.ranges.${preset}`)
        ) : (
          formatCalendarDate(`${range}-01`, locale, { month: "long" })
        )}
        <ChevronDown className="text-muted-foreground size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64 rounded-2xl p-2">
        <DropdownMenuLabel>{t("statistics.ranges.title")}</DropdownMenuLabel>
        {today &&
          statisticsChoices(today).map(({ key, range: option }) => (
            <DropdownMenuItem
              key={key}
              data-testid={`statistics-range-${key}`}
              onSelect={() => onChange(option)}
              className={cn(
                "justify-between rounded-xl p-2",
                option === range && "font-semibold",
              )}
            >
              {t(`statistics.ranges.${key}`)}
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
  onMonth,
  onUsed,
}: {
  groupId: number;
  range: StatisticsRange | undefined;
  onMonth: (month: string) => void;
  onUsed: (action: StatisticsAction) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    ...trpc.stats.getStatistics.queryOptions(
      range ? { groupId, range, timeZone: deviceTimeZone() } : skipToken,
    ),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
  const stats = data?.success ? data.data : undefined;
  const [fadeIn] = useState(stats === undefined);
  const currency = group?.success ? group.data.currency : undefined;

  if (!stats || currency === undefined || range === undefined) {
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

  if (isStatisticsEmpty(stats))
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
  const { spending } = stats;
  const picker = { range, period: stats, onPick: onMonth };

  return (
    <div
      inert={isPlaceholderData}
      className={cn(
        "flex flex-col gap-4",
        fadeIn && "animate-in fade-in duration-300",
        isPlaceholderData && "opacity-50",
      )}
    >
      <ShareHero
        stats={stats}
        money={money}
        fadeIn={fadeIn}
        onScrub={() => onUsed("scrub")}
      />
      {spending.categories.length > 0 && (
        <CategoriesCard
          spending={spending}
          from={stats.from}
          to={stats.to}
          money={money}
          onOpen={() => onUsed("category")}
        />
      )}
      <MonthByMonthCard
        months={spending.months}
        picker={picker}
        money={money}
      />
      <ShoppingStatsCard
        stats={stats}
        picker={picker}
        onFilter={() => onUsed("shoppingFilter")}
      />
      <ChoresStatsCard stats={stats} picker={picker} />
    </div>
  );
}

function ShareHero({
  stats: { spending, to, wholeMonth },
  money,
  fadeIn,
  onScrub,
}: {
  stats: Statistics;
  money: (cents: number) => string;
  fadeIn: boolean;
  onScrub: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [scrubX, setScrubX] = useState<number | null>(null);
  const share = useCountUp(spending.share);
  const { pace } = spending;
  const point =
    pace && scrubX !== null ? paceAt(pace, to, PACE_SIZE, scrubX) : null;
  const scrubbed = pace && point && scrubbedShare(pace, point);
  const date = (day: string) =>
    formatCalendarDate(day, locale, { day: "numeric", month: "short" });

  return (
    <section className="mb-2">
      <p className="text-muted-foreground text-sm font-semibold">
        {scrubbed?.by
          ? t("statistics.yourShareBy", { date: date(scrubbed.by) })
          : t("statistics.yourShare")}
      </p>
      <p
        data-testid="statistics-share"
        className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums"
      >
        {money(scrubbed?.share ?? share)}
      </p>
      <p className="text-muted-foreground mt-2 text-balance">
        {t.rich("statistics.ofHousehold", {
          amount: money(scrubbed?.household ?? spending.household),
          b: bold,
        })}
      </p>
      {pace && (
        <>
          <p className="text-muted-foreground text-balance">
            {scrubbed ? (
              t.rich(`statistics.byDay.${scrubbed.comparison}`, {
                amount: money(scrubbed.amount),
                date: date(scrubbed.before),
                b: bold,
              })
            ) : (
              <PaceComparison
                pace={pace}
                today={to}
                format={money}
                wholeMonth={wholeMonth}
              />
            )}
          </p>
          <PaceChart
            pace={pace}
            today={to}
            className="h-28"
            labelled
            wholeMonth={wholeMonth}
            fadeIn={fadeIn}
            scrub={{
              point,
              onMove: (x) => {
                if (scrubX === null && x !== null) onScrub();
                setScrubX(x);
              },
            }}
          />
        </>
      )}
    </section>
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
