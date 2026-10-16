"use client";

import type { ApiResult } from "@flatsby/api";
import type {
  CalendarPatch,
  CalendarSnapshot,
} from "@flatsby/api/calendarCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  calendarPatches,
  patchCalendar,
  restoreCalendar,
} from "@flatsby/api/calendarCache";
import { toast } from "@flatsby/ui/toast";

import { useTRPC } from "~/trpc/react";

export function useCalendarMutations(groupId: number, meId: number) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const filters = {
    ranges: trpc.calendar.range.queryFilter({ groupId }),
    details: trpc.calendar.item.queryFilter({ groupId }),
  };

  const optimistic = <TInput>(patchFor: (input: TInput) => CalendarPatch) => ({
    onMutate: (input: TInput) =>
      patchCalendar(queryClient, filters, patchFor(input)),
    onError: (
      error: { message: string },
      _input: TInput,
      snapshot: CalendarSnapshot | undefined,
    ) => {
      restoreCalendar(queryClient, snapshot);
      toast.error(error.message);
    },
    onSuccess: (
      result: ApiResult<unknown>,
      _input: TInput,
      snapshot: CalendarSnapshot,
    ) => {
      if (result.success) return;
      restoreCalendar(queryClient, snapshot);
      toast.error(result.error.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries(filters.ranges);
      void queryClient.invalidateQueries(filters.details);
    },
  });

  return {
    setDone: useMutation(
      trpc.calendar.setDone.mutationOptions(
        optimistic((input) => calendarPatches.setDone(input, meId)),
      ),
    ),
    reschedule: useMutation(
      trpc.calendar.reschedule.mutationOptions(
        optimistic(calendarPatches.reschedule),
      ),
    ),
    remove: useMutation(
      trpc.calendar.delete.mutationOptions(optimistic(calendarPatches.remove)),
    ),
    create: useMutation(
      trpc.calendar.create.mutationOptions(optimistic(calendarPatches.create)),
    ),
    update: useMutation(
      trpc.calendar.update.mutationOptions(optimistic(calendarPatches.update)),
    ),
  };
}
