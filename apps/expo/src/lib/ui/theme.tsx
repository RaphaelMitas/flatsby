//Theme Provider nativewind

import { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ThemeContextType {
  setTheme: (newTheme: "light" | "dark" | "system") => void;
  storedTheme: "light" | "dark" | "system" | null;
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
  const [storedTheme, setStoredTheme] = useState<
    "light" | "dark" | "system" | null
  >(null);

  const applyColorScheme = (theme: "light" | "dark" | "system") => {
    Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
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
      }
    };

    void restoreThemeFromStorage();
  }, [defaultTheme]);

  const saveThemeToStorage = async (newTheme: "light" | "dark" | "system") => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error("Error saving theme to storage:", error);
    }
  };

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    applyColorScheme(newTheme);
    setStoredTheme(newTheme);
    void saveThemeToStorage(newTheme);
  };

  const value: ThemeContextType = { storedTheme, setTheme };

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
