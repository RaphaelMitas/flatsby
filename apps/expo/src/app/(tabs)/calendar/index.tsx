import { useState } from "react";
import { useIsFocused } from "expo-router";

import { CalendarScreen } from "~/components/calendar/CalendarScreen";
import { GroupGate } from "~/components/GroupGate";
import { SafeAreaView } from "~/lib/ui/safe-area";

export default function CalendarIndex() {
  const focused = useIsFocused();
  const [opened, setOpened] = useState(focused);
  if (focused && !opened) setOpened(true);

  return (
    <SafeAreaView>
      {/* Android mounts this tab hidden at startup, where the agenda's first scroll is lost and it stays blank until dragged */}
      {opened && (
        <GroupGate>
          {(group) => <CalendarScreen key={group.id} group={group} />}
        </GroupGate>
      )}
    </SafeAreaView>
  );
}
