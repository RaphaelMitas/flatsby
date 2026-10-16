import type { GroupWithAccess } from "@flatsby/api";
import type { CalendarPatch } from "@flatsby/api/calendarCache";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { calendarMutation, calendarPatches } from "@flatsby/api/calendarCache";

import { trpc } from "~/utils/api";

export function useCalendarMutations(group: GroupWithAccess) {
  const queryClient = useQueryClient();
  const t = useTranslations();
  const filters = {
    ranges: trpc.calendar.range.queryFilter({ groupId: group.id }),
    details: trpc.calendar.item.queryFilter({ groupId: group.id }),
  };
  const optimistic = <TInput>(patchFor: (input: TInput) => CalendarPatch) =>
    calendarMutation(queryClient, filters, patchFor, (message) =>
      Alert.alert(t("common.error"), message ?? t("errors.unexpected")),
    );

  return {
    setDone: useMutation(
      trpc.calendar.setDone.mutationOptions(
        optimistic((input) =>
          calendarPatches.setDone(input, {
            groupMemberId: group.thisGroupMember.id,
            person: {
              name: group.thisGroupMember.user.name,
              image: group.thisGroupMember.user.image ?? null,
            },
          }),
        ),
      ),
    ),
    setSkipped: useMutation(
      trpc.calendar.setSkipped.mutationOptions(
        optimistic(calendarPatches.setSkipped),
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
