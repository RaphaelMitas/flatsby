import { useLocalSearchParams } from "expo-router";

import { CalendarItemDetail } from "~/components/calendar/CalendarItemDetail";
import { GroupGate } from "~/components/GroupGate";

export default function CalendarItemScreen() {
  const { itemId, date, missed } = useLocalSearchParams<{
    itemId: string;
    date?: string;
    missed?: string;
  }>();

  return (
    <GroupGate>
      {(group) => (
        <CalendarItemDetail
          group={group}
          itemId={Number(itemId)}
          date={date}
          missed={missed ? missed.split(",") : []}
        />
      )}
    </GroupGate>
  );
}
