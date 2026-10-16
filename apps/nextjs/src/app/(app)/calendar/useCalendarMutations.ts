"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { CalendarPatch } from "@flatsby/api/calendarCache";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { calendarMutation, calendarPatches } from "@flatsby/api/calendarCache";
import { toast } from "@flatsby/ui/toast";

import { useTRPC } from "~/trpc/react";

export function useCalendarMutations(group: GroupWithAccess) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const filters = {
    ranges: trpc.calendar.range.queryFilter({ groupId: group.id }),
    details: trpc.calendar.item.queryFilter({ groupId: group.id }),
  };
  const optimistic = <TInput>(patchFor: (input: TInput) => CalendarPatch) =>
    calendarMutation(queryClient, filters, patchFor, (message) =>
      toast.error(message ?? t("errors.unexpected")),
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
