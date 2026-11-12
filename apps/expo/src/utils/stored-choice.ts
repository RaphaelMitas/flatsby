import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** null until the stored one is read */
export function storedChoice<T extends string>(
  key: string,
  parse: (saved: string | null) => T,
) {
  let value: T | null = null;
  const listeners = new Set<() => void>();

  const set = (next: T) => {
    value = next;
    for (const listener of listeners) listener();
  };

  const loaded = AsyncStorage.getItem(key)
    .catch(() => null)
    .then((saved) => {
      const parsed = parse(saved);
      set(parsed);
      return parsed;
    });

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    useValue: () => useSyncExternalStore(subscribe, () => value),
    read: async () => {
      const initial = await loaded;
      return value ?? initial;
    },
    save: (next: T) => {
      set(next);
      AsyncStorage.setItem(key, next).catch(console.error);
    },
  };
}
