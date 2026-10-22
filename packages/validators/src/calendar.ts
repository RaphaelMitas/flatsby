import type { Translate } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import type { CategoryColorKey } from "./expenses/category-colors";
import type { DebtPerson } from "./expenses/formatting";

export const weekdays = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
export const weekdaySchema = z.enum(weekdays);
export type Weekday = z.infer<typeof weekdaySchema>;

export const MAX_INTERVAL = {
  days: 365,
  weeks: 52,
  months: 24,
  years: 10,
} as const;
/** Far enough ahead to always reach a rule's next occurrence */
export const LONGEST_GAP_DAYS = 366 * MAX_INTERVAL.years;

export const weeksOfMonth = [
  "first",
  "second",
  "third",
  "fourth",
  "last",
] as const;
const dayOfMonthSchema = z.int().min(1).max(31);
/** A day past the end of a shorter month falls on its last day. */
export const monthDaySchema = z.union([
  z.object({ day: dayOfMonthSchema }),
  z.object({ week: z.enum(weeksOfMonth), weekday: weekdaySchema }),
]);
export type MonthDay = z.infer<typeof monthDaySchema>;
const yearDaySchema = z.object({
  month: z.int().min(1).max(12),
  day: dayOfMonthSchema,
});
export type YearDay = z.infer<typeof yearDaySchema>;

// Stored as jsonb; a new kind of repeat is a new member here, not a migration
export const recurrenceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("daily"),
    interval: z.int().min(1).max(MAX_INTERVAL.days),
  }),
  z.object({
    type: z.literal("weekly"),
    interval: z.int().min(1).max(MAX_INTERVAL.weeks),
    days: z
      .array(weekdaySchema)
      .min(1)
      .transform((days) => weekdays.filter((day) => days.includes(day))),
  }),
  z.object({
    type: z.literal("monthly"),
    interval: z.int().min(1).max(MAX_INTERVAL.months),
    on: monthDaySchema,
  }),
  z.object({
    type: z.literal("yearly"),
    interval: z.int().min(1).max(MAX_INTERVAL.years),
    on: yearDaySchema,
  }),
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const calendarDateSchema = z.iso.date();
export const calendarTimeSchema = z.iso.time({ precision: -1 });
/** An end before the start means the event runs past midnight. */
export const eventTimeSchema = z.object({
  start: calendarTimeSchema,
  end: calendarTimeSchema,
});
export type EventTime = z.infer<typeof eventTimeSchema>;
export const calendarItemKindSchema = z.enum(["task", "event"]);
export type CalendarItemKind = z.infer<typeof calendarItemKindSchema>;

export const calendarColors = [
  "gray",
  "blue",
  "cyan",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
] as const satisfies readonly CategoryColorKey[];
export const calendarColorSchema = z.enum(calendarColors);
export type CalendarColor = z.infer<typeof calendarColorSchema>;

// Matches how each kind looked before items had a color
export const defaultColorFor = (kind: CalendarItemKind): CalendarColor =>
  kind === "event" ? "blue" : "gray";

export const calendarItemTitleSchema = z
  .string()
  .trim()
  .min(1, { message: msg("calendar.validation.titleRequired") })
  .max(256, { message: msg("calendar.validation.titleTooLong") });

const calendarItemFields = z.object({
  groupId: z.number(),
  kind: calendarItemKindSchema,
  title: calendarItemTitleSchema,
  color: calendarColorSchema,
  startsOn: calendarDateSchema,
  time: eventTimeSchema.nullable(),
  recurrence: recurrenceSchema.nullable(),
  // undefined keeps the stored end; apps up to v0.12.0 leave it out
  endsOn: calendarDateSchema.nullable().optional(),
  memberIds: z.array(z.number()).max(50),
});

export const endsBeforeStart = (item: {
  startsOn: string;
  endsOn?: string | null;
}) => !!item.endsOn && item.endsOn < item.startsOn;

const isConsistentItem = (item: z.infer<typeof calendarItemFields>) =>
  (item.kind === "task" ? item.time === null : item.memberIds.length === 0) &&
  !endsBeforeStart(item);

export const createCalendarItemSchema =
  calendarItemFields.refine(isConsistentItem);
export type CreateCalendarItemInput = z.input<typeof createCalendarItemSchema>;

