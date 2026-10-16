"use client";

import type { CalendarRangeSnapshot } from "@flatsby/api/calendarCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  patchCalendarRanges,
  restoreCalendarRanges,
} from "@flatsby/api/calendarCache";
import { toast } from "@flatsby/ui/toast";
import {
  withDone,
  withoutItem,
  withRescheduled,
  withSavedItem,
} from "@flatsby/validators/calendar";

import { useTRPC } from "~/trpc/react";

type Result =
  { success: true } | { success: false; error: { message: string } };

export function useCalendarMutations(groupId: number, meId: number) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ranges = trpc.calendar.range.queryFilter({ groupId });

  const patchRanges = (patch: Parameters<typeof patchCalendarRanges>[2]) =>
    patchCalendarRanges(queryClient, ranges, patch);
  const restore = (snapshot: CalendarRangeSnapshot | undefined) =>
    restoreCalendarRanges(queryClient, snapshot);

  const settle = {
    onError: (
      error: { message: string },
      _input: unknown,
      snapshot: CalendarRangeSnapshot | undefined,
    ) => {
      restore(snapshot);
      toast.error(error.message);
    },
    onSuccess: (
      result: Result,
      _input: unknown,
      snapshot: CalendarRangeSnapshot,
    ) => {
      if (result.success) return;
      restore(snapshot);
      toast.error(result.error.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries(ranges);
      void queryClient.invalidateQueries(
        trpc.calendar.item.queryFilter({ groupId }),
      );
    },
  };

  const setDone = useMutation(
    trpc.calendar.setDone.mutationOptions({
      onMutate: (input) =>
        patchRanges((range) =>
          withDone(range, { ...input, byGroupMemberId: meId }),
        ),
      ...settle,
    }),
  );

  const reschedule = useMutation(
    trpc.calendar.reschedule.mutationOptions({
      onMutate: (input) =>
        patchRanges((range) => withRescheduled(range, input)),
      ...settle,
    }),
  );

  const remove = useMutation(
    trpc.calendar.delete.mutationOptions({
      onMutate: (input) => patchRanges((range) => withoutItem(range, input.id)),
      ...settle,
    }),
  );

  const create = useMutation(
    trpc.calendar.create.mutationOptions({
      onMutate: (input) =>
        patchRanges((range, window) =>
          // Negative ids never collide with real ones and mark the row as pending
          withSavedItem(range, { ...input, id: -Date.now() }, window),
        ),
      ...settle,
    }),
  );

  const update = useMutation(
    trpc.calendar.update.mutationOptions({
      onMutate: (input) =>
        patchRanges((range, window) => withSavedItem(range, input, window)),
      ...settle,
    }),
  );

  return { setDone, reschedule, remove, create, update };
}
