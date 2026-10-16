import { useLocalSearchParams } from "expo-router";

import { CalendarGroupGate } from "~/components/calendar/CalendarGroupGate";
import { CalendarItemForm } from "~/components/calendar/CalendarItemForm";

export default function CalendarFormScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();

  return (
    <CalendarGroupGate>
      {(group) => (
        <CalendarItemForm
          group={group}
          itemId={id === undefined ? undefined : Number(id)}
          date={date}
        />
      )}
    </CalendarGroupGate>
  );
}
