import { useLocalSearchParams } from "expo-router";

import { CalendarItemForm } from "~/components/calendar/CalendarItemForm";
import { GroupGate } from "~/components/GroupGate";

export default function CalendarFormScreen() {
  const { id, date, view, start, month } = useLocalSearchParams<{
    id?: string;
    date?: string;
    view?: string;
    start?: string;
    month?: string;
  }>();

  return (
    <GroupGate>
      {(group) => (
        <CalendarItemForm
          group={group}
          itemId={id === undefined ? undefined : Number(id)}
          date={date}
          calendar={{
            view: view === "month" ? "month" : "list",
            start: start ?? null,
            month: month ?? null,
          }}
        />
      )}
    </GroupGate>
  );
}
