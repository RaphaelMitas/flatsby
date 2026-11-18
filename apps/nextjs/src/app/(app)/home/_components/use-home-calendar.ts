import { skipToken, useQuery } from "@tanstack/react-query";

import { homeAgenda, listWindow } from "@flatsby/validators/calendar";

import { useTimeOfDay } from "~/app/_components/local-clock";
import { useTRPC } from "~/trpc/react";

export function useHomeCalendar(groupId: number, today: string | null) {
  const trpc = useTRPC();
  const time = useTimeOfDay();
  const { data: group } = useQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const { data: range } = useQuery(
    trpc.calendar.range.queryOptions(
      today ? { groupId, ...listWindow(today, today) } : skipToken,
    ),
  );
  if (!today || !time || !group?.success || !range?.success) return undefined;
  return homeAgenda(range.data, today, time, group.data.thisGroupMember.id);
}
