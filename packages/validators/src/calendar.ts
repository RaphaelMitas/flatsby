import type { Translate } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

export const weekdays = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
export const weekdaySchema = z.enum(weekdays);
export type Weekday = z.infer<typeof weekdaySchema>;

export const MAX_INTERVAL = { days: 365, weeks: 52 } as const;
const daysIntervalSchema = z.int().min(1).max(MAX_INTERVAL.days);

// Stored as jsonb; a new kind of repeat is a new member here, not a migration
export const recurrenceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily"), interval: daysIntervalSchema }),
  z.object({
    type: z.literal("weekly"),
    interval: z.int().min(1).max(MAX_INTERVAL.weeks),
    days: z
      .array(weekdaySchema)
      .min(1)
      .transform((days) => weekdays.filter((day) => days.includes(day))),
  }),
  // Counts from the day it was last done instead of a fixed slot
  z.object({ type: z.literal("afterDone"), interval: daysIntervalSchema }),
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
  item.kind === "task"
    ? item.time === null
    : item.recurrence?.type !== "afterDone" && item.memberIds.length === 0;

export const createCalendarItemSchema =
  calendarItemFields.refine(isConsistentItem);
export type CreateCalendarItemInput = z.input<typeof createCalendarItemSchema>;

export const updateCalendarItemSchema = calendarItemFields
  .extend({ id: z.number() })
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
    today: calendarDateSchema,
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
  originalDate: calendarDateSchema,
  done: z.boolean(),
  today: calendarDateSchema,
});

