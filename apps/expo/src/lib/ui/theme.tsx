//Theme Provider nativewind

import { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  setTheme: (newTheme: Theme) => void;
  storedTheme: Theme | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme_preference";

const applyColorScheme = (theme: Theme) => {
  Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  const [storedTheme, setStoredTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const restoreThemeFromStorage = async () => {
      let theme = defaultTheme;
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          theme = saved;
        }
      } catch (error) {
        console.error("Error restoring theme from storage:", error);
      }
      setStoredTheme(theme);
      applyColorScheme(theme);
    };

    void restoreThemeFromStorage();
  }, [defaultTheme]);

  const setTheme = (newTheme: Theme) => {
    applyColorScheme(newTheme);
    setStoredTheme(newTheme);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme).catch(
      (error: unknown) => {
        console.error("Error saving theme to storage:", error);
      },
    );
  };

  const value: ThemeContextType = { storedTheme, setTheme };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
