import type {
  CalendarItemDetail,
  CalendarItemView,
  CalendarRange,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import type { QueryClient, QueryFilters } from "@tanstack/react-query";
import { z } from "zod/v4";

import {
  calendarRangeSchema,
  continuedRotation,
  DEFAULT_TIME_ZONE,
  editedDays,
  editedEndsOn,
  isScheduledOn,
  rewritesPast,
  splitEndsOn,
  splitsSeries,
  withDone,
  withoutItem,
  withSavedItem,
  withSkipped,
  withSplitSeries,
} from "@flatsby/validators/calendar";

import type { ApiResult } from "./errors";
import type { QuerySnapshot } from "./resultMutation";
import { restoreSnapshot, resultMutation } from "./resultMutation";

// A tRPC query key is [path, { input, type }]
const rangeKeySchema = z.tuple([
  z.unknown(),
  z.object({ input: calendarRangeSchema }),
]);

type RangeWindow = z.infer<typeof calendarRangeSchema>;

export interface CalendarPatch {
  range: (range: CalendarRange, window: RangeWindow) => CalendarRange;
  detail?: (detail: CalendarItemDetail) => CalendarItemDetail;
}

type FindCachedItem = (id: number) => CalendarItemView | undefined;

export type CalendarPatchFor<TInput> = (
  input: TInput,
  findCachedItem: FindCachedItem,
) => CalendarPatch;

interface CalendarFilters {
  ranges: QueryFilters;
  details: QueryFilters;
}

/** Applies one change to every cached range and item detail of the group, so nothing on screen lags behind. */
async function patchCalendar(
  queryClient: QueryClient,
  filters: CalendarFilters,
  patchFor: (findCachedItem: FindCachedItem) => CalendarPatch,
): Promise<QuerySnapshot> {
  await Promise.all([
    queryClient.cancelQueries(filters.ranges),
    queryClient.cancelQueries(filters.details),
  ]);
  const ranges = queryClient.getQueriesData<ApiResult<CalendarRange>>(
    filters.ranges,
  );
  const details = queryClient.getQueriesData<ApiResult<CalendarItemDetail>>(
    filters.details,
  );
  const cachedItems = [
    ...ranges.flatMap(([, cached]) =>
      cached?.success ? cached.data.items : [],
    ),
    ...details.flatMap(([, cached]) =>
      cached?.success ? [cached.data.item] : [],
    ),
  ];
  const patch = patchFor((id) => cachedItems.find((item) => item.id === id));
  for (const [key, cached] of ranges) {
    const window = rangeKeySchema.safeParse(key);
    if (cached?.success && window.success)
      queryClient.setQueryData(key, {
        ...cached,
        data: patch.range(cached.data, window.data[1].input),
      });
  }
  const { detail } = patch;
  if (detail)
    for (const [key, cached] of details) {
      if (cached?.success)
        queryClient.setQueryData(key, { ...cached, data: detail(cached.data) });
    }
  return [...ranges, ...details].map(([queryKey, previous]) => ({
    queryKey,
    previous,
  }));
}

export const calendarMutation = <TInput>(
  queryClient: QueryClient,
  filters: CalendarFilters,
  patchFor: CalendarPatchFor<TInput>,
  onFailure: (message: string | undefined) => void,
) =>
  resultMutation({
    onMutate: (input: TInput) =>
      patchCalendar(queryClient, filters, (findCachedItem) =>
        patchFor(input, findCachedItem),
      ),
    rollback: restoreSnapshot(queryClient),
    onFailure,
    onSettled: () => {
      void queryClient.invalidateQueries(filters.ranges);
      void queryClient.invalidateQueries(filters.details);
    },
  });

const asView = (
  id: number,
  input: CreateCalendarItemInput,
  previous?: CalendarItemView,
): CalendarItemView => ({
  id,
  kind: input.kind,
  title: input.title,
  color: input.color,
  startsOn: input.startsOn,
  endsOn: input.endsOn ?? null,
  time: input.time,
  recurrence: input.recurrence,
  days: editedDays(input, previous),
  timeZone: previous?.timeZone ?? input.timeZone ?? DEFAULT_TIME_ZONE,
  memberIds: input.memberIds,
});

// Negative so it never collides with a real id before the refetch lands
const temporaryId = () => -Date.now();

const skipDays = (
  range: CalendarRange,
  itemId: number,
  dates: string[],
  window: RangeWindow,
) =>
  dates.reduce(
    (patched, date) =>
      withSkipped(patched, { itemId, date, skipped: true }, window),
    range,
  );

/** The optimistic side of each calendar mutation, shared by both clients. */
export const calendarPatches = {
  setDone: (
    input: { itemId: number; date: string; done: boolean; skip?: string[] },
    me: { groupMemberId: number; person: DebtPerson },
  ): CalendarPatch => ({
    range: (range, window) =>
      skipDays(
        withDone(range, {
          ...input,
          byGroupMemberId: me.groupMemberId,
          by: me.person,
        }),
        input.itemId,
        input.done ? (input.skip ?? []) : [],
        window,
      ),
  }),

  setSkipped: (input: {
    itemId: number;
    date: string;
    skipped: boolean;
    missed?: string[];
  }): CalendarPatch => ({
    range: (range, window) =>
      input.skipped
        ? skipDays(
            range,
            input.itemId,
            [input.date, ...(input.missed ?? [])],
            window,
          )
        : withSkipped(range, input, window),
    detail: (detail) => {
      if (detail.item.id !== input.itemId) return detail;
      if (input.skipped)
        return {
          ...detail,
          upcoming: detail.upcoming.filter(
            (occurrence) => occurrence.date !== input.date,
          ),
        };
      return {
        ...detail,
        history: detail.history.filter(
          (entry) => entry.date !== input.date || entry.completedAt,
        ),
      };
    },
  }),

  remove: (input: { id: number }): CalendarPatch => ({
    range: (range) => withoutItem(range, input.id),
  }),

  create: (input: CreateCalendarItemInput): CalendarPatch => {
    const item = asView(temporaryId(), input);
    return { range: (range, window) => withSavedItem(range, item, window) };
  },

  update: (
    input: CreateCalendarItemInput & { id: number; today: string },
    findCachedItem: FindCachedItem,
  ): CalendarPatch => {
    // A range's cache may not hold the item, yet the edit can still reach into it
    const previous = findCachedItem(input.id);
    if (!previous) return { range: (range) => range };
    const edited = asView(
      input.id,
      { ...input, endsOn: editedEndsOn(previous, input) },
      previous,
    );
    if (rewritesPast(previous, edited, input.today))
      return { range: (range) => range };
    if (splitsSeries(previous, input, input.today)) {
      const endsOn = splitEndsOn(previous, input.startsOn);
      const next = {
        ...edited,
        id: temporaryId(),
        memberIds: continuedRotation(previous, edited),
      };
      return {
        range: (range, window) =>
          withSplitSeries(range, previous, next, window),
        detail: (detail) =>
          detail.item.id === previous.id
            ? {
                ...detail,
                item: { ...detail.item, endsOn },
                upcoming: detail.upcoming.filter(
                  (occurrence) => occurrence.date <= endsOn,
                ),
                history: detail.history.filter((entry) => entry.date <= endsOn),
              }
            : detail,
      };
    }
    return {
      range: (range, window) => withSavedItem(range, edited, window),
      detail: (detail) =>
        detail.item.id === input.id
          ? {
              ...detail,
              item: edited,
              upcoming: detail.upcoming.filter((occurrence) =>
                isScheduledOn(edited, occurrence.date),
              ),
            }
          : detail,
    };
  },
};