export const updateCalendarItemSchema = calendarItemFields
  .extend({ id: z.number(), today: calendarDateSchema })
  .refine(isConsistentItem);

export const calendarItemRefSchema = z.object({
  groupId: z.number(),
  id: z.number(),
});

const MAX_RANGE_DAYS = 62;

export const calendarRangeSchema = z
  .object({
    groupId: z.number(),
    from: calendarDateSchema,
    to: calendarDateSchema,
  })
  .refine(
    ({ from, to }) =>
      toDayNumber(to) >= toDayNumber(from) &&
      toDayNumber(to) - toDayNumber(from) <= MAX_RANGE_DAYS,
  );

export const calendarItemDetailSchema = z.object({
  groupId: z.number(),
  id: z.number(),
  today: calendarDateSchema,
});

export const setOccurrenceDoneSchema = z.object({
  groupId: z.number(),
  itemId: z.number(),
  date: calendarDateSchema,
  done: z.boolean(),
  /** Earlier open days of the same chore, skipped in the same write */
  skip: z.array(calendarDateSchema).max(MAX_RANGE_DAYS).optional(),
});

export const setOccurrenceSkippedSchema = z.object({
  groupId: z.number(),
  itemId: z.number(),
  date: calendarDateSchema,
  skipped: z.boolean(),
});

const DAY_MS = 86_400_000;

const pad = (part: number) => String(part).padStart(2, "0");

export const toDayNumber = (date: string) =>
  Date.parse(`${date}T00:00:00Z`) / DAY_MS;

export const fromDayNumber = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) =>
  fromDayNumber(toDayNumber(date) + days);

// 1970-01-01 was a Thursday
const weekdayIndex = (day: number) => (((day + 3) % 7) + 7) % 7;

export const weekdayOf = (date: string): Weekday =>
  weekdays[weekdayIndex(toDayNumber(date))] ?? "mo";

