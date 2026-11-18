import { z } from "zod/v4";

import {
  calendarDateSchema,
  DEFAULT_TIME_ZONE,
  formatCalendarDate,
  ianaTimeZoneSchema,
  monthOf,
  shiftMonth,
} from "./calendar";

export const homePaceInputSchema = z.object({
  groupId: z.number(),
  today: calendarDateSchema,
  timeZone: ianaTimeZoneSchema.catch(DEFAULT_TIME_ZONE),
});

const paceSchema = z.object({
  current: z.array(z.number()),
  previous: z.array(z.number()),
});
export type Pace = z.infer<typeof paceSchema>;

export const homePaceSchema = z.object({
  spending: paceSchema,
  itemsBought: paceSchema,
  choresDone: paceSchema,
});
export type HomePace = z.infer<typeof homePaceSchema>;

const dayOfMonth = (date: string) => Number(date.slice(8));

const daysInMonth = (month: string) => {
  const [year = 1970, monthNumber = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
};

export const previousMonth = (today: string) => shiftMonth(monthOf(today), -1);

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

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

export function paceSummary({ current, previous }: Pace) {
  const total = sum(current);
  const difference = total - sum(previous.slice(0, current.length));
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
  const round = (value: number) => Math.round(value * 10) / 10;
  const point = (value: number, index: number) => ({
    x: round((index / lastDay) * width),
    y: round(height - (value / top) * height),
  });
  const line = (points: { x: number; y: number }[]) =>
    points.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const nowPoints = now.map(point);
  const beforePoints = before.map(point);
  const end = nowPoints.at(-1) ?? { x: 0, y: height };
  return {
    now: line(nowPoints),
    before: line(beforePoints),
    area: `${line(nowPoints)} L${end.x},${height} L0,${height} Z`,
    end,
    beforeEnd: beforePoints.at(-1) ?? { x: width, y: height },
  };
}
