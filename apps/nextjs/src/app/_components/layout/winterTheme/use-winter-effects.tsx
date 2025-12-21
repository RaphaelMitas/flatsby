"use client";

import { createContext, useCallback, useContext, useState } from "react";

const WINTER_EFFECTS_STORAGE_KEY = "winter_effects_enabled";

interface WinterEffectsContextValue {
  isEnabled: boolean;
  setEnabled: (updater: boolean | ((prev: boolean) => boolean)) => void;
  isLoading: boolean;
}

const WinterEffectsContext = createContext<WinterEffectsContextValue | null>(
  null,
);

/**
 * Provider component for winter effects state
 * Wrap your app with this to share winter effects state across components
 */
export function WinterEffectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stored =
    typeof window !== "undefined"
      ? localStorage.getItem(WINTER_EFFECTS_STORAGE_KEY)
      : "true";
  const [isEnabled, setIsEnabled] = useState<boolean | null>(
    stored === null ? true : stored === "true",
  );

  const setEnabled = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      setIsEnabled((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (prev: boolean) => boolean)(prev ?? true)
            : updater;
        localStorage.setItem(WINTER_EFFECTS_STORAGE_KEY, String(next));
        return next;
      });
    },
    [],
  );

  return (
    <WinterEffectsContext.Provider
      value={{
        isEnabled: isEnabled ?? true,
        setEnabled,
        isLoading: isEnabled === null,
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
