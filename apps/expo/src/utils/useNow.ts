import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

/** Re-reads the clock whenever the screen or the app comes back, since tabs stay mounted for days. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => setNow(new Date()), []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => subscription.remove();
  }, []);
  return now;
}
