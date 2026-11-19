import type {
  ColorMode,
  Palette,
  PaletteTokens,
} from "@flatsby/validators/palette";
import { createContext, useContext, useEffect, useState } from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VariableContextProvider } from "nativewind";

import {
  defaultPalette,
  paletteTokens,
  paletteVariables,
  parsePalette,
} from "@flatsby/validators/palette";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  setTheme: (newTheme: Theme) => void;
  storedTheme: Theme | null;
  palette: Palette;
  setPalette: (newPalette: Palette) => void;
  colorMode: ColorMode;
  tokens: PaletteTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme_preference";
const PALETTE_STORAGE_KEY = "theme_palette";

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
  const [palette, setStoredPalette] = useState(defaultPalette);
  const colorMode: ColorMode = useColorScheme() === "dark" ? "dark" : "light";
  const tokens = paletteTokens(palette, colorMode);

  useEffect(() => {
    const restoreFromStorage = async () => {
      let theme = defaultTheme;
      try {
        const [savedTheme, savedPalette] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(PALETTE_STORAGE_KEY),
        ]);
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "system"
        ) {
          theme = savedTheme;
        }
        setStoredPalette(parsePalette(savedPalette));
      } catch (error) {
        console.error("Error restoring theme from storage:", error);
      }
      setStoredTheme(theme);
      applyColorScheme(theme);
    };

    void restoreFromStorage();
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

  const setPalette = (newPalette: Palette) => {
    setStoredPalette(newPalette);
    void AsyncStorage.setItem(
      PALETTE_STORAGE_KEY,
      JSON.stringify(newPalette),
    ).catch((error: unknown) => {
      console.error("Error saving palette to storage:", error);
    });
  };

  const value: ThemeContextType = {
    storedTheme,
    setTheme,
    palette,
    setPalette,
    colorMode,
    tokens,
  };

  return (
    <ThemeContext.Provider value={value}>
      <VariableContextProvider value={paletteVariables(tokens)}>
        {children}
      </VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
