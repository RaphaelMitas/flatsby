import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function storedValue<T>(
  key: string,
  parse: (saved: string | null) => T,
  serialize: (value: T) => string = String,
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
  const get = () => value;

  return {
    subscribe,
    get,
    useValue: () => useSyncExternalStore(subscribe, get),
    read: async () => {
      const initial = await loaded;
      return value ?? initial;
    },
    save: (next: T) => {
      set(next);
      AsyncStorage.setItem(key, serialize(next)).catch(console.error);
    },
  };
}

export const storedChoice = <T extends string>(
  key: string,
  parse: (saved: string | null) => T,
) => storedValue(key, parse);

const flags = new Map<string, ReturnType<typeof storedValue<boolean>>>();

export function useStoredFlag(key: string) {
  const flag = flags.get(key) ?? storedValue(key, (saved) => saved !== null);
  flags.set(key, flag);
  return {
    isSet: useSyncExternalStore(flag.subscribe, flag.get),
    set: () => flag.save(true),
  };
}
