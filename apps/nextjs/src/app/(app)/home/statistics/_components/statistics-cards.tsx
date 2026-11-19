"use client";

import type { ExpenseLink } from "@flatsby/validators/expenses/list-filter";
import type { Pace } from "@flatsby/validators/home";
import type { Statistics } from "@flatsby/validators/statistics";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Timer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useCountUp } from "@flatsby/api/hooks/useCountUp";
import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { getExpenseCategoryData } from "@flatsby/ui/categories/expense-categories";
import {
  expenseCategoryGroupColorKeys,
  groupIconSubcategory,
} from "@flatsby/validators/expenses/categories";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";
import { formatWholeAmountFromCents } from "@flatsby/validators/expenses/formatting";

import type { MonthPicker } from "./month-bars";
import {
  bold,
  Headline,
  PaceComparison,
  TitledCard,
} from "../../_components/home-card";
import { MonthBars } from "./month-bars";
import { SplitBar } from "./split-bar";

const SPENDING_BAR_HEIGHT = 96;
const COUNT_BAR_HEIGHT = 48;

export function CategoriesCard({
  spending: { categories, share: total },
  from,
  to,
  money,
}: {
  spending: Statistics["spending"];
  from: string;
  to: string;
  money: (cents: number) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [lit, setLit] = useState<string | null>(null);
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const listed = categories.map((entry) => ({
    ...entry,
    name: t(`expenseCategories.groups.${entry.category}`),
    href: `/expenses?${new URLSearchParams({ category: entry.category, from, to } satisfies ExpenseLink)}`,
  }));

  return (
    <TitledCard title={t("statistics.whereItWent")}>
      <SplitBar
        segments={listed.map(({ category, share, name }) => ({
          key: category,
          value: share,
          label: name,
          className:
            categoryFillColorMap[expenseCategoryGroupColorKeys[category]],
          tooltip: (
            <>
              <span className="font-bold">{name}</span>{" "}
              {t("statistics.ofYourShare", {
                percent: percent.format(share / total),
              })}
            </>
          ),
        }))}
        lit={lit}
        onLit={setLit}
        onPick={(key) => {
          const picked = listed.find(({ category }) => category === key);
          if (picked) router.push(picked.href);
        }}
      />
      <div className="mt-2 flex flex-col">
        {listed.map(({ category, share, household, name, href }) => {
          const data = getExpenseCategoryData(groupIconSubcategory(category));
          return (
            <Link
              key={category}
              href={href}
              data-testid={`statistics-category-${category}`}
              onPointerEnter={() => setLit(category)}
              onPointerLeave={() => setLit(null)}
              className={cn(
                "hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl p-2 transition-[background-color,opacity]",
                lit === category && "bg-muted",
                lit !== null && lit !== category && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  data.colorClasses.bg,
                )}
              >
                <data.icon className={cn("size-4", data.colorClasses.base)} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{name}</span>
                <span className="text-muted-foreground text-sm">
                  {t("statistics.householdAmount", {
                    amount: money(household),
                  })}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{money(share)}</span>
              <ChevronRight className="text-muted-foreground size-4" />
            </Link>
          );
        })}
      </div>
    </TitledCard>
  );
}

export function MonthByMonthCard({
  months,
  picker,
  money,
}: {
  months: Statistics["spending"]["months"];
  picker: MonthPicker;
  money: (cents: number) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <TitledCard
      title={t("statistics.monthByMonth")}
      aside={
        <span className="flex gap-3 text-xs font-medium">
          <LegendKey className="bg-foreground">{t("statistics.you")}</LegendKey>
          <LegendKey className="bg-muted-foreground/20">
            {t("statistics.household")}
          </LegendKey>
        </span>
      }
    >
      <MonthBars
        months={months.map(({ month, household, share }) => ({
          month,
          total: household,
          share,
        }))}
        height={SPENDING_BAR_HEIGHT}
        format={(cents) => formatWholeAmountFromCents(cents, locale)}
        details={({ total, share = 0 }) => [
          { label: t("statistics.you"), value: money(share) },
          { label: t("statistics.household"), value: money(total) },
        ]}
        picker={picker}
      />
    </TitledCard>
  );
}

export function ShoppingStatsCard({
  stats: { shopping, to, wholeMonth },
  picker,
}: {
  stats: Statistics;
  picker: MonthPicker;
}) {
  const t = useTranslations();
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const segments = shopping.categories.map(({ category, total }) => ({
    key: category,
    value: total,
    label: t(`shoppingCategories.names.${category}`),
    tint: getCategoryData(category).colorClasses.base,
  }));
  const filtered = segments.find(({ key }) => key === picked);
  const lit = filtered?.key ?? hovered;
  const toggle = (key: string) => setPicked(picked === key ? null : key);

  return (
    <CountCard
      title={t("navigation.shopping")}
      total={filtered ? filtered.value : shopping.total}
      unit={(count) => t("home.itemsBought", { count })}
      only={
        filtered && {
          label: filtered.label,
          tint: filtered.tint,
          of: t("statistics.ofItemsBought", { count: shopping.total }),
        }
      }
      pace={shopping.pace}
      to={to}
      wholeMonth={wholeMonth}
      months={shopping.months.map(({ month, total, categories }) => ({
        month,
        total: filtered ? (categories[filtered.key] ?? 0) : total,
      }))}
      picker={picker}
    >
      {segments.length > 0 && (
        <>
          <SplitBar
            segments={segments.map(({ tint, ...segment }) => ({
              ...segment,
              className: cn("bg-current", tint),
            }))}
            lit={lit}
            onLit={setHovered}
            onPick={toggle}
          />
          <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
            {segments.map(({ key, value, label, tint }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filtered?.key === key}
                onClick={() => toggle(key)}
                onPointerEnter={() => setHovered(key)}
                onPointerLeave={() => setHovered(null)}
                className={cn(
                  "hover:text-foreground flex items-center gap-1.5 transition-[color,opacity]",
                  filtered?.key === key && "text-foreground",
                  lit !== null && lit !== key && "opacity-40",
                )}
              >
                <span className={cn("size-2.5 rounded-sm bg-current", tint)} />
                {label}
                <b className="text-foreground tabular-nums">{value}</b>
              </button>
            ))}
          </div>
        </>
      )}
      {shopping.daysOnList !== null && (
        <div className="text-muted-foreground mt-4 flex items-center gap-3 text-sm">
          <span className="bg-muted text-foreground grid size-9 shrink-0 place-items-center rounded-full">
            <Timer className="size-4" />
          </span>
          <span>
            {t.rich("statistics.daysOnList", {
              count: shopping.daysOnList,
              b: bold,
            })}
          </span>
        </div>
      )}
    </CountCard>
  );
}

