import { z } from "zod/v4";

import type { CalendarColor } from "./calendar";
import type { CategoryId } from "./categories";
import type { ConvertibleExpense } from "./expenses/conversion";
import {
  calendarColorSchema,
  calendarDateSchema,
  daysInMonth,
  DEFAULT_TIME_ZONE,
  defaultColorFor,
  ianaTimeZoneSchema,
  monthOf,
  shiftMonth,
} from "./calendar";
import {
  categoryIds,
  categoryIdSchema,
  isCategoryId,
  topCategories,
} from "./categories";
import {
  expenseCategoryGroups,
  getSubcategoryGroup,
} from "./expenses/categories";
import { inLedgerCurrency } from "./expenses/conversion";
import { monthPace, paceSchema } from "./home";

export const statisticsRanges = [
  "thisMonth",
  "lastMonth",
  "last3Months",
  "thisYear",
  "sinceJoined",
] as const;
export type StatisticsRange = (typeof statisticsRanges)[number];

export const statisticsInputSchema = z.object({
  groupId: z.number(),
  range: z.enum(statisticsRanges),
  timeZone: ianaTimeZoneSchema.catch(DEFAULT_TIME_ZONE),
});

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const totalSchema = { total: z.number() };
const spendingTotalsSchema = { share: z.number(), household: z.number() };

export const statisticsSchema = z.object({
  today: calendarDateSchema,
  from: calendarDateSchema,
  to: calendarDateSchema,
  spending: z.object({
    ...spendingTotalsSchema,
    pace: paceSchema.nullable(),
    categories: z.array(
      z.object({
        category: z.enum(expenseCategoryGroups),
        ...spendingTotalsSchema,
      }),
    ),
    months: z.array(z.object({ month: monthSchema, ...spendingTotalsSchema })),
  }),
  shopping: z.object({
    ...totalSchema,
    pace: paceSchema.nullable(),
    months: z.array(z.object({ month: monthSchema, ...totalSchema })),
    categories: z.array(
      z.object({ category: categoryIdSchema, ...totalSchema }),
    ),
    daysOnList: z.number().nullable(),
  }),
  chores: z.object({
    ...totalSchema,
    pace: paceSchema.nullable(),
    months: z.array(z.object({ month: monthSchema, ...totalSchema })),
    titles: z.array(
      z.object({
        title: z.string(),
        color: calendarColorSchema,
        ...totalSchema,
      }),
    ),
  }),
});
export type Statistics = z.infer<typeof statisticsSchema>;

interface Period {
  from: string;
  to: string;
}

export interface StatisticsPeriod extends Period {
  pace: boolean;
}

const firstOf = (month: string) => `${month}-01`;
const lastOf = (month: string) => `${month}-${daysInMonth(month)}`;
const earlier = (a: string, b: string) => (a < b ? a : b);

export function statisticsPeriod(
  range: StatisticsRange,
  today: string,
  joinedOn: string,
): StatisticsPeriod {
  const month = monthOf(today);
  switch (range) {
    case "thisMonth":
      return { from: firstOf(month), to: today, pace: true };
    case "lastMonth": {
      const previous = shiftMonth(month, -1);
      return { from: firstOf(previous), to: lastOf(previous), pace: true };
    }
    case "last3Months":
      return { from: firstOf(shiftMonth(month, -2)), to: today, pace: false };
    case "thisYear":
      return { from: `${today.slice(0, 4)}-01-01`, to: today, pace: false };
    case "sinceJoined":
      return { from: earlier(joinedOn, today), to: today, pace: false };
  }
}

const MONTHS_SHOWN = 6;

const shownMonths = (to: string) =>
  Array.from({ length: MONTHS_SHOWN }, (_, i) =>
    shiftMonth(monthOf(to), i + 1 - MONTHS_SHOWN),
  );

export const statisticsWindow = ({ from, to }: Period): Period => ({
  from: earlier(from, firstOf(shiftMonth(monthOf(to), 1 - MONTHS_SHOWN))),
  to,
});

interface CountDay {
  day: string;
  total: number;
}

const within = <Row extends { day: string }>(
  rows: Row[],
  { from, to }: Period,
) => rows.filter(({ day }) => day >= from && day <= to);

