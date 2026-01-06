"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

const WINTER_EFFECTS_STORAGE_KEY = "winter_effects_enabled";

interface WinterEffectsContextValue {
  isEnabled: boolean;
  setEnabled: (updater: boolean | ((prev: boolean) => boolean)) => void;
}

const WinterEffectsContext = createContext<WinterEffectsContextValue | null>(
  null,
);

// Subscribe to storage changes
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Get current value from localStorage
function getSnapshot() {
  const stored = localStorage.getItem(WINTER_EFFECTS_STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

// Server snapshot - always return false to match initial client render
function getServerSnapshot() {
  return false;
}

/**
 * Provider component for winter effects state
 * Wrap your app with this to share winter effects state across components
 */
export function WinterEffectsProvider({
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
          ? (updater as (prev: boolean) => boolean)(current)
          : updater;
      localStorage.setItem(WINTER_EFFECTS_STORAGE_KEY, String(next));
      // Dispatch storage event to trigger re-render
      window.dispatchEvent(new Event("storage"));
    },
    [],
  );

  return (
    <WinterEffectsContext.Provider
      value={{
        isEnabled,
        setEnabled,
      }}
    >
      {children}
    </WinterEffectsContext.Provider>
  );
}

/**
 * Hook to manage winter effects preference in Next.js
 * Must be used within a WinterEffectsProvider
 */
export function useWinterEffects() {
  const context = useContext(WinterEffectsContext);

  if (!context) {
    throw new Error(
      "useWinterEffects must be used within a WinterEffectsProvider",
    );
  }

  return context;
}
