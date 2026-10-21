import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";

// "undecided" is the classic home with the invite to try the new one.
export type HomeVersion = "new" | "classic" | "undecided";

const STORAGE_KEY = "home-version";

let version: HomeVersion | null = null;
const listeners = new Set<() => void>();

const set = (next: HomeVersion) => {
  version = next;
  for (const listener of listeners) listener();
};

AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) =>
    set(saved === "new" || saved === "classic" ? saved : "undecided"),
  )
  .catch(() => set("undecided"));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** null until the stored choice is read */
export function useHomeVersion() {
  const posthog = usePostHog();
  const current = useSyncExternalStore(subscribe, () => version);

  const switchTo = (
    next: HomeVersion,
    source: "invite" | "switch_back" | "settings",
    reason?: string,
  ) => {
    if (next === current) return;
    posthog.capture("home_version_changed", {
      from: current,
      to: next,
      source,
      ...(reason && { reason }),
      $set: { home_version: next },
    });
    set(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(console.error);
  };

  return { version: current, switchTo };
}
