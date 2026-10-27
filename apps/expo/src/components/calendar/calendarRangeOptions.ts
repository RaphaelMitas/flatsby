import { queryClient, trpc } from "~/utils/api";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => ({
  ...trpc.calendar.range.queryOptions({ groupId, from, to }),
  // Refetching a range mid-write would wipe its optimistic patch
  staleTime: () =>
    queryClient.isMutating({ mutationKey: trpc.calendar.pathKey() }) > 0
      ? Number.POSITIVE_INFINITY
      : 0,
});
