import { z } from "zod/v4";

import { calendarDateSchema } from "@flatsby/validators/calendar";

import { queryClient, trpc } from "~/utils/api";
import { holdWhileMutating } from "~/utils/live-query";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => ({
  ...trpc.calendar.range.queryOptions({ groupId, from, to }),
  staleTime: holdWhileMutating(trpc.calendar.pathKey()),
});

const rangeKeySchema = z.tuple([
  z.unknown(),
  z.object({
    input: z.object({ from: calendarDateSchema, to: calendarDateSchema }),
  }),
]);

export const lastKnownCalendarRange = (groupId: number, today: string) =>
  queryClient
    .getQueriesData(trpc.calendar.range.queryFilter({ groupId }))
    .flatMap(([key]) => {
      const window = rangeKeySchema.safeParse(key).data?.[1].input;
      const data =
        window &&
        queryClient.getQueryData(
          trpc.calendar.range.queryKey({ groupId, ...window }),
        );
      return data ? [{ data, ...window }] : [];
    })
    .filter(({ from, to }) => from <= today && today <= to)
    .sort((a, b) => b.to.localeCompare(a.to))[0]?.data;
