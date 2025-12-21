//Theme Provider nativewind

import { createContext, useContext, useEffect, useState } from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (newTheme: "light" | "dark" | "system") => void;
  toggleTheme: () => void;
  storedTheme: "light" | "dark" | "system" | null;
  isInitialized: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme_preference";

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const systemColorScheme = useRNColorScheme();
  const [storedTheme, setStoredTheme] = useState<
    "light" | "dark" | "system" | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to apply color scheme to appearance
  const applyColorScheme = (theme: "light" | "dark" | "system") => {
    if (theme === "system") {
      Appearance.setColorScheme(null); // Reset to system default
    } else {
      Appearance.setColorScheme(theme);
    }
  };

  // Restore theme preference from storage on mount
  useEffect(() => {
    const restoreThemeFromStorage = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          savedTheme &&
          (savedTheme === "light" ||
            savedTheme === "dark" ||
            savedTheme === "system")
        ) {
          setStoredTheme(savedTheme);
          applyColorScheme(savedTheme);
        } else {
          setStoredTheme(defaultTheme);
          applyColorScheme(defaultTheme);
        }
      } catch (error) {
        console.error("Error restoring theme from storage:", error);
        setStoredTheme(defaultTheme);
        applyColorScheme(defaultTheme);
      } finally {
        setIsInitialized(true);
      }
    };

    void restoreThemeFromStorage();
  }, [defaultTheme]);

  // Determine the actual theme being used
  const theme = systemColorScheme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  const saveThemeToStorage = async (newTheme: "light" | "dark" | "system") => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error("Error saving theme to storage:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    applyColorScheme(newTheme);
    setStoredTheme(newTheme);
    void saveThemeToStorage(newTheme);
  };

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    applyColorScheme(newTheme);
    setStoredTheme(newTheme);
    void saveThemeToStorage(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    storedTheme,
    isInitialized,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
