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
  card: z.enum([
    "expenses",
    "shopping",
    "calendar",
    "turn",
    "statistics",
    "pinboard",
  ]),
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

export const isEmptyPace = ({ current, previous }: Pace) =>
  sum(current) === 0 && sum(previous) === 0;

export const directionOf = (difference: number): "less" | "more" | "same" =>
  difference < 0 ? "less" : difference > 0 ? "more" : "same";

export function paceSummary({ current, previous }: Pace) {
  const total = sum(current);
  const difference = total - sum(previous.slice(0, current.length));
  return { total, difference, direction: directionOf(difference) };
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

const signOf = (value: number) => (value < 0 ? -1 : 1);

function curveMonotoneY(points: Point[], x: number) {
  const first = points[0];
  if (!first) return 0;
  const rises = points.slice(1).map((point, i) => {
    const from = points[i] ?? point;
    return {
      run: point.x - from.x,
      rate: (point.y - from.y) / (point.x - from.x),
    };
  });
  const inner = rises.slice(1).map((next, i) => {
    const last = rises[i] ?? next;
    const mean =
      (last.rate * next.run + next.rate * last.run) / (last.run + next.run);
    return (
      (signOf(last.rate) + signOf(next.rate)) *
        Math.min(
          Math.abs(last.rate),
          Math.abs(next.rate),
          Math.abs(mean) / 2,
        ) || 0
    );
  });
  const edge = (rate: number, neighbour: number | undefined) =>
    neighbour === undefined ? rate : (3 * rate - neighbour) / 2;
  const slopes = [
    edge(rises[0]?.rate ?? 0, inner[0]),
    ...inner,
    edge(rises.at(-1)?.rate ?? 0, inner.at(-1)),
  ];
  const segment = Math.max(
    0,
    Math.min(
      rises.length - 1,
      points.filter((point) => point.x <= x).length - 1,
    ),
  );
  const from = points[segment] ?? first;
  const to = points[segment + 1] ?? from;
  const third = (to.x - from.x) / 3;
  if (third === 0) return from.y;
  const t = Math.min(1, Math.max(0, (x - from.x) / (to.x - from.x)));
  const u = 1 - t;
  return (
    u ** 3 * from.y +
    3 * u ** 2 * t * (from.y + third * (slopes[segment] ?? 0)) +
    3 * u * t ** 2 * (to.y - third * (slopes[segment + 1] ?? 0)) +
    t ** 3 * to.y
  );
}

interface Size {
  width: number;
  height: number;
}

function paceScale(
  { current, previous }: Pace,
  today: string,
  { width, height }: Size,
) {
  const lastDay = daysInMonth(monthOf(today)) - 1;
  const now = running(current);
  const before = running(previous.slice(0, lastDay + 1));
  const top = Math.max(now.at(-1) ?? 0, before.at(-1) ?? 0, 1);
  const point = (value: number, index: number) => ({
    x: (index / lastDay) * width,
    y: height - (value / top) * height,
  });
  return { lastDay, now, before, point };
}

export function paceAt(pace: Pace, today: string, size: Size, x: number) {
  const { lastDay, now, before, point } = paceScale(pace, today, size);
  const index = Math.min(
    lastDay,
    Math.max(0, Math.round((x / size.width) * lastDay)),
  );
  const beforeMonth = previousMonth(today);
  const cutShort = pace.previous.length > before.length;
  const on = (totals: number[], month: string, lastDate = totals.length) => {
    const day = Math.min(index, totals.length - 1);
    const total = totals[day];
    if (total === undefined) return null;
    const { x: dayX } = point(total, day);
    const date = day === totals.length - 1 ? lastDate : day + 1;
    return {
      date: `${month}-${String(date).padStart(2, "0")}`,
      total,
      x: dayX,
      y: curveMonotoneY(daysWithActivity(totals.map(point)), dayX),
    };
  };
  return {
    index,
    x: point(0, index).x,
    now: index < now.length ? on(now, monthOf(today)) : null,
    before: on(
      before,
      beforeMonth,
      cutShort ? before.length : daysInMonth(beforeMonth),
    ),
  };
}
export type PacePoint = ReturnType<typeof paceAt>;

export function paceChart(pace: Pace, today: string, size: Size) {
  const { now, before, point } = paceScale(pace, today, size);
  const { width, height } = size;
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
