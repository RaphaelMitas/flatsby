import type {
  CalendarItemDetail,
  CalendarItemView,
  CalendarRange,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import type {
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";
import { z } from "zod/v4";

import {
  calendarRangeSchema,
  withDone,
  withoutItem,
  withRescheduled,
  withSavedItem,
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

// tRPC keys mutations by path, so this prefix matches every calendar write
const calendarMutationKey = [["calendar"]];

/** Applies one change to every cached month and item detail of the group, so nothing on screen lags behind. */
export async function patchCalendar(
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

export const restoreCalendar = (
  queryClient: QueryClient,
  snapshot: CalendarSnapshot = [],
) => {
  for (const [key, cached] of snapshot) queryClient.setQueryData(key, cached);
};

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
  time,
  recurrence,
  memberIds,
});

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
    // A refetch while another write is in flight would briefly show the older server state
    if (queryClient.isMutating({ mutationKey: calendarMutationKey }) > 1)
      return;
    void queryClient.invalidateQueries(filters.ranges);
    void queryClient.invalidateQueries(filters.details);
  },
});

/** The optimistic side of each calendar mutation, shared by both clients. */
export const calendarPatches = {
  setDone: (
    input: { itemId: number; originalDate: string; done: boolean },
    byGroupMemberId: number,
  ): CalendarPatch => ({
    range: (range, window) =>
      withDone(range, { ...input, byGroupMemberId }, window),
  }),

  reschedule: (input: {
    itemId: number;
    originalDate: string;
    movedTo: string | null;
    skipped: boolean;
  }): CalendarPatch => ({
    range: (range, window) => withRescheduled(range, input, window),
    detail: (detail) =>
      detail.item.id === input.itemId && !input.skipped
        ? {
            ...detail,
            history: detail.history.filter(
              (entry) =>
                entry.originalDate !== input.originalDate || entry.completedAt,
            ),
          }
        : detail,
  }),

  remove: (input: { id: number }): CalendarPatch => ({
    range: (range) => withoutItem(range, input.id),
  }),

  create: (input: CreateCalendarItemInput): CalendarPatch => {
    // Negative so it never collides with a real id before the refetch lands
    const item = asView(-Date.now(), input);
    return { range: (range, window) => withSavedItem(range, item, window) };
  },

  update: (input: CreateCalendarItemInput & { id: number }): CalendarPatch => {
    const item = asView(input.id, input);
    return {
      range: (range, window) => withSavedItem(range, item, window),
      detail: (detail) =>
        detail.item.id === item.id ? { ...detail, item } : detail,
    };
  },
};
