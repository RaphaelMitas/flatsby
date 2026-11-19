import type { ColorMode, PaletteTokenName } from "@flatsby/validators/palette";
import type { ClassValue } from "clsx";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { useTheme } from "~/lib/ui/theme";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fixedColors = {
  light: {
    destructive: "hsl(0, 72.2%, 50.6%)",
    "destructive-foreground": "hsl(0, 0%, 98%)",
    success: "hsl(120, 100%, 25.1%)",
    info: "hsl(224.3, 76.3%, 48%)",
  },
  dark: {
    destructive: "hsl(0, 72.2%, 50.6%)",
    "destructive-foreground": "hsl(0, 0%, 98%)",
    success: "hsl(142.1, 70.6%, 45.3%)",
    info: "hsl(213.1, 93.9%, 67.8%)",
  },
} as const;

export type ColorName = PaletteTokenName | keyof typeof fixedColors.light;

export const useThemeColors = (): {
  getColor: (colorName: ColorName) => string;
  colorScheme: ColorMode;
} => {
  const { tokens, colorMode } = useTheme();
  const colors = { ...tokens, ...fixedColors[colorMode] };

  return {
    getColor: (colorName: ColorName) => colors[colorName],
    colorScheme: colorMode,
  };
};

export const useThemedScreenOptions = () => {
  const { getColor } = useThemeColors();
  const solidHeader = {
    headerStyle: { backgroundColor: getColor("background") },
  };

  return {
    solidHeader,
    screenOptions: {
      ...(isLiquidGlassAvailable() ? {} : solidHeader),
      headerTintColor: getColor("foreground"),
      headerBackButtonDisplayMode: "minimal" as const,
      contentStyle: {
        backgroundColor: getColor("background"),
      },
    },
  };
};
