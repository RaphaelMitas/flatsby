//Theme Provider nativewind

import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

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
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { colorScheme, setColorScheme } = useColorScheme();
  const [storedTheme, setStoredTheme] = useState<
    "light" | "dark" | "system" | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
          setColorScheme(savedTheme);
        } else {
          setStoredTheme(defaultTheme);
          setColorScheme(defaultTheme);
        }
      } catch (error) {
        console.error("Error restoring theme from storage:", error);
        setStoredTheme(defaultTheme);
        setColorScheme(defaultTheme);
      } finally {
        setIsInitialized(true);
      }
    };

    void restoreThemeFromStorage();
  }, [defaultTheme, setColorScheme]);

  // Determine the actual theme being used
  const theme = colorScheme === "dark" ? "dark" : "light";
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
    setColorScheme(newTheme);
    setStoredTheme(newTheme);
    void saveThemeToStorage(newTheme);
  };

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setColorScheme(newTheme);
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
