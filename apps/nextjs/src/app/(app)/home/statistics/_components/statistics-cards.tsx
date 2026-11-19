"use client";

import type { Pace } from "@flatsby/validators/home";
import type { Statistics } from "@flatsby/validators/statistics";
import Link from "next/link";
import { ChevronRight, Timer } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { getExpenseCategoryData } from "@flatsby/ui/categories/expense-categories";
import {
  expenseCategoryGroupColorKeys,
  groupIconSubcategory,
} from "@flatsby/validators/expenses/categories";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { expenseFilterHref } from "~/app/(app)/expenses/expenseFilterParams";
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

interface Period {
  from: string;
  to: string;
  wholeMonth: boolean;
}

export function CategoriesCard({
  categories,
  period,
  memberId,
  money,
}: {
  categories: Statistics["spending"]["categories"];
  period: Period;
  memberId: number;
  money: (cents: number) => string;
}) {
  const t = useTranslations();

  return (
    <TitledCard title={t("statistics.whereItWent")}>
      <SplitBar
        segments={categories.map(({ category, share }) => ({
          key: category,
          value: share,
          className:
            categoryFillColorMap[expenseCategoryGroupColorKeys[category]],
        }))}
      />
      <div className="mt-2 flex flex-col">
        {categories.map(({ category, share, household }) => {
          const data = getExpenseCategoryData(groupIconSubcategory(category));
          return (
            <Link
              key={category}
              href={expenseFilterHref({
                memberId,
                memberRole: "split",
                category,
                range: { from: period.from, to: period.to },
              })}
              data-testid={`statistics-category-${category}`}
              className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl p-2 transition-colors"
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
                <span className="truncate font-semibold">
                  {t(`expenseCategories.groups.${category}`)}
                </span>
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
  wholeAmount,
}: {
  months: Statistics["spending"]["months"];
  wholeAmount: (cents: number) => string;
}) {
  const t = useTranslations();

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
        format={wholeAmount}
      />
    </TitledCard>
  );
}

export function ShoppingStatsCard({
  shopping,
  period,
}: {
  shopping: Statistics["shopping"];
  period: Period;
}) {
  const t = useTranslations();

  return (
    <TitledCard title={t("navigation.shopping")}>
      <CountHeadline
        total={shopping.total}
        pace={shopping.pace}
        period={period}
        unit={(count) => t("home.itemsBought", { count })}
      />
      <MonthBars
        months={shopping.months}
        height={COUNT_BAR_HEIGHT}
        format={String}
      />
      {shopping.categories.length > 0 && (
        <>
          <SplitBar
            segments={shopping.categories.map(({ category, total }) => ({
              key: category,
              value: total,
              className: cn(
                "bg-current",
                getCategoryData(category).colorClasses.base,
              ),
            }))}
          />
          <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
            {shopping.categories.map(({ category, total }) => (
              <LegendKey
                key={category}
                className={cn(
                  "bg-current",
                  getCategoryData(category).colorClasses.base,
                )}
              >
                {t(`shoppingCategories.names.${category}`)}
                <b className="text-foreground tabular-nums">{total}</b>
              </LegendKey>
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
    </TitledCard>
  );
}

export function ChoresStatsCard({
  chores,
  period,
}: {
  chores: Statistics["chores"];
  period: Period;
}) {
  const t = useTranslations();

  return (
    <TitledCard title={t("statistics.chores")}>
      <CountHeadline
        total={chores.total}
        pace={chores.pace}
        period={period}
        unit={(count) => t("home.choresDone", { count })}
      />
      <MonthBars
        months={chores.months}
        height={COUNT_BAR_HEIGHT}
        format={String}
      />
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
    </TitledCard>
  );
}

function CountHeadline({
  total,
  pace,
  period,
  unit,
}: {
  total: number;
  pace: Pace | null;
  period: Period;
  unit: (count: number) => string;
}) {
  return (
    <>
      <Headline value={total} format={String} unit={unit} />
      {pace && (
        <p className="text-muted-foreground text-sm">
          <PaceComparison
            pace={pace}
            today={period.to}
            format={String}
            wholeMonth={period.wholeMonth}
          />
        </p>
      )}
    </>
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
