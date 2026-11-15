import { useCallback, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

let activeAt = new Date();

const subscribe = (onChange: () => void) => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state !== "active") return;
    activeAt = new Date();
    onChange();
  });
  return () => subscription.remove();
};

export function useNow() {
  const [focusedAt, setFocusedAt] = useState(() => new Date());
  useFocusEffect(useCallback(() => setFocusedAt(new Date()), []));
  const foregroundedAt = useSyncExternalStore(subscribe, () => activeAt);
  return foregroundedAt.getTime() > focusedAt.getTime()
    ? foregroundedAt
    : focusedAt;
}
