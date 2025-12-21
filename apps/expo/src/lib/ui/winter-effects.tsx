import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface WinterEffectsContextType {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  isInitialized: boolean;
}

const WinterEffectsContext = createContext<
  WinterEffectsContextType | undefined
>(undefined);

const WINTER_EFFECTS_STORAGE_KEY = "winter_effects_enabled";

interface WinterEffectsProviderProps {
  children: React.ReactNode;
}

export function WinterEffectsProvider({
  children,
}: WinterEffectsProviderProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(true); // Default to enabled
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore preference from storage on mount
  useEffect(() => {
    const restoreFromStorage = async () => {
      try {
        const stored = await AsyncStorage.getItem(WINTER_EFFECTS_STORAGE_KEY);
        // Default to true if not set (enabled by default)
        const enabled = stored === null ? true : stored === "true";
        setIsEnabled(enabled);
      } catch (error) {
        console.error("Error restoring winter effects preference:", error);
        setIsEnabled(true); // Default to enabled on error
      } finally {
        setIsInitialized(true);
      }
    };

    void restoreFromStorage();
  }, []);

  const setEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    // Save to storage asynchronously without blocking
    void AsyncStorage.setItem(
      WINTER_EFFECTS_STORAGE_KEY,
      String(enabled),
    ).catch((error) => {
      console.error("Error saving winter effects preference:", error);
    });
  };

  const value: WinterEffectsContextType = {
    isEnabled,
    setEnabled,
    isInitialized,
  };

  return (
    <WinterEffectsContext.Provider value={value}>
      {children}
    </WinterEffectsContext.Provider>
  );
}

// Hook to use winter effects context
export function useWinterEffects() {
  const context = useContext(WinterEffectsContext);
  if (context === undefined) {
    throw new Error(
      "useWinterEffects must be used within a WinterEffectsProvider",
    );
  }
  return context;
}