export function ChoresStatsCard({
  stats: { chores, to, wholeMonth },
  picker,
}: {
  stats: Statistics;
  picker: MonthPicker;
}) {
  const t = useTranslations();

  return (
    <CountCard
      title={t("statistics.chores")}
      total={chores.total}
      unit={(count) => t("home.choresDone", { count })}
      pace={chores.pace}
      to={to}
      wholeMonth={wholeMonth}
      months={chores.months}
      picker={picker}
    >
      <div className="mt-2 flex flex-col">
        {chores.titles.map(({ title, color, total }) => (
          <div key={title} className="mt-2 flex items-center gap-3">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                categoryFillColorMap[color],
              )}
            />
            <span className="flex-1 truncate font-semibold">{title}</span>
            <span className="text-muted-foreground tabular-nums">
              {t("statistics.times", { count: total })}
            </span>
          </div>
        ))}
      </div>
    </CountCard>
  );
}

function CountCard({
  title,
  total,
  unit,
  only,
  pace,
  to,
  wholeMonth,
  months,
  picker,
  children,
}: {
  title: string;
  total: number;
  unit: (count: number) => string;
  only?: { label: string; tint: string; of: string };
  pace: Pace | null;
  to: string;
  wholeMonth: boolean;
  months: { month: string; total: number }[];
  picker: MonthPicker;
  children: React.ReactNode;
}) {
  return (
    <TitledCard title={title}>
      <Headline
        value={useCountUp(total)}
        format={String}
        unit={() => (only ? `× ${only.label}` : unit(total))}
      />
      {pace && (
        <p className="text-muted-foreground text-sm">
          {only?.of ?? (
            <PaceComparison
              pace={pace}
              today={to}
              format={String}
              wholeMonth={wholeMonth}
            />
          )}
        </p>
      )}
      <MonthBars
        months={months}
        height={COUNT_BAR_HEIGHT}
        format={String}
        details={(month) => [
          {
            label: only?.label ?? unit(month.total),
            value: String(month.total),
          },
        ]}
        picker={picker}
        tint={only?.tint}
      />
      {children}
    </TitledCard>
  );
}

function LegendKey({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {children}
    </span>
  );
}
