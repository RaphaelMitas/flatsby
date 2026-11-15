import { useState } from "react";
import { RefreshControl } from "react-native";
import { onlineManager } from "@tanstack/react-query";

export function useRefreshControl(onRefresh?: () => Promise<unknown>) {
  const [pulled, setPulled] = useState(false);

  if (!onRefresh) return undefined;

  const refresh = () => {
    if (!onlineManager.isOnline()) return;
    setPulled(true);
    void onRefresh().finally(() => setPulled(false));
  };

  return (
    <RefreshControl
      refreshing={pulled}
      onRefresh={refresh}
      style={{ zIndex: 1 }}
    />
  );
}
