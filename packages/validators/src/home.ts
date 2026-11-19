import { area, curveMonotoneX, line } from "d3-shape";
import { z } from "zod/v4";

import {
  calendarDateSchema,
  daysInMonth,
  DEFAULT_TIME_ZONE,
  formatCalendarDate,
  ianaTimeZoneSchema,
  monthOf,
  shiftMonth,
} from "./calendar";

export const homePaceInputSchema = z.object({
  groupId: z.number(),
  today: calendarDateSchema.optional(),
  timeZone: ianaTimeZoneSchema.catch(DEFAULT_TIME_ZONE),
});

export const paceSchema = z.object({
  current: z.array(z.number()),
  previous: z.array(z.number()),
});
export type Pace = z.infer<typeof paceSchema>;

export const homePaceSchema = z.object({
  today: calendarDateSchema,
  spending: paceSchema,
  itemsBought: paceSchema,
  choresDone: paceSchema,
});

export const homeCardOpenedSchema = z.object({
  groupId: z.number(),
  card: z.enum(["expenses", "shopping", "calendar", "turn", "statistics"]),
});
export type HomeCardName = z.infer<typeof homeCardOpenedSchema>["card"];

const dayOfMonth = (date: string) => Number(date.slice(8));

const previousMonth = (today: string) => shiftMonth(monthOf(today), -1);

export const paceWindow = (today: string) => ({
  from: `${previousMonth(today)}-01`,
  to: today,
});

export function monthPace(
  days: { day: string; total: number }[],
  today: string,
): Pace {
  const month = monthOf(today);
  const before = previousMonth(today);
  const current = new Array<number>(dayOfMonth(today)).fill(0);
  const previous = new Array<number>(daysInMonth(before)).fill(0);
  for (const { day, total } of days) {
    const index = dayOfMonth(day) - 1;
    if (monthOf(day) === month && index < current.length)
      current[index] = (current[index] ?? 0) + total;
    if (monthOf(day) === before)
      previous[index] = (previous[index] ?? 0) + total;
  }
  return { current, previous };
}

export const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

export function paceSummary({ current, previous }: Pace, wholeMonth = false) {
  const total = sum(current);
  const difference =
    total - sum(wholeMonth ? previous : previous.slice(0, current.length));
  const direction: "less" | "more" | "same" =
    difference < 0 ? "less" : difference > 0 ? "more" : "same";
  return { total, difference, direction };
}

export function paceLabels(today: string, locale: Intl.LocalesArgument) {
  const month = monthOf(today);
  return {
    start: formatCalendarDate(`${month}-01`, locale, {
      day: "numeric",
      month: "short",
    }),
    end: formatCalendarDate(`${month}-${daysInMonth(month)}`, locale, {
      day: "numeric",
    }),
    previousMonth: formatCalendarDate(`${previousMonth(today)}-01`, locale, {
      month: "long",
    }),
  };
}

const running = (values: number[]) => {
  let total = 0;
  return values.map((value) => (total += value));
};

interface Point {
  x: number;
  y: number;
}

const daysWithActivity = (days: Point[]) =>
  days.filter(
    (day, i) => i === 0 || i === days.length - 1 || day.y !== days[i - 1]?.y,
  );

export function paceChart(
  { current, previous }: Pace,
  today: string,
  { width, height }: { width: number; height: number },
) {
  const days = daysInMonth(monthOf(today));
  const now = running(current);
  const before = running(previous.slice(0, days));
  const top = Math.max(now.at(-1) ?? 0, before.at(-1) ?? 0, 1);
  const lastDay = days - 1;
  const point = (value: number, index: number) => ({
    x: (index / lastDay) * width,
    y: height - (value / top) * height,
  });
  const nowPoints = now.map(point);
  const beforePoints = before.map(point);
  const end = nowPoints.at(-1) ?? { x: 0, y: height };
  const curve = line<Point>()
    .x(({ x }) => x)
    .y(({ y }) => y)
    .curve(curveMonotoneX);
  const fill = area<Point>()
    .x(({ x }) => x)
    .y0(height)
    .y1(({ y }) => y)
    .curve(curveMonotoneX);
  return {
    now: curve(daysWithActivity(nowPoints)) ?? "",
    before: curve(daysWithActivity(beforePoints)) ?? "",
    area: fill(daysWithActivity(nowPoints)) ?? "",
    end,
    beforeEnd: beforePoints.at(-1) ?? { x: width, y: height },
  };
}
