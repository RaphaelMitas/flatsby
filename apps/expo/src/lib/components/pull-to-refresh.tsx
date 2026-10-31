import { useState } from "react";
import { RefreshControl } from "react-native";
import { onlineManager } from "@tanstack/react-query";

// Only the user's own pull shows as refreshing; polls and background refetches stay invisible.
export function useRefreshControl(onRefresh?: () => Promise<unknown>) {
  const [pulled, setPulled] = useState(false);

  if (!onRefresh) return undefined;

  const refresh = () => {
    // An offline refetch pauses until the network is back, which would hold the pull that long
    if (!onlineManager.isOnline()) return;
    setPulled(true);
    void onRefresh().finally(() => setPulled(false));
  };

  return (
    <RefreshControl
      refreshing={pulled}
      onRefresh={refresh}
      // iOS draws the spinner behind the list content, which a seasonal backdrop can paint over
      style={{ zIndex: 1 }}
    />
  );
}
