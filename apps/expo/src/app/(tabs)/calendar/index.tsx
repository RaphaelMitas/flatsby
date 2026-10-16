import { CalendarScreen } from "~/components/calendar/CalendarScreen";
import { GroupGate } from "~/components/GroupGate";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function CalendarIndex() {
  return (
    <SafeAreaView>
      <GroupGate>
        {(group) => <CalendarScreen key={group.id} group={group} />}
      </GroupGate>
    </SafeAreaView>
  );
}
