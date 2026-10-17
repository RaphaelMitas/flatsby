import { useLocalSearchParams } from "expo-router";

import { CalendarItemForm } from "~/components/calendar/CalendarItemForm";
import { GroupGate } from "~/components/GroupGate";

export default function CalendarFormScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();

  return (
    <GroupGate>
      {(group) => (
        <CalendarItemForm
          group={group}
          itemId={id === undefined ? undefined : Number(id)}
          date={date}
        />
      )}
    </GroupGate>
  );
}
