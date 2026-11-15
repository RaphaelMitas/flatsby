import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useStoredFlag(key: string) {
  const isSet = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) !== null,
    () => true,
  );
  const set = () => {
    localStorage.setItem(key, "true");
    for (const listener of listeners) listener();
  };
  return { isSet, set };
}
