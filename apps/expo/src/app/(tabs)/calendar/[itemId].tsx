import { useLocalSearchParams } from "expo-router";

import { CalendarGroupGate } from "~/components/calendar/CalendarGroupGate";
import { CalendarItemDetail } from "~/components/calendar/CalendarItemDetail";

export default function CalendarItemScreen() {
  const { itemId, date } = useLocalSearchParams<{
    itemId: string;
    date?: string;
  }>();

  return (
    <CalendarGroupGate>
      {(group) => (
        <CalendarItemDetail
          group={group}
          itemId={Number(itemId)}
          originalDate={date}
        />
      )}
    </CalendarGroupGate>
  );
}
