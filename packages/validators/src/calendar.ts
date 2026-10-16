import type { Translate } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import type { DebtPerson } from "./expenses/formatting";

export const weekdays = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
export const weekdaySchema = z.enum(weekdays);
export type Weekday = z.infer<typeof weekdaySchema>;

export const MAX_INTERVAL = { days: 365, weeks: 52 } as const;
/** Far enough ahead to always reach a rule's next occurrence */
export const LONGEST_GAP_DAYS = 7 * (MAX_INTERVAL.weeks + 1);

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
]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const calendarDateSchema = z.iso.date();
export const calendarTimeSchema = z.iso.time({ precision: -1 });
export const calendarItemKindSchema = z.enum(["task", "event"]);
export type CalendarItemKind = z.infer<typeof calendarItemKindSchema>;

export const calendarItemTitleSchema = z
  .string()
  .trim()
  .min(1, { message: msg("calendar.validation.titleRequired") })
  .max(256, { message: msg("calendar.validation.titleTooLong") });

const calendarItemFields = z.object({
  groupId: z.number(),
  kind: calendarItemKindSchema,
  title: calendarItemTitleSchema,
  startsOn: calendarDateSchema,
  time: calendarTimeSchema.nullable(),
  recurrence: recurrenceSchema.nullable(),
  memberIds: z.array(z.number()).max(50),
});

const isConsistentItem = (item: z.infer<typeof calendarItemFields>) =>
  item.kind === "task" ? item.time === null : item.memberIds.length === 0;

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
});

export const setOccurrenceSkippedSchema = z.object({
  groupId: z.number(),
  itemId: z.number(),
  date: calendarDateSchema,
  skipped: z.boolean(),
});

const DAY_MS = 86_400_000;

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
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

