import { trpc } from "~/utils/api";
import { holdWhileMutating } from "~/utils/live-query";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => ({
  ...trpc.calendar.range.queryOptions({ groupId, from, to }),
  staleTime: holdWhileMutating(trpc.calendar.pathKey()),
});
