import { z } from "zod/v4";

import type { CalendarColor } from "./calendar";
import type { CategoryId } from "./categories";
import type { ConvertibleExpense } from "./expenses/conversion";
import type { Pace, PacePoint } from "./home";
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
import { categoryIdSchema, isCategoryId, topCategories } from "./categories";
import {
  expenseCategoryGroups,
  getSubcategoryGroup,
} from "./expenses/categories";
import { inLedgerCurrency } from "./expenses/conversion";
import { directionOf, monthPace, paceSchema, sum } from "./home";

export const statisticsPresets = [
  "last3Months",
  "thisYear",
  "sinceJoined",
] as const;
type StatisticsPreset = (typeof statisticsPresets)[number];

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const statisticsRangeSchema = z.union([z.enum(statisticsPresets), monthSchema]);
export type StatisticsRange = z.infer<typeof statisticsRangeSchema>;

export const statisticsInputSchema = z.object({
  groupId: z.number(),
  range: statisticsRangeSchema,
  timeZone: ianaTimeZoneSchema.catch(DEFAULT_TIME_ZONE),
});

export const statisticsUsedSchema = z.object({
  groupId: z.number(),
  action: z.enum(["month", "range", "scrub", "shoppingFilter", "category"]),
  range: statisticsRangeSchema,
});
export type StatisticsAction = z.infer<typeof statisticsUsedSchema>["action"];

const totalSchema = { total: z.number() };
const spendingTotalsSchema = { share: z.number(), household: z.number() };

