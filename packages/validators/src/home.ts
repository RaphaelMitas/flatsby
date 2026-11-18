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

interface Point {
  x: number;
  y: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

function slopesAt(points: Point[]) {
  const steps = points.slice(1).map((point, i) => {
    const from = points[i] ?? point;
    const width = point.x - from.x || 1;
    return { width, rise: (point.y - from.y) / width };
  });
  return points.map((_, i) => {
    const before = steps[i - 1];
    const after = steps[i];
    if (!before || !after) return (before ?? after)?.rise ?? 0;
    if (before.rise * after.rise <= 0) return 0;
    const mean =
      (before.rise * after.width + after.rise * before.width) /
      (before.width + after.width);
    return (
      Math.sign(mean) *
      Math.min(
        Math.abs(mean),
        1.5 * Math.abs(before.rise),
        1.5 * Math.abs(after.rise),
      )
    );
  });
}

function smoothLine(days: Point[]) {
  const points = days.filter(
    (day, i) => i === 0 || i === days.length - 1 || day.y !== days[i - 1]?.y,
  );
  const slopes = slopesAt(points);
  return points
    .map((point, i) => {
      const from = points[i - 1];
      if (!from) return `M${point.x},${point.y}`;
      const third = (point.x - from.x) / 3;
      const leave = round(from.y + third * (slopes[i - 1] ?? 0));
      const arrive = round(point.y - third * (slopes[i] ?? 0));
      return `C${round(from.x + third)},${leave} ${round(point.x - third)},${arrive} ${point.x},${point.y}`;
    })
    .join(" ");
}

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
    x: round((index / lastDay) * width),
    y: round(height - (value / top) * height),
  });
  const nowPoints = now.map(point);
  const beforePoints = before.map(point);
  const end = nowPoints.at(-1) ?? { x: 0, y: height };
  return {
    now: smoothLine(nowPoints),
    before: smoothLine(beforePoints),
    area: `${smoothLine(nowPoints)} L${end.x},${height} L0,${height} Z`,
    end,
    beforeEnd: beforePoints.at(-1) ?? { x: width, y: height },
  };
}
