import type { CalendarRangeSnapshot } from "@flatsby/api/calendarCache";
import type {
  CalendarItemView,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  patchCalendarRanges,
  restoreCalendarRanges,
} from "@flatsby/api/calendarCache";
import {
  withDone,
  withoutItem,
  withRescheduled,
  withSavedItem,
} from "@flatsby/validators/calendar";

import { trpc } from "~/utils/api";

type Transform = Parameters<typeof patchCalendarRanges>[2];

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

export function useCalendarMutations(groupId: number, meId: number) {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const ranges = trpc.calendar.range.queryFilter({ groupId });

  const optimistic = <TInput>(transform: (input: TInput) => Transform) => ({
    onMutate: (input: TInput) =>
      patchCalendarRanges(queryClient, ranges, transform(input)),
    onError: (
      _error: unknown,
      _input: TInput,
      snapshot?: CalendarRangeSnapshot,
    ) => {
      restoreCalendarRanges(queryClient, snapshot);
      Alert.alert(t("common.error"), t("errors.unexpected"));
    },
    onSuccess: (
      result:
        { success: true } | { success: false; error: { message: string } },
      _input: TInput,
      snapshot?: CalendarRangeSnapshot,
    ) => {
      if (result.success) return;
      restoreCalendarRanges(queryClient, snapshot);
      Alert.alert(t("common.error"), result.error.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries(ranges);
      void queryClient.invalidateQueries(trpc.calendar.item.pathFilter());
    },
  });

  const setDone = useMutation(
    trpc.calendar.setDone.mutationOptions(
      optimistic(
        (input) => (range) =>
          withDone(range, { ...input, byGroupMemberId: meId }),
      ),
    ),
  );

  const reschedule = useMutation(
    trpc.calendar.reschedule.mutationOptions(
      optimistic((input) => (range) => withRescheduled(range, input)),
    ),
  );

  const remove = useMutation(
    trpc.calendar.delete.mutationOptions(
      optimistic((input) => (range) => withoutItem(range, input.id)),
    ),
  );

  const create = useMutation(
    trpc.calendar.create.mutationOptions(
      optimistic((input) => {
        // Negative so it never collides with a real id before the refetch lands
        const item = asView(-Date.now(), input);
        return (range, window) => withSavedItem(range, item, window);
      }),
    ),
  );

  const update = useMutation(
    trpc.calendar.update.mutationOptions(
      optimistic(
        (input) => (range, window) =>
          withSavedItem(range, asView(input.id, input), window),
      ),
    ),
  );

  return { setDone, reschedule, remove, create, update };
}