export const statisticsSchema = z.object({
  wholeMonth: z.boolean(),
  from: calendarDateSchema,
  to: calendarDateSchema,
  spending: z.object({
    ...spendingTotalsSchema,
    pace: paceSchema.extend({ household: z.array(z.number()) }).nullable(),
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
    months: z.array(
      z.object({
        month: monthSchema,
        ...totalSchema,
        categories: z.partialRecord(categoryIdSchema, z.number()),
      }),
    ),
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
  today: string;
  pace: "toDate" | "wholeMonth" | null;
}

const firstOf = (month: string) => `${month}-01`;
const lastOf = (month: string) => `${month}-${daysInMonth(month)}`;
const earlier = (a: string, b: string) => (a < b ? a : b);

const MONTHS_SHOWN = 6;

const shownMonths = (today: string) =>
  Array.from({ length: MONTHS_SHOWN }, (_, i) =>
    shiftMonth(monthOf(today), i + 1 - MONTHS_SHOWN),
  );

export const presetOf = (range: StatisticsRange) =>
  statisticsPresets.find((preset) => preset === range);

export const statisticsChoices = (
  today: string,
): { key: "thisMonth" | "lastMonth" | StatisticsPreset; range: string }[] => [
  { key: "thisMonth", range: monthOf(today) },
  { key: "lastMonth", range: shiftMonth(monthOf(today), -1) },
  ...statisticsPresets.map((preset) => ({ key: preset, range: preset })),
];

export function statisticsPeriod(
  range: StatisticsRange,
  today: string,
  joinedOn: string,
): StatisticsPeriod | null {
  const month = monthOf(today);
  const untilToday = { to: today, today };
  switch (range) {
    case "last3Months":
      return {
        from: firstOf(shiftMonth(month, -2)),
        ...untilToday,
        pace: null,
      };
    case "thisYear":
      return {
        from: `${today.slice(0, 4)}-01-01`,
        ...untilToday,
        pace: null,
      };
    case "sinceJoined":
      return { from: earlier(joinedOn, today), ...untilToday, pace: null };
  }
  if (range === month)
    return { from: firstOf(month), ...untilToday, pace: "toDate" };
  if (!shownMonths(today).includes(range)) return null;
  return { from: firstOf(range), to: lastOf(range), today, pace: "wholeMonth" };
}

export const coversMonth = (
  month: string,
  range: StatisticsRange,
  { from, to }: Period,
) =>
  presetOf(range)
    ? month >= monthOf(from) && month <= monthOf(to)
    : month === range;

export const statisticsWindow = ({
  from,
  today,
  pace,
}: StatisticsPeriod): Period => ({
  from: earlier(
    pace ? firstOf(shiftMonth(monthOf(from), -1)) : from,
    firstOf(shiftMonth(monthOf(today), 1 - MONTHS_SHOWN)),
  ),
  to: today,
});

interface CountDay {
  day: string;
  total: number;
}

const within = <Row extends { day: string }>(
  rows: Row[],
  { from, to }: Period,
) => rows.filter(({ day }) => day >= from && day <= to);

const byMonth = <Row extends { day: string }, Totals>(
  rows: Row[],
  today: string,
  totals: (rows: Row[]) => Totals,
) =>
  shownMonths(today).map((month) => ({
    month,
    ...totals(rows.filter(({ day }) => monthOf(day) === month)),
  }));

const withinShownDays = ({ current, previous }: Pace): Pace => ({
  current,
  previous:
    previous.length > current.length
      ? [
          ...previous.slice(0, current.length - 1),
          sum(previous.slice(current.length - 1)),
        ]
      : previous,
});

const paceOf = (period: StatisticsPeriod, days: CountDay[]) => {
  if (!period.pace) return null;
  const pace = monthPace(days, period.to);
  return period.pace === "wholeMonth" ? withinShownDays(pace) : pace;
};

const countTotals = (rows: CountDay[]) => ({
  total: sum(rows.map(({ total }) => total)),
});

export interface SpendingDay {
  day: string;
  subcategory: string;
  share: number;
  household: number;
}

const spendingTotals = (rows: SpendingDay[]) => ({
  share: sum(rows.map(({ share }) => share)),
  household: sum(rows.map(({ household }) => household)),
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
  const pace = paceOf(
    period,
    shown.map(({ day, share }) => ({ day, total: share })),
  );
  return {
    ...spendingTotals(inRange),
    pace: pace && {
      ...pace,
      household: monthPace(
        shown.map(({ day, household }) => ({ day, total: household })),
        period.to,
      ).current,
    },
    categories: expenseCategoryGroups
      .map((category) => ({
        category,
        ...spendingTotals(
          inRange.filter(
            ({ subcategory }) => getSubcategoryGroup(subcategory) === category,
          ),
        ),
      }))
      .filter(({ share }) => share > 0)
      .sort((a, b) => b.share - a.share || b.household - a.household),
    months: byMonth(shown, period.today, spendingTotals),
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

type CategoryDay = CountDay & { category: string };

const categoryCounts = (rows: CategoryDay[]) => {
  const counts: Partial<Record<CategoryId, number>> = {};
  for (const { category, total } of rows) {
    const id = isCategoryId(category) ? category : "other";
    counts[id] = (counts[id] ?? 0) + total;
  }
  return counts;
};

export function shoppingStatistics(
  days: CategoryDay[],
  period: StatisticsPeriod,
  onList: { items: number; medianDays: number | null },
): Statistics["shopping"] {
  const shown = within(days, statisticsWindow(period));
  const inRange = within(days, period);
  const counts = categoryCounts(inRange);
  return {
    ...countTotals(inRange),
    pace: paceOf(period, shown),
    months: byMonth(shown, period.today, (rows) => ({
      ...countTotals(rows),
      categories: categoryCounts(rows),
    })),
    categories: topCategories(counts).map((category) => ({
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
    months: byMonth(shown, period.today, countTotals),
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

export function scrubbedShare(
  { household }: NonNullable<Statistics["spending"]["pace"]>,
  { index, now, before }: PacePoint,
) {
  if (!before) return null;
  const difference = now ? now.total - before.total : before.total;
  const comparison: "less" | "more" | "same" | "before" = now
    ? directionOf(difference)
    : "before";
  return {
    by: now?.date,
    share: now?.total,
    household: now && sum(household.slice(0, index + 1)),
    comparison,
    amount: Math.abs(difference),
    before: before.date,
  };
}

export const isStatisticsEmpty = ({ spending, shopping, chores }: Statistics) =>
  spending.household === 0 &&
  shopping.total === 0 &&
  chores.total === 0 &&
  spending.months.every(
    ({ share, household }) => share === 0 && household === 0,
  ) &&
  [...shopping.months, ...chores.months].every(({ total }) => total === 0);

export const barHeights = (values: number[], height: number) => {
  const top = Math.max(0, ...values);
  return values.map((value) => (top === 0 ? 0 : (value / top) * height));
};
