import type {
  CalendarPatch,
  CalendarSnapshot,
} from "@flatsby/api/calendarCache";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  calendarPatches,
  patchCalendar,
  restoreCalendar,
} from "@flatsby/api/calendarCache";

import { trpc } from "~/utils/api";

type Result =
  { success: true } | { success: false; error: { message: string } };

export function useCalendarMutations(groupId: number, meId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const filters = {
    ranges: trpc.calendar.range.queryFilter({ groupId }),
    details: trpc.calendar.item.queryFilter({ groupId }),
  };

  const optimistic = <TInput>(patchFor: (input: TInput) => CalendarPatch) => ({
    onMutate: (input: TInput) =>
      patchCalendar(queryClient, filters, patchFor(input)),
    onError: (_error: unknown, _input: TInput, snapshot?: CalendarSnapshot) => {
      restoreCalendar(queryClient, snapshot);
      Alert.alert(t("common.error"), t("errors.unexpected"));
    },
    onSuccess: (
      result: Result,
      _input: TInput,
      snapshot?: CalendarSnapshot,
    ) => {
      if (result.success) return;
      restoreCalendar(queryClient, snapshot);
      Alert.alert(t("common.error"), result.error.message);
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
