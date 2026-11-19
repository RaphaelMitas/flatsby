import type { ColorMode, PaletteTokenName } from "@flatsby/validators/palette";
import type { ClassValue } from "clsx";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { fixedColors } from "@flatsby/validators/palette";

import { useTheme } from "~/lib/ui/theme";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
