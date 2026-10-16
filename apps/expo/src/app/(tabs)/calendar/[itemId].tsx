import { useLocalSearchParams } from "expo-router";

import { CalendarItemDetail } from "~/components/calendar/CalendarItemDetail";
import { GroupGate } from "~/components/GroupGate";

export default function CalendarItemScreen() {
  const { itemId, date } = useLocalSearchParams<{
    itemId: string;
    date?: string;
  }>();

  return (
    <GroupGate>
      {(group) => (
        <CalendarItemDetail group={group} itemId={Number(itemId)} date={date} />
      )}
    </GroupGate>
  );
}
