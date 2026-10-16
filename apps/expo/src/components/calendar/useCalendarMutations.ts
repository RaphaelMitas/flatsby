import type { CalendarPatch } from "@flatsby/api/calendarCache";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { calendarMutation, calendarPatches } from "@flatsby/api/calendarCache";

import { trpc } from "~/utils/api";

export function useCalendarMutations(groupId: number, meId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const filters = {
    ranges: trpc.calendar.range.queryFilter({ groupId }),
    details: trpc.calendar.item.queryFilter({ groupId }),
  };
  const optimistic = <TInput>(patchFor: (input: TInput) => CalendarPatch) =>
    calendarMutation(queryClient, filters, patchFor, (message) =>
      Alert.alert(t("common.error"), message ?? t("errors.unexpected")),
    );

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