export const rescheduleOccurrenceSchema = z.object({
  groupId: z.number(),
  itemId: z.number(),
  originalDate: calendarDateSchema,
  movedTo: calendarDateSchema.nullable(),
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

/** For useSyncExternalStore with localDate, so "today" turns over at midnight on an open screen. */
export const watchLocalDate = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};

/** The device's calendar day, which is what "today" means to the person holding it. */
export const localDate = (now = new Date()) =>
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

/** How many times a fixed schedule fired before `day`, or null when it doesn't fire on `day`. */
function scheduledOrdinal(
  startsOn: string,
  recurrence: Recurrence | null,
  day: number,
): number | null {
  const start = toDayNumber(startsOn);
  if (day < start) return null;
  if (!recurrence) return day === start ? 0 : null;
  switch (recurrence.type) {
    case "daily": {
      const offset = day - start;
      return offset % recurrence.interval === 0
        ? offset / recurrence.interval
        : null;
    }
    case "weekly": {
      const dayIndexes = recurrence.days.map((d) => weekdays.indexOf(d));
      const weekday = weekdayIndex(day);
      const startWeekday = weekdayIndex(start);
      const week = (day - weekday - (start - startWeekday)) / 7;
      if (!dayIndexes.includes(weekday) || week % recurrence.interval !== 0)
        return null;
      const earlierThisWeek = dayIndexes.filter((i) => i < weekday).length;
      if (week === 0)
        return dayIndexes.filter((i) => i >= startWeekday && i < weekday)
          .length;
      const firstWeek = dayIndexes.filter((i) => i >= startWeekday).length;
      const fullWeeks = week / recurrence.interval - 1;
      return firstWeek + fullWeeks * dayIndexes.length + earlierThisWeek;
    }
    case "afterDone":
      return null;
  }
}

export interface ExpandableItem {
  id: number;
  startsOn: string;
  recurrence: Recurrence | null;
  /** Active members in rotation order */
  memberIds: number[];
}

export interface OccurrenceOverride {
  originalDate: string;
  movedTo: string | null;
  skipped: boolean;
  completedByGroupMemberId: number | null;
  completedAt: Date | null;
}

export interface Occurrence {
  itemId: number;
  /** Identifies the occurrence even after it moved */
  originalDate: string;
  date: string;
  turnGroupMemberId: number | null;
  completedByGroupMemberId: number | null;
  completedAt: Date | null;
  /** A forecast of an afterDone chore past its next due date, which can't be done yet */
  projected: boolean;
}

const turnFor = (memberIds: number[], ordinal: number | null) =>
  ordinal === null ? null : (memberIds[ordinal % memberIds.length] ?? null);

const completionsInOrder = (overrides: OccurrenceOverride[]) =>
  overrides
    .filter((o) => o.completedAt)
    .sort((a, b) => a.originalDate.localeCompare(b.originalDate));

/** Whose turn an occurrence was; afterDone items need every completion in `overrides`. */
export function turnOn(
  item: ExpandableItem,
  overrides: OccurrenceOverride[],
  originalDate: string,
): number | null {
  if (item.recurrence?.type !== "afterDone")
    return turnFor(
      item.memberIds,
      scheduledOrdinal(
        item.startsOn,
        item.recurrence,
        toDayNumber(originalDate),
      ),
    );
  const ordinal = completionsInOrder(overrides).findIndex(
    (o) => o.originalDate === originalDate,
  );
  return turnFor(item.memberIds, ordinal === -1 ? null : ordinal);
}

/** Whether a fixed schedule has an occurrence that originally fell on `date`. */
export const isScheduledOn = (item: ExpandableItem, date: string) =>
  scheduledOrdinal(item.startsOn, item.recurrence, toDayNumber(date)) !== null;

/** Whether ticking the occurrence that originally fell on `date` is allowed; afterDone items need every completion in `overrides`. */
export function canComplete(
  item: ExpandableItem,
  overrides: OccurrenceOverride[],
  date: string,
  today: string,
) {
  if (item.recurrence?.type !== "afterDone") return isScheduledOn(item, date);
  // The server records it on today whatever was ticked, so only an existing completion today or later blocks it
  return overrides.every(
    (override) => !override.completedAt || override.originalDate < today,
  );
}

/** Overrides must hold every row whose originalDate or movedTo is in range, and for afterDone items every completion. */
export function expandOccurrences(
  item: ExpandableItem,
  overrides: OccurrenceOverride[],
  from: string,
  to: string,
  today: string,
): Occurrence[] {
  const occurrence = (
    originalDate: string,
    date: string,
    ordinal: number | null,
    override?: OccurrenceOverride,
    projected = false,
  ): Occurrence => ({
    itemId: item.id,
    originalDate,
    date,
    turnGroupMemberId: turnFor(item.memberIds, ordinal),
    completedByGroupMemberId: override?.completedByGroupMemberId ?? null,
    completedAt: override?.completedAt ?? null,
    projected,
  });
  const first = toDayNumber(from);
  const last = toDayNumber(to);
  const occurrences: Occurrence[] = [];

  if (item.recurrence?.type === "afterDone") {
    const { interval } = item.recurrence;
    const done = completionsInOrder(overrides);
    done.forEach((o, ordinal) => {
      if (o.originalDate >= from && o.originalDate <= to)
        occurrences.push(
          occurrence(o.originalDate, o.originalDate, ordinal, o),
        );
    });
    const lastDone = done.at(-1);
    const due = Math.max(
      lastDone ? toDayNumber(lastDone.originalDate) + interval : 0,
      toDayNumber(item.startsOn),
    );
    const nextDue = Math.max(due, toDayNumber(today));
    // Done today already (or later, by someone whose day is ahead), so doing it again changes nothing
    const doneToday = lastDone !== undefined && lastDone.originalDate >= today;
    let day = nextDue;
    let ordinal = done.length;
    if (day < first) {
      const skip = Math.ceil((first - day) / interval);
      day += skip * interval;
      ordinal += skip;
    }
    for (; day <= last; day += interval, ordinal++) {
      const date = fromDayNumber(day);
      occurrences.push(
        occurrence(
          date,
          date,
          ordinal,
          undefined,
          doneToday || day !== nextDue,
        ),
      );
    }
    return occurrences;
  }

  const overridden = new Set(overrides.map((o) => o.originalDate));
  for (
    let day = Math.max(first, toDayNumber(item.startsOn));
    day <= last;
    day++
  ) {
    const ordinal = scheduledOrdinal(item.startsOn, item.recurrence, day);
    const date = fromDayNumber(day);
    if (ordinal !== null && !overridden.has(date))
      occurrences.push(occurrence(date, date, ordinal));
  }
  for (const o of overrides) {
    const date = o.movedTo ?? o.originalDate;
    if (o.skipped || date < from || date > to) continue;
    const ordinal = scheduledOrdinal(
      item.startsOn,
      item.recurrence,
      toDayNumber(o.originalDate),
    );
    // A move left over from an older schedule; completions stay as history
    if (ordinal === null && !o.completedAt) continue;
    occurrences.push(occurrence(o.originalDate, date, ordinal, o));
  }
  return occurrences.sort((a, b) => a.date.localeCompare(b.date));
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
  switch (recurrence.type) {
    case "daily":
      return t("calendar.repeat.daily", { count: recurrence.interval });
    case "weekly":
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
    case "afterDone":
      return t("calendar.repeat.afterDone", { count: recurrence.interval });
  }
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

export interface CalendarHistoryEntry extends Omit<Occurrence, "itemId"> {
  skipped: boolean;
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

const sameOccurrence =
  (itemId: number, originalDate: string) => (occurrence: Occurrence) =>
    occurrence.itemId === itemId && occurrence.originalDate === originalDate;

/** Only completions survive a schedule change; the server drops skips and moves of the old rule. */
const cachedCompletions = (range: CalendarRange, itemId: number) =>
  range.occurrences
    .filter(
      (occurrence) => occurrence.itemId === itemId && occurrence.completedAt,
    )
    .map((occurrence) => ({
      originalDate: occurrence.originalDate,
      movedTo:
        occurrence.date === occurrence.originalDate ? null : occurrence.date,
      skipped: false,
      completedByGroupMemberId: occurrence.completedByGroupMemberId,
      completedAt: occurrence.completedAt,
    }));

export function withDone(
  range: CalendarRange,
  change: {
    itemId: number;
    originalDate: string;
    done: boolean;
    byGroupMemberId: number;
  },
  { from, to, today }: { from: string; to: string; today: string },
): CalendarRange {
  const matches = sameOccurrence(change.itemId, change.originalDate);
  const item = range.items.find((cached) => cached.id === change.itemId);
  const completion = {
    completedByGroupMemberId: change.done ? change.byGroupMemberId : null,
    completedAt: change.done ? new Date() : null,
  };
  if (item?.recurrence?.type !== "afterDone" || !change.done)
    return {
      ...range,
      occurrences: range.occurrences.map((occurrence) =>
        matches(occurrence) ? { ...occurrence, ...completion } : occurrence,
      ),
    };

  // The server records an afterDone chore on today and counts the next ones from there
  const { interval } = item.recurrence;
  const ticked = range.occurrences.find(matches);
  const turnIndex = item.memberIds.indexOf(ticked?.turnGroupMemberId ?? -1);
  const turnAfter = (steps: number) =>
    turnIndex === -1
      ? null
      : (item.memberIds[(turnIndex + steps) % item.memberIds.length] ?? null);
  const forecasts: Occurrence[] = [];
  if (today >= from && today <= to)
    forecasts.push({
      itemId: item.id,
      originalDate: today,
      date: today,
      turnGroupMemberId: turnAfter(0),
      ...completion,
      projected: false,
    });
  for (
    let day = Math.max(
        toDayNumber(today) + interval,
        toDayNumber(item.startsOn),
      ),
      steps = 1;
    day <= toDayNumber(to);
    day += interval, steps++
  ) {
    const date = fromDayNumber(day);
    if (date >= from)
      forecasts.push({
        itemId: item.id,
        originalDate: date,
        date,
        turnGroupMemberId: turnAfter(steps),
        completedByGroupMemberId: null,
        completedAt: null,
        projected: true,
      });
  }
  return {
    ...range,
    occurrences: [
      ...range.occurrences.filter(
        (occurrence) =>
          occurrence.itemId !== item.id ||
          (occurrence.completedAt && occurrence.originalDate < today),
      ),
      ...forecasts,
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Also brings back an un-skipped occurrence, which the cache no longer holds. */
export function withRescheduled(
  range: CalendarRange,
  change: {
    itemId: number;
    originalDate: string;
    movedTo: string | null;
    skipped: boolean;
  },
  { from, to }: { from: string; to: string },
): CalendarRange {
  const matches = sameOccurrence(change.itemId, change.originalDate);
  const item = range.items.find((cached) => cached.id === change.itemId);
  const occurrences = range.occurrences.filter(
    (occurrence) => !matches(occurrence),
  );
  const date = change.movedTo ?? change.originalDate;
  if (
    change.skipped ||
    !item ||
    !isScheduledOn(item, change.originalDate) ||
    date < from ||
    date > to
  )
    return { ...range, occurrences };
  const existing = range.occurrences.find(matches) ?? {
    itemId: item.id,
    originalDate: change.originalDate,
    turnGroupMemberId: turnOn(item, [], change.originalDate),
    completedByGroupMemberId: null,
    completedAt: null,
    projected: false,
  };
  return {
    ...range,
    occurrences: [...occurrences, { ...existing, date }].sort((a, b) =>
      a.date.localeCompare(b.date),
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

type Schedule = Pick<ExpandableItem, "startsOn" | "recurrence">;

export const sameSchedule = (a: Schedule, b: Schedule) =>
  a.startsOn === b.startsOn &&
  a.recurrence?.type === b.recurrence?.type &&
  a.recurrence?.interval === b.recurrence?.interval &&
  (a.recurrence?.type === "weekly" ? a.recurrence.days.join() : "") ===
    (b.recurrence?.type === "weekly" ? b.recurrence.days.join() : "");

/** Optimistic create or edit; an edit that keeps the schedule leaves done, skipped and moved occurrences alone. */
export function withSavedItem(
  range: CalendarRange,
  item: CalendarItemView,
  { from, to, today }: { from: string; to: string; today: string },
): CalendarRange {
  const previous = range.items.find((cached) => cached.id === item.id);
  const rest = withoutItem(range, item.id);
  if (previous && sameSchedule(previous, item)) {
    const membersChanged = previous.memberIds.join() !== item.memberIds.join();
    return {
      items: [...rest.items, item],
      occurrences: range.occurrences.map((occurrence) =>
        occurrence.itemId === item.id &&
        membersChanged &&
        item.recurrence?.type !== "afterDone"
          ? {
              ...occurrence,
              turnGroupMemberId: turnOn(item, [], occurrence.originalDate),
            }
          : occurrence,
      ),
    };
  }
  return {
    items: [...rest.items, item],
    occurrences: [
      ...rest.occurrences,
      ...expandOccurrences(
        item,
        cachedCompletions(range, item.id),
        from,
        to,
        today,
      ),
    ],
  };
}

export const repeatChoices = [
  "never",
  "daily",
  "weekly",
  "biweekly",
  "afterDone",
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
  if (recurrence.type === "afterDone") return { ...form, choice: "afterDone" };
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

export function recurrenceOf(
  form: RepeatForm,
  startsOn: string,
  kind: CalendarItemKind,
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
    case "afterDone":
      return kind === "task" ? { type: "afterDone", interval: every } : null;
    case "custom":
      return form.unit === "days"
        ? { type: "daily", interval: every }
        : { type: "weekly", interval: every, days };
  }
}