/** The device's calendar day, which is what "today" means to the person holding it. */
export const localDate = (now = new Date()) =>
  [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("-");

export interface ExpandableItem {
  id: number;
  startsOn: string;
  endsOn: string | null;
  recurrence: Recurrence | null;
  /** Active members in rotation order */
  memberIds: number[];
}

/** Months since year 0, so month arithmetic is plain subtraction */
const monthIndexOf = (day: number) => {
  const date = new Date(day * DAY_MS);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

const dayNumberOf = (monthIndex: number, dayOfMonth: number) =>
  Date.UTC(Math.floor(monthIndex / 12), monthIndex % 12, dayOfMonth) / DAY_MS;

const monthLength = (monthIndex: number) =>
  dayNumberOf(monthIndex + 1, 0) - dayNumberOf(monthIndex, 0);

function dayIn(monthIndex: number, on: MonthDay) {
  const length = monthLength(monthIndex);
  if ("day" in on) return dayNumberOf(monthIndex, Math.min(on.day, length));
  const target = weekdays.indexOf(on.weekday);
  if (on.week === "last") {
    const last = dayNumberOf(monthIndex, length);
    return last - ((weekdayIndex(last) - target + 7) % 7);
  }
  const first = dayNumberOf(monthIndex, 1);
  return (
    first +
    ((target - weekdayIndex(first) + 7) % 7) +
    7 * weeksOfMonth.indexOf(on.week)
  );
}

/** Every `period` months from `firstMonth`, whose own date may fall before the start and not count. */
function monthlyOrdinal(
  day: number,
  start: number,
  rule: { period: number; firstMonth: number; on: MonthDay },
) {
  const offset = monthIndexOf(day) - rule.firstMonth;
  if (offset < 0 || offset % rule.period !== 0) return null;
  if (day !== dayIn(monthIndexOf(day), rule.on)) return null;
  const missedFirst = dayIn(rule.firstMonth, rule.on) < start ? 1 : 0;
  return offset / rule.period - missedFirst;
}

/** How many times the rule fired before `day`, or null when it doesn't fire on `day`. */
function ordinalOn(item: ExpandableItem, day: number): number | null {
  const start = toDayNumber(item.startsOn);
  if (day < start || (item.endsOn && day > toDayNumber(item.endsOn)))
    return null;
  const { recurrence } = item;
  if (!recurrence) return day === start ? 0 : null;
  if (recurrence.type === "daily") {
    const offset = day - start;
    return offset % recurrence.interval === 0
      ? offset / recurrence.interval
      : null;
  }
  const startMonth = monthIndexOf(start);
  if (recurrence.type === "monthly")
    return monthlyOrdinal(day, start, {
      period: recurrence.interval,
      firstMonth: startMonth,
      on: recurrence.on,
    });
  if (recurrence.type === "yearly")
    return monthlyOrdinal(day, start, {
      period: 12 * recurrence.interval,
      firstMonth: startMonth - (startMonth % 12) + recurrence.on.month - 1,
      on: { day: recurrence.on.day },
    });
  const dayIndexes = recurrence.days.map((d) => weekdays.indexOf(d));
  const weekday = weekdayIndex(day);
  const startWeekday = weekdayIndex(start);
  const week = (day - weekday - (start - startWeekday)) / 7;
  if (!dayIndexes.includes(weekday) || week % recurrence.interval !== 0)
    return null;
  const earlierThisWeek = dayIndexes.filter((i) => i < weekday).length;
  if (week === 0)
    return dayIndexes.filter((i) => i >= startWeekday && i < weekday).length;
  const firstWeek = dayIndexes.filter((i) => i >= startWeekday).length;
  const fullWeeks = week / recurrence.interval - 1;
  return firstWeek + fullWeeks * dayIndexes.length + earlierThisWeek;
}

export const isScheduledOn = (item: ExpandableItem, date: string) =>
  ordinalOn(item, toDayNumber(date)) !== null;

const turnOn = (item: ExpandableItem, date: string) => {
  const ordinal = ordinalOn(item, toDayNumber(date));
  return ordinal === null
    ? null
    : (item.memberIds[ordinal % item.memberIds.length] ?? null);
};

export interface OccurrenceOverride {
  date: string;
  skipped: boolean;
  completedByGroupMemberId: number | null;
  /** Sent with each completion, so someone who has since left the group keeps their name */
  completedBy: DebtPerson | null;
  completedAt: Date | null;
}

export interface Occurrence {
  itemId: number;
  date: string;
  turnGroupMemberId: number | null;
  completedByGroupMemberId: number | null;
  completedBy: DebtPerson | null;
  completedAt: Date | null;
}

const openOccurrence = (item: ExpandableItem, date: string): Occurrence => ({
  itemId: item.id,
  date,
  turnGroupMemberId: turnOn(item, date),
  completedByGroupMemberId: null,
  completedBy: null,
  completedAt: null,
});

export function expandOccurrences(
  item: ExpandableItem,
  overrides: OccurrenceOverride[],
  from: string,
  to: string,
): Occurrence[] {
  const byDate = new Map(overrides.map((o) => [o.date, o]));
  const occurrences: Occurrence[] = [];
  for (
    let day = Math.max(toDayNumber(from), toDayNumber(item.startsOn));
    day <= toDayNumber(to);
    day++
  ) {
    const date = fromDayNumber(day);
    const override = byDate.get(date);
    if (!isScheduledOn(item, date) || override?.skipped) continue;
    occurrences.push({
      ...openOccurrence(item, date),
      completedByGroupMemberId: override?.completedByGroupMemberId ?? null,
      completedBy: override?.completedBy ?? null,
      completedAt: override?.completedAt ?? null,
    });
  }
  return occurrences;
}

/** Calendar dates carry no time zone, so they format as UTC to keep the day from shifting. */
export const formatCalendarDate = (
  date: string,
  locale: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    Date.parse(`${date}T00:00:00Z`),
  );

export const weekdayName = (
  day: Weekday,
  locale: Intl.LocalesArgument,
  width: "long" | "short",
) =>
  // 2024-01-01 was a Monday
  formatCalendarDate(addDays("2024-01-01", weekdays.indexOf(day)), locale, {
    weekday: width,
  });

/** Device-local midnight, which is how date pickers represent a day; localDate() turns it back. */
export const pickerDate = (date: string) => {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const defaultEventTime: EventTime = { start: "19:00", end: "20:00" };

const DAY_MINUTES = 24 * 60;
const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const timeOf = (minutes: number) => {
  const wrapped = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return [Math.floor(wrapped / 60), wrapped % 60].map(pad).join(":");
};

/** Moving the start keeps the event's length. */
export const withStart = (time: EventTime, start: string): EventTime => ({
  start,
  end: timeOf(minutesOf(time.end) - minutesOf(time.start) + minutesOf(start)),
});

export const describeEventTime = (time: EventTime | null, t: Translate) =>
  time ? `${time.start}–${time.end}` : t("calendar.allDay");

export function describeRecurrence(
  recurrence: Recurrence | null,
  t: Translate,
  locale: Intl.LocalesArgument,
): string {
  if (!recurrence) return t("calendar.repeat.once");
  const count = recurrence.interval;
  switch (recurrence.type) {
    case "daily":
      return t("calendar.repeat.daily", { count });
    case "weekly":
      return t("calendar.repeat.weekly", {
        count,
        days: recurrence.days
          .map((day) =>
            weekdayName(
              day,
              locale,
              recurrence.days.length === 1 ? "long" : "short",
            ),
          )
          .join(", "),
      });
    case "monthly":
      return t("calendar.repeat.monthly", {
        count,
        on: describeMonthDay(recurrence.on, t, locale),
      });
    case "yearly":
      return t("calendar.repeat.yearly", {
        count,
        // 2024 was a leap year, so Feb 29 formats too
        date: formatCalendarDate(
          `2024-${pad(recurrence.on.month)}-${pad(recurrence.on.day)}`,
          locale,
          { month: "long", day: "numeric" },
        ),
      });
  }
}

// Older apps could leave an end on an item they turned into a one-off
export const hasEnded = (
  item: Pick<ExpandableItem, "recurrence" | "endsOn">,
  today: string,
) => item.recurrence !== null && item.endsOn !== null && item.endsOn < today;

function describeEnd(
  item: Pick<ExpandableItem, "recurrence" | "endsOn">,
  today: string,
  t: Translate,
  locale: Intl.LocalesArgument,
) {
  if (!item.endsOn) return null;
  const date = formatCalendarDate(item.endsOn, locale, {
    day: "numeric",
    month: "short",
    year: item.endsOn.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric",
  });
  return t(
    hasEnded(item, today) ? "calendar.repeat.ended" : "calendar.repeat.until",
    {
      date,
    },
  );
}

export const describeSeries = (
  item: Pick<ExpandableItem, "recurrence" | "endsOn">,
  today: string,
  t: Translate,
  locale: Intl.LocalesArgument,
  startsOn?: string,
) =>
  [
    describeRecurrence(item.recurrence, t, locale),
    startsOn &&
      formatCalendarDate(startsOn, locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    item.recurrence && describeEnd(item, today, t, locale),
  ]
    .filter(Boolean)
    .join(" · ");

export const describeMonthDay = (
  on: MonthDay,
  t: Translate,
  locale: Intl.LocalesArgument,
) => {
  if ("week" in on)
    return t("calendar.monthDay.weekday", {
      week: t(`calendar.weekOfMonth.${on.week}`),
      weekday: weekdayName(on.weekday, locale, "long"),
    });
  return on.day === 31
    ? t("calendar.monthDay.lastDay")
    : t("calendar.monthDay.day", { day: on.day });
};

export interface CalendarItemView extends ExpandableItem {
  kind: CalendarItemKind;
  color: CalendarColor;
  title: string;
  time: EventTime | null;
}

export interface CalendarRange {
  items: CalendarItemView[];
  occurrences: Occurrence[];
}

export interface CalendarHistoryEntry {
  date: string;
  skipped: boolean;
  completedBy: DebtPerson | null;
  completedAt: Date | null;
}

export interface CalendarItemDetail {
  item: CalendarItemView;
  upcoming: Occurrence[];
  history: CalendarHistoryEntry[];
}

export const monthOf = (date: string) => date.slice(0, 7);

export const shiftMonth = (month: string, delta: number) => {
  const [year = 1970, monthNumber = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
    .toISOString()
    .slice(0, 7);
};

const GRID_DAYS = 42;

/** Six Monday-first weeks covering `month` ("2026-10"), so the grid never changes height. */
export function monthGrid(month: string) {
  const first = toDayNumber(`${month}-01`);
  const start = first - weekdayIndex(first);
  const days = Array.from({ length: GRID_DAYS }, (_, i) =>
    fromDayNumber(start + i),
  );
  return { days, from: days[0] ?? month, to: days.at(-1) ?? month };
}

/** Where the grid's arrows land: a week on when collapsed, else the next month's 1st, or today in this month. */
export function stepFrom(
  selected: string,
  today: string,
  delta: number,
  collapsed: boolean,
) {
  if (collapsed) return addDays(selected, 7 * delta);
  const month = shiftMonth(monthOf(selected), delta);
  return month === monthOf(today) ? today : `${month}-01`;
}

export interface CalendarEntry {
  item: CalendarItemView;
  occurrence: Occurrence;
}

export function daySummary(entries: CalendarEntry[], meId: number) {
  const tasks = entries.filter(({ item }) => item.kind === "task");
  return {
    total: tasks.length,
    done: tasks.filter(({ occurrence }) => occurrence.completedAt).length,
    onYou: tasks.filter(
      ({ occurrence }) =>
        !occurrence.completedAt && occurrence.turnGroupMemberId === meId,
    ).length,
  };
}

function rangeEntries(
  range: CalendarRange,
  keep: (entry: CalendarEntry) => boolean,
): CalendarEntry[] {
  const items = new Map(range.items.map((item) => [item.id, item]));
  return range.occurrences
    .flatMap((occurrence) => {
      const item = items.get(occurrence.itemId);
      return item ? [{ item, occurrence }] : [];
    })
    .filter(keep)
    .sort(
      (a, b) =>
        a.occurrence.date.localeCompare(b.occurrence.date) ||
        // All-day entries after the timed ones
        (a.item.time?.start ?? "99").localeCompare(
          b.item.time?.start ?? "99",
        ) ||
        a.item.title.localeCompare(b.item.title),
    );
}

export const entriesOn = (range: CalendarRange, date: string) =>
  rangeEntries(range, ({ occurrence }) => occurrence.date === date);

export interface AgendaDay {
  date: string;
  entries: CalendarEntry[];
  summary: ReturnType<typeof daySummary>;
}

/** Every day of `month`, empty ones included. "Mine" keeps events and the tasks that are the member's turn. */
export function agendaDays(
  range: CalendarRange,
  month: string,
  meId: number,
  mine: boolean,
): AgendaDay[] {
  const inMonth = rangeEntries(
    range,
    ({ occurrence }) => monthOf(occurrence.date) === month,
  );
  const first = toDayNumber(`${month}-01`);
  const length = toDayNumber(`${shiftMonth(month, 1)}-01`) - first;
  return Array.from({ length }, (_, i) => {
    const date = fromDayNumber(first + i);
    const entries = inMonth.filter(
      ({ occurrence }) => occurrence.date === date,
    );
    return {
      date,
      summary: daySummary(entries, meId),
      entries: mine
        ? entries.filter(
            ({ item, occurrence }) =>
              item.kind === "event" || occurrence.turnGroupMemberId === meId,
          )
        : entries,
    };
  });
}

export interface MonthSpan {
  first: string;
  last: string;
}

/** Grows the loaded months so `date` has a whole month on either side to scroll into. */
export const spanAround = (date: string, span?: MonthSpan): MonthSpan => {
  const before = shiftMonth(monthOf(date), -1);
  const after = shiftMonth(monthOf(date), 1);
  return {
    first: span && span.first < before ? span.first : before,
    last: span && span.last > after ? span.last : after,
  };
};

export function monthsOf({ first, last }: MonthSpan) {
  const months = [first];
  while ((months.at(-1) ?? last) < last)
    months.push(shiftMonth(months.at(-1) ?? last, 1));
  return months;
}

export const HOME_LOOKAHEAD_DAYS = 6;
export const HOME_LOOKBACK_DAYS = MAX_RANGE_DAYS - HOME_LOOKAHEAD_DAYS;

export interface DueChore extends CalendarEntry {
  missed: string[];
}

function notOverYet(
  time: EventTime | null,
  date: string,
  today: string,
  now: string,
) {
  const overnight = time !== null && time.end <= time.start;
  if (date > today) return true;
  if (date === today) return overnight || (time?.end ?? "24:00") > now;
  return overnight && date === addDays(today, -1) && time.end > now;
}

/** `now` is the wall-clock time ("HH:MM"), to pass over events that ended today */
export function homeAgenda(
  range: CalendarRange,
  today: string,
  now: string,
  meId: number,
) {
  const entries = rangeEntries(range, () => true);
  const myOpenTasks = entries.filter(
    ({ item, occurrence }) =>
      item.kind === "task" &&
      !occurrence.completedAt &&
      occurrence.turnGroupMemberId === meId,
  );
  // A chore left for days shows once, on its latest open day
  const due: DueChore[] = [];
  for (const entry of myOpenTasks) {
    if (entry.occurrence.date > today) continue;
    const seen = due.find(({ item }) => item.id === entry.item.id);
    if (seen) {
      seen.missed.push(seen.occurrence.date);
      seen.occurrence = entry.occurrence;
    } else {
      due.push({ ...entry, missed: [] });
    }
  }

  return {
    due,
    nextTurn: myOpenTasks.find(({ occurrence }) => occurrence.date > today),
    nextEvent: entries.find(
      ({ item, occurrence }) =>
        item.kind === "event" &&
        notOverYet(item.time, occurrence.date, today, now),
    ),
  };
}

type Schedule = Pick<ExpandableItem, "startsOn" | "recurrence">;
type Series = Schedule & Pick<ExpandableItem, "endsOn">;

// Spelled out rather than JSON, since jsonb hands keys back in its own order
function ruleKey(recurrence: Recurrence | null) {
  if (!recurrence) return "";
  const { type, interval } = recurrence;
  switch (type) {
    case "daily":
      return `${type} ${interval}`;
    case "weekly":
      return `${type} ${interval} ${recurrence.days.join()}`;
    case "monthly": {
      const { on } = recurrence;
      return `${type} ${interval} ${"week" in on ? `${on.week} ${on.weekday}` : on.day}`;
    }
    case "yearly":
      return `${type} ${interval} ${recurrence.on.month}/${recurrence.on.day}`;
  }
}

const sameRecurrence = (a: Recurrence | null, b: Recurrence | null) =>
  ruleKey(a) === ruleKey(b);

export const sameSchedule = (a: Schedule, b: Schedule) =>
  a.startsOn === b.startsOn && sameRecurrence(a.recurrence, b.recurrence);

const isRunning = (item: Series, today: string) =>
  item.recurrence !== null && item.startsOn < today && !hasEnded(item, today);

export const editedEndsOn = (
  previous: Series,
  next: Pick<Series, "recurrence"> & { endsOn?: string | null },
) => {
  if (!next.recurrence) return null;
  return next.endsOn === undefined ? previous.endsOn : next.endsOn;
};

/** Days that are over keep their ticks and schedule. */
export const rewritesPast = (previous: Series, next: Series, today: string) =>
  hasEnded(previous, today)
    ? !sameSchedule(previous, next) || next.endsOn !== previous.endsOn
    : next.endsOn !== previous.endsOn && hasEnded(next, today);

export const splitEndsOn = (previous: Series, startsOn: string) => {
  const dayBefore = addDays(startsOn, -1);
  return previous.endsOn !== null && previous.endsOn < dayBefore
    ? previous.endsOn
    : dayBefore;
};

/** A new schedule for a running series starts a new item, so the old one keeps its history. */
export const splitsSeries = (previous: Series, next: Schedule, today: string) =>
  isRunning(previous, today) &&
  !sameSchedule(previous, next) &&
  next.startsOn > previous.startsOn;

export function continuedRotation(
  previous: ExpandableItem,
  next: Pick<ExpandableItem, "startsOn" | "memberIds">,
) {
  const start = toDayNumber(next.startsOn);
  for (let day = start; day <= start + LONGEST_GAP_DAYS; day++) {
    // The old rule may already end before its next turn would come round
    const turn = turnOn({ ...previous, endsOn: null }, fromDayNumber(day));
    if (turn === null) continue;
    const first = next.memberIds.indexOf(turn);
    return first <= 0
      ? next.memberIds
      : [...next.memberIds.slice(first), ...next.memberIds.slice(0, first)];
  }
  return next.memberIds;
}

interface RangeWindow {
  from: string;
  to: string;
}

const byDate = (a: Occurrence, b: Occurrence) => a.date.localeCompare(b.date);

export const withDone = (
  range: CalendarRange,
  change: {
    itemId: number;
    date: string;
    done: boolean;
    byGroupMemberId: number;
    by: DebtPerson;
  },
): CalendarRange => ({
  ...range,
  occurrences: range.occurrences.map((occurrence) =>
    occurrence.itemId === change.itemId && occurrence.date === change.date
      ? {
          ...occurrence,
          completedByGroupMemberId: change.done ? change.byGroupMemberId : null,
          completedBy: change.done ? change.by : null,
          completedAt: change.done ? new Date() : null,
        }
      : occurrence,
  ),
});

/** Un-skipping brings the occurrence back, which the cache no longer holds. */
export function withSkipped(
  range: CalendarRange,
  change: { itemId: number; date: string; skipped: boolean },
  { from, to }: RangeWindow,
): CalendarRange {
  const occurrences = range.occurrences.filter(
    (occurrence) =>
      occurrence.itemId !== change.itemId || occurrence.date !== change.date,
  );
  const item = range.items.find((cached) => cached.id === change.itemId);
  if (
    change.skipped ||
    !item ||
    !isScheduledOn(item, change.date) ||
    change.date < from ||
    change.date > to
  )
    return { ...range, occurrences };
  return {
    ...range,
    occurrences: [...occurrences, openOccurrence(item, change.date)].sort(
      byDate,
    ),
  };
}

export const withoutItem = (
  range: CalendarRange,
  itemId: number,
): CalendarRange => ({
  items: range.items.filter((item) => item.id !== itemId),
  occurrences: range.occurrences.filter(
    (occurrence) => occurrence.itemId !== itemId,
  ),
});

/** Reads an item's ticks and skips back out of a cached range; a scheduled day that isn't shown was skipped. */
function cachedOverrides(
  range: CalendarRange,
  itemId: number,
  { from, to }: RangeWindow,
): OccurrenceOverride[] {
  const item = range.items.find((cached) => cached.id === itemId);
  if (!item) return [];
  const shown = new Map(
    range.occurrences
      .filter((occurrence) => occurrence.itemId === itemId)
      .map((occurrence) => [occurrence.date, occurrence]),
  );
  return expandOccurrences(item, [], from, to).flatMap(({ date }) => {
    const occurrence = shown.get(date);
    if (occurrence && !occurrence.completedAt) return [];
    return [
      {
        date,
        skipped: !occurrence,
        completedByGroupMemberId: occurrence?.completedByGroupMemberId ?? null,
        completedBy: occurrence?.completedBy ?? null,
        completedAt: occurrence?.completedAt ?? null,
      },
    ];
  });
}

/** Optimistic create or edit; like the server, ticks and skips stay on days the new schedule still has. */
export function withSavedItem(
  range: CalendarRange,
  item: CalendarItemView,
  window: RangeWindow,
  carried = cachedOverrides(range, item.id, window),
): CalendarRange {
  const rest = withoutItem(range, item.id);
  return {
    items: [...rest.items, item],
    occurrences: [
      ...rest.occurrences,
      ...expandOccurrences(item, carried, window.from, window.to),
    ].sort(byDate),
  };
}

/** Optimistic split: the old series ends by the day before the new one takes over. */
export function withSplitSeries(
  range: CalendarRange,
  previous: ExpandableItem,
  next: CalendarItemView,
  window: RangeWindow,
): CalendarRange {
  const endsOn = splitEndsOn(previous, next.startsOn);
  const carried = cachedOverrides(range, previous.id, window).filter(
    (override) => override.date > endsOn,
  );
  const ended: CalendarRange = {
    items: range.items.map((item) =>
      item.id === previous.id ? { ...item, endsOn } : item,
    ),
    occurrences: range.occurrences.filter(
      (occurrence) =>
        occurrence.itemId !== previous.id || occurrence.date <= endsOn,
    ),
  };
  return withSavedItem(ended, next, window, carried);
}

export const repeatUnits = [
  "never",
  "days",
  "weeks",
  "months",
  "years",
] as const;
export type RepeatUnit = (typeof repeatUnits)[number];

/** What the repeat section of the create and edit forms holds; each null follows the start date until someone picks. */
export interface RepeatForm {
  unit: RepeatUnit;
  every: number;
  days: Weekday[] | null;
  monthDay: MonthDay | null;
  yearDay: YearDay | null;
}

const followingStart = { every: 1, days: null, monthDay: null, yearDay: null };

export const newRepeatFormFor = (kind: CalendarItemKind): RepeatForm => ({
  ...followingStart,
  unit: kind === "event" ? "never" : "weeks",
});

export function repeatFormOf(recurrence: Recurrence | null): RepeatForm {
  if (!recurrence) return { ...followingStart, unit: "never" };
  const form = { ...followingStart, every: recurrence.interval };
  switch (recurrence.type) {
    case "daily":
      return { ...form, unit: "days" };
    case "weekly":
      return { ...form, unit: "weeks", days: recurrence.days };
    case "monthly":
      return { ...form, unit: "months", monthDay: recurrence.on };
    case "yearly":
      return { ...form, unit: "years", yearDay: recurrence.on };
  }
}

export const maxEvery = ({ unit }: RepeatForm) =>
  unit === "never" ? 1 : MAX_INTERVAL[unit];

/** A date's day of the month, and its weekday counted from the end when it falls in the month's last seven days. */
function monthDaysOf(date: string): [MonthDay, MonthDay] {
  const day = Number(date.slice(8, 10));
  const week =
    day + 7 > monthLength(monthIndexOf(toDayNumber(date)))
      ? "last"
      : (weeksOfMonth[Math.floor((day - 1) / 7)] ?? "last");
  return [{ day }, { week, weekday: weekdayOf(date) }];
}

const yearDayOf = (date: string): YearDay => ({
  month: Number(date.slice(5, 7)),
  day: Number(date.slice(8, 10)),
});

/** The monthly toggle's two options; a picked one keeps its day while the other follows the start date. */
export function monthDayChoices(form: RepeatForm, startsOn: string) {
  const options = monthDaysOf(startsOn);
  const picked = form.monthDay ?? options[0];
  return options.map((on) => {
    const selected = "week" in on === "week" in picked;
    return { on: selected ? picked : on, selected };
  });
}

/** Picking a start date moves a monthly or yearly day along with it. */
export const withPickedStart = (
  form: RepeatForm,
  startsOn: string,
): RepeatForm => ({
  ...form,
  monthDay:
    form.monthDay && monthDaysOf(startsOn)["week" in form.monthDay ? 1 : 0],
  yearDay: null,
});

export const earliestEndsOn = (startsOn: string, today: string) =>
  startsOn > today ? startsOn : today;

export const defaultEndsOn = (startsOn: string, today: string) =>
  addDays(earliestEndsOn(startsOn, today), 28);

export function formEndsOn(
  item: Series | undefined,
  recurrence: Recurrence | null,
  pickedEnd: string | null,
  startsOn: string,
  today: string,
) {
  if (item && hasEnded(item, today)) return item.endsOn;
  if (!recurrence || !pickedEnd) return null;
  const earliest = earliestEndsOn(startsOn, today);
  return pickedEnd < earliest ? earliest : pickedEnd;
}

/** The edit form's start: a changed repeat of a running series starts today unless a date was picked, so the old part keeps its history. */
export function editedStartsOn(
  item: Series,
  repeat: RepeatForm,
  pickedStart: string | null,
  today: string,
) {
  if (pickedStart) return pickedStart;
  const ruleChanged = !sameRecurrence(
    item.recurrence,
    recurrenceOf(repeat, item.startsOn),
  );
  return ruleChanged && isRunning(item, today) ? today : item.startsOn;
}

export function recurrenceOf(
  form: RepeatForm,
  startsOn: string,
): Recurrence | null {
  const interval = Math.min(form.every, maxEvery(form));
  switch (form.unit) {
    case "never":
      return null;
    case "days":
      return { type: "daily", interval };
    case "weeks":
      return {
        type: "weekly",
        interval,
        days: form.days ?? [weekdayOf(startsOn)],
      };
    case "months":
      return {
        type: "monthly",
        interval,
        on: form.monthDay ?? monthDaysOf(startsOn)[0],
      };
    case "years":
      return {
        type: "yearly",
        interval,
        on: form.yearDay ?? yearDayOf(startsOn),
      };
  }
}
