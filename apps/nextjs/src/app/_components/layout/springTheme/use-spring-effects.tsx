"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

const SPRING_EFFECTS_STORAGE_KEY = "spring_effects_enabled";

interface SpringEffectsContextValue {
  isEnabled: boolean;
  setEnabled: (updater: boolean | ((prev: boolean) => boolean)) => void;
}

const SpringEffectsContext = createContext<SpringEffectsContextValue | null>(
  null,
);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  const stored = localStorage.getItem(SPRING_EFFECTS_STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

function getServerSnapshot() {
  return false;
}

export function SpringEffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isEnabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setEnabled = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      const current = getSnapshot();
      const next =
        typeof updater === "function"
          ? (updater)(current)
          : updater;
      localStorage.setItem(SPRING_EFFECTS_STORAGE_KEY, String(next));
      window.dispatchEvent(new Event("storage"));
    },
    [],
  );

  return (
    <SpringEffectsContext.Provider
      value={{
        isEnabled,
        setEnabled,
      }}
    >
      {children}
    </SpringEffectsContext.Provider>
  );
}

export function useSpringEffects() {
  const context = useContext(SpringEffectsContext);

  if (!context) {
    throw new Error(
      "useSpringEffects must be used within a SpringEffectsProvider",
    );
  }

  return context;
}