export interface ExpandableItem {
  id: number;
  startsOn: string;
  /** Set when an edit split the series and a newer rule took over */
  endsOn: string | null;
  recurrence: Recurrence | null;
  /** Active members in rotation order */
  memberIds: number[];
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

export function describeRecurrence(
  recurrence: Recurrence | null,
  t: Translate,
  locale: Intl.LocalesArgument,
): string {
  if (!recurrence) return t("calendar.repeat.once");
  if (recurrence.type === "daily")
    return t("calendar.repeat.daily", { count: recurrence.interval });
  return t("calendar.repeat.weekly", {
    count: recurrence.interval,
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
}

export interface CalendarItemView extends ExpandableItem {
  kind: CalendarItemKind;
  title: string;
  time: string | null;
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

/** "Mine" keeps events and the tasks that are the member's turn. */
export function entriesOn(
  range: CalendarRange,
  date: string,
  mineMemberId?: number,
): CalendarEntry[] {
  const items = new Map(range.items.map((item) => [item.id, item]));
  return range.occurrences
    .flatMap((occurrence) => {
      const item = items.get(occurrence.itemId);
      return item && occurrence.date === date ? [{ item, occurrence }] : [];
    })
    .filter(
      ({ item, occurrence }) =>
        mineMemberId === undefined ||
        item.kind === "event" ||
        occurrence.turnGroupMemberId === mineMemberId,
    )
    .sort(
      (a, b) =>
        (a.item.time ?? "99").localeCompare(b.item.time ?? "99") ||
        a.item.title.localeCompare(b.item.title),
    );
}

type Schedule = Pick<ExpandableItem, "startsOn" | "recurrence">;
type Series = Schedule & Pick<ExpandableItem, "endsOn">;

const sameRecurrence = (a: Recurrence | null, b: Recurrence | null) =>
  a?.type === b?.type &&
  a?.interval === b?.interval &&
  (a?.type === "weekly" ? a.days.join() : "") ===
    (b?.type === "weekly" ? b.days.join() : "");

export const sameSchedule = (a: Schedule, b: Schedule) =>
  a.startsOn === b.startsOn && sameRecurrence(a.recurrence, b.recurrence);

const isRunning = (item: Series, today: string) =>
  item.recurrence !== null &&
  item.startsOn < today &&
  (item.endsOn === null || item.endsOn >= today);

export const startsAfterEnd = (previous: Series, next: Schedule) =>
  previous.endsOn !== null && next.startsOn > previous.endsOn;

/** A new schedule for a running series starts a new item, so the old one keeps its history. */
export const splitsSeries = (previous: Series, next: Schedule, today: string) =>
  isRunning(previous, today) &&
  !sameSchedule(previous, next) &&
  next.startsOn > previous.startsOn;

function continuedRotation(
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

/** The new piece of a split ends where the old one did, so a later change still takes over, and carries on the rotation. */
export const splitOff = (
  previous: ExpandableItem,
  next: Pick<ExpandableItem, "startsOn" | "recurrence" | "memberIds">,
) => ({
  endsOn: next.recurrence ? previous.endsOn : null,
  memberIds: continuedRotation(previous, next),
});

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

/** Optimistic split: the old series ends the day before the new one takes over. */
export function withSplitSeries(
  range: CalendarRange,
  previousId: number,
  next: CalendarItemView,
  window: RangeWindow,
): CalendarRange {
  const endsOn = addDays(next.startsOn, -1);
  const carried = cachedOverrides(range, previousId, window).filter(
    (override) => override.date > endsOn,
  );
  const ended: CalendarRange = {
    items: range.items.map((item) =>
      item.id === previousId ? { ...item, endsOn } : item,
    ),
    occurrences: range.occurrences.filter(
      (occurrence) =>
        occurrence.itemId !== previousId || occurrence.date <= endsOn,
    ),
  };
  return withSavedItem(ended, next, window, carried);
}

export const repeatChoices = [
  "never",
  "daily",
  "weekly",
  "biweekly",
  "custom",
] as const;
export type RepeatChoice = (typeof repeatChoices)[number];

/** What the repeat chips in the create and edit forms hold. */
export interface RepeatForm {
  choice: RepeatChoice;
  every: number;
  unit: "days" | "weeks";
  /** null follows the start date's weekday until someone picks days */
  days: Weekday[] | null;
}

const DEFAULT_CUSTOM_INTERVAL = 3;

export const newRepeatForm: RepeatForm = {
  choice: "weekly",
  every: DEFAULT_CUSTOM_INTERVAL,
  unit: "days",
  days: null,
};

export function repeatFormOf(recurrence: Recurrence | null): RepeatForm {
  const form: RepeatForm = {
    choice: "custom",
    every: recurrence?.interval ?? DEFAULT_CUSTOM_INTERVAL,
    unit: recurrence?.type === "weekly" ? "weeks" : "days",
    days: recurrence?.type === "weekly" ? recurrence.days : null,
  };
  if (!recurrence) return { ...form, choice: "never" };
  if (recurrence.interval === 1)
    return {
      ...form,
      choice: recurrence.type === "daily" ? "daily" : "weekly",
    };
  if (recurrence.type === "weekly" && recurrence.interval === 2)
    return { ...form, choice: "biweekly" };
  return form;
}

export const repeatShowsDays = ({ choice, unit }: RepeatForm) =>
  choice === "weekly" ||
  choice === "biweekly" ||
  (choice === "custom" && unit === "weeks");

export const maxEvery = (form: RepeatForm) =>
  form.choice === "custom" && form.unit === "weeks"
    ? MAX_INTERVAL.weeks
    : MAX_INTERVAL.days;

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
  const days = form.days ?? [weekdayOf(startsOn)];
  const every = Math.min(form.every, maxEvery(form));
  switch (form.choice) {
    case "never":
      return null;
    case "daily":
      return { type: "daily", interval: 1 };
    case "weekly":
      return { type: "weekly", interval: 1, days };
    case "biweekly":
      return { type: "weekly", interval: 2, days };
    case "custom":
      return form.unit === "days"
        ? { type: "daily", interval: every }
        : { type: "weekly", interval: every, days };
  }
}
