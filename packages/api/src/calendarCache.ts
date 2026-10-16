import type {
  CalendarItemDetail,
  CalendarItemView,
  CalendarRange,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import type {
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";
import { z } from "zod/v4";

import {
  calendarRangeSchema,
  splitsSeries,
  withDone,
  withoutItem,
  withSavedItem,
  withSkipped,
  withSplitSeries,
} from "@flatsby/validators/calendar";

import type { ApiResult } from "./errors";

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

export type CalendarSnapshot = [QueryKey, unknown][];

interface CalendarFilters {
  ranges: QueryFilters;
  details: QueryFilters;
}

/** Applies one change to every cached month and item detail of the group, so nothing on screen lags behind. */
async function patchCalendar(
  queryClient: QueryClient,
  filters: CalendarFilters,
  patch: CalendarPatch,
): Promise<CalendarSnapshot> {
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
  return [...ranges, ...details];
}

const restoreCalendar = (
  queryClient: QueryClient,
  snapshot: CalendarSnapshot = [],
) => {
  for (const [key, cached] of snapshot) queryClient.setQueryData(key, cached);
};

/** Mutation callbacks for one calendar write; `onFailure` gets null when the request itself failed. */
export const calendarMutation = <TInput>(
  queryClient: QueryClient,
  filters: CalendarFilters,
  patchFor: (input: TInput) => CalendarPatch,
  onFailure: (message: string | null) => void,
) => ({
  onMutate: (input: TInput) =>
    patchCalendar(queryClient, filters, patchFor(input)),
  onError: (_error: unknown, _input: TInput, snapshot?: CalendarSnapshot) => {
    restoreCalendar(queryClient, snapshot);
    onFailure(null);
  },
  onSuccess: (
    result: ApiResult<unknown>,
    _input: TInput,
    snapshot?: CalendarSnapshot,
  ) => {
    if (result.success) return;
    restoreCalendar(queryClient, snapshot);
    onFailure(result.error.message);
  },
  onSettled: () => {
    void queryClient.invalidateQueries(filters.ranges);
    void queryClient.invalidateQueries(filters.details);
  },
});

const asView = (
  id: number,
  {
    kind,
    title,
    startsOn,
    time,
    recurrence,
    memberIds,
  }: CreateCalendarItemInput,
): CalendarItemView => ({
  id,
  kind,
  title,
  startsOn,
  endsOn: null,
  time,
  recurrence,
  memberIds,
});

// Negative so it never collides with a real id before the refetch lands
const temporaryId = () => -Date.now();

/** The optimistic side of each calendar mutation, shared by both clients. */
export const calendarPatches = {
  setDone: (
    input: { itemId: number; date: string; done: boolean },
    me: { groupMemberId: number; person: DebtPerson },
  ): CalendarPatch => ({
    range: (range) =>
      withDone(range, {
        ...input,
        byGroupMemberId: me.groupMemberId,
        by: me.person,
      }),
  }),

  setSkipped: (input: {
    itemId: number;
    date: string;
    skipped: boolean;
  }): CalendarPatch => ({
    range: (range, window) => withSkipped(range, input, window),
    detail: (detail) =>
      detail.item.id === input.itemId && !input.skipped
        ? {
            ...detail,
            history: detail.history.filter(
              (entry) => entry.date !== input.date || entry.completedAt,
            ),
          }
        : detail,
  }),

  remove: (input: { id: number }): CalendarPatch => ({
    range: (range) => withoutItem(range, input.id),
  }),

  create: (input: CreateCalendarItemInput): CalendarPatch => {
    const item = asView(temporaryId(), input);
    return { range: (range, window) => withSavedItem(range, item, window) };
  },

  update: (input: CreateCalendarItemInput & { id: number }): CalendarPatch => {
    const split = asView(temporaryId(), input);
    const edited = (previous: CalendarItemView) => ({
      ...asView(input.id, input),
      endsOn: previous.endsOn,
    });
    return {
      range: (range, window) => {
        const previous = range.items.find((item) => item.id === input.id);
        if (!previous) return range;
        return splitsSeries(previous, input)
          ? withSplitSeries(range, previous.id, split, window)
          : withSavedItem(range, edited(previous), window);
      },
      detail: (detail) =>
        detail.item.id === input.id && !splitsSeries(detail.item, input)
          ? { ...detail, item: edited(detail.item) }
          : detail,
    };
  },
};
