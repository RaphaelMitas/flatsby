import type { CalendarRange } from "@flatsby/validators/calendar";
import type {
  QueryClient,
  QueryFilters,
  QueryKey,
} from "@tanstack/react-query";
import { z } from "zod/v4";

import { calendarRangeSchema } from "@flatsby/validators/calendar";

import type { ApiResult } from "./errors";

// A tRPC query key is [path, { input, type }]
const rangeKeySchema = z.tuple([
  z.unknown(),
  z.object({ input: calendarRangeSchema }),
]);

export type CalendarRangeSnapshot = [
  QueryKey,
  ApiResult<CalendarRange> | undefined,
][];

/** Applies one change to every cached month of the group, so switching months never shows stale state. */
export async function patchCalendarRanges(
  queryClient: QueryClient,
  filters: QueryFilters,
  patch: (
    range: CalendarRange,
    window: z.infer<typeof calendarRangeSchema>,
  ) => CalendarRange,
): Promise<CalendarRangeSnapshot> {
  await queryClient.cancelQueries(filters);
  const snapshot =
    queryClient.getQueriesData<ApiResult<CalendarRange>>(filters);
  for (const [key, cached] of snapshot) {
    const window = rangeKeySchema.safeParse(key);
    if (cached?.success && window.success)
      queryClient.setQueryData(key, {
        ...cached,
        data: patch(cached.data, window.data[1].input),
      });
  }
  return snapshot;
}

export const restoreCalendarRanges = (
  queryClient: QueryClient,
  snapshot: CalendarRangeSnapshot = [],
) => {
  for (const [key, cached] of snapshot) queryClient.setQueryData(key, cached);
};