const sumOf = <Row>(rows: Row[], value: (row: Row) => number) =>
  rows.reduce((total, row) => total + value(row), 0);

const byMonth = <Row extends { day: string }, Totals>(
  rows: Row[],
  to: string,
  totals: (rows: Row[]) => Totals,
) =>
  shownMonths(to).map((month) => ({
    month,
    ...totals(rows.filter(({ day }) => monthOf(day) === month)),
  }));

const paceOf = (period: StatisticsPeriod, days: CountDay[]) =>
  period.pace ? monthPace(days, period.to) : null;

const countTotals = (rows: CountDay[]) => ({
  total: sumOf(rows, ({ total }) => total),
});

export interface SpendingDay {
  day: string;
  subcategory: string;
  share: number;
  household: number;
}

const spendingTotals = (rows: SpendingDay[]) => ({
  share: sumOf(rows, ({ share }) => share),
  household: sumOf(rows, ({ household }) => household),
});

export const convertedShares = (
  expenses: (ConvertibleExpense & { day: string; subcategory: string })[],
  groupMemberId: number,
): SpendingDay[] =>
  expenses.map(({ day, subcategory, ...expense }) => ({
    day,
    subcategory,
    household: 0,
    share:
      inLedgerCurrency(expense).expenseSplits.find(
        (split) => split.groupMemberId === groupMemberId,
      )?.amountInCents ?? 0,
  }));

export function spendingStatistics(
  days: SpendingDay[],
  period: StatisticsPeriod,
): Statistics["spending"] {
  const shown = within(days, statisticsWindow(period));
  const inRange = within(days, period);
  return {
    ...spendingTotals(inRange),
    pace: paceOf(
      period,
      shown.map(({ day, share }) => ({ day, total: share })),
    ),
    categories: expenseCategoryGroups
      .map((category) => ({
        category,
        ...spendingTotals(
          inRange.filter(
            ({ subcategory }) => getSubcategoryGroup(subcategory) === category,
          ),
        ),
      }))
      .filter(({ household }) => household > 0)
      .sort((a, b) => b.share - a.share || b.household - a.household),
    months: byMonth(shown, period.to, spendingTotals),
  };
}

const MIN_ITEMS_FOR_DAYS_ON_LIST = 5;

export const daysOnList = ({
  items,
  medianDays,
}: {
  items: number;
  medianDays: number | null;
}) =>
  items < MIN_ITEMS_FOR_DAYS_ON_LIST || medianDays === null
    ? null
    : Math.max(1, Math.ceil(medianDays));

export function shoppingStatistics(
  days: (CountDay & { category: string })[],
  period: StatisticsPeriod,
  onList: { items: number; medianDays: number | null },
): Statistics["shopping"] {
  const shown = within(days, statisticsWindow(period));
  const inRange = within(days, period);
  const counts: Partial<Record<CategoryId, number>> = {};
  for (const { category, total } of inRange) {
    const id = isCategoryId(category) ? category : "other";
    counts[id] = (counts[id] ?? 0) + total;
  }
  return {
    ...countTotals(inRange),
    pace: paceOf(period, shown),
    months: byMonth(shown, period.to, countTotals),
    categories: topCategories(counts, categoryIds.length).map((category) => ({
      category,
      total: counts[category] ?? 0,
    })),
    daysOnList: daysOnList(onList),
  };
}

const MAX_CHORE_TITLES = 5;

export function choreStatistics(
  days: (CountDay & { title: string })[],
  colors: { title: string; color: CalendarColor }[],
  period: StatisticsPeriod,
): Statistics["chores"] {
  const shown = within(days, statisticsWindow(period));
  const inRange = within(days, period);
  const totals = new Map<string, number>();
  for (const { title, total } of inRange)
    totals.set(title, (totals.get(title) ?? 0) + total);
  return {
    ...countTotals(inRange),
    pace: paceOf(period, shown),
    months: byMonth(shown, period.to, countTotals),
    titles: [...totals]
      .map(([title, total]) => ({
        title,
        total,
        color:
          colors.find((chore) => chore.title === title)?.color ??
          defaultColorFor("task"),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, MAX_CHORE_TITLES),
  };
}

export const barHeights = (values: number[], height: number) => {
  const top = Math.max(0, ...values);
  return values.map((value) => (top === 0 ? 0 : (value / top) * height));
};
