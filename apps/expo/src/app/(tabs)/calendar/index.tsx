import { CalendarGroupGate } from "~/components/calendar/CalendarGroupGate";
import { CalendarScreen } from "~/components/calendar/CalendarScreen";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function CalendarIndex() {
  return (
    <SafeAreaView>
      <CalendarGroupGate>
        {(group) => <CalendarScreen group={group} />}
      </CalendarGroupGate>
    </SafeAreaView>
  );
}
