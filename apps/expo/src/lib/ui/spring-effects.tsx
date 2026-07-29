import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isE2ETestingEnabled } from "~/utils/e2e";

interface SpringEffectsContextType {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  isInitialized: boolean;
}

const SpringEffectsContext = createContext<
  SpringEffectsContextType | undefined
>(undefined);

const SPRING_EFFECTS_STORAGE_KEY = "spring_effects_enabled";

interface SpringEffectsProviderProps {
  children: React.ReactNode;
}

// The constant petal animation competes with Maestro for the simulator's few
// CPU cores and keeps the UI from ever settling, so e2e builds default it off.
const DEFAULT_ENABLED = !isE2ETestingEnabled();

export function SpringEffectsProvider({
  children,
}: SpringEffectsProviderProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(DEFAULT_ENABLED);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const restoreFromStorage = async () => {
      try {
        const stored = await AsyncStorage.getItem(SPRING_EFFECTS_STORAGE_KEY);
        const enabled = stored === null ? DEFAULT_ENABLED : stored === "true";
        setIsEnabled(enabled);
      } catch (error) {
        console.error("Error restoring spring effects preference:", error);
        setIsEnabled(DEFAULT_ENABLED);
      } finally {
        setIsInitialized(true);
      }
    };

    void restoreFromStorage();
  }, []);

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    void AsyncStorage.setItem(
      SPRING_EFFECTS_STORAGE_KEY,
      String(enabled),
    ).catch((error) => {
      console.error("Error saving spring effects preference:", error);
    });
  };

  const value: SpringEffectsContextType = {
    isEnabled,
    setEnabled,
    isInitialized,
  };

  return (
    <SpringEffectsContext.Provider value={value}>
      {children}
    </SpringEffectsContext.Provider>
  );
}

export function useSpringEffects() {
  const context = useContext(SpringEffectsContext);
  if (context === undefined) {
    throw new Error(
      "useSpringEffects must be used within a SpringEffectsProvider",
    );
  }
  return context;
}
