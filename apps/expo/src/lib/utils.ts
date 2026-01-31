import type { ApiErrorResult } from "@flatsby/api";
import type { ClassValue } from "clsx";
import type { useRouter } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { signOut } from "~/utils/auth/auth-client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const lightColors = {
  background: "hsl(0, 0%, 100%)",
  foreground: "hsl(240, 10%, 3.9%)",
  card: "hsl(0, 0%, 100%)",
  "card-foreground": "hsl(240, 10%, 3.9%)",
  popover: "hsl(0, 0%, 100%)",
  "popover-foreground": "hsl(240, 10%, 3.9%)",
  primary: "hsl(240, 5.9%, 10%)",
  "primary-foreground": "hsl(0, 0%, 98%)",
  secondary: "hsl(240, 4.8%, 95.9%)",
  "secondary-foreground": "hsl(240, 5.9%, 10%)",
  muted: "hsl(240, 4.8%, 95.9%)",
  "muted-foreground": "hsl(240, 3.8%, 46.1%)",
  accent: "hsl(240, 4.8%, 95.9%)",
  "accent-foreground": "hsl(240, 5.9%, 10%)",
  destructive: "hsl(0, 84.2%, 60.2%)",
  "destructive-foreground": "hsl(0, 0%, 98%)",
  success: "hsl(120, 100%, 25.1%)",
  "success-foreground": "hsl(0, 0%, 98%)",
  warning: "hsl(45.4, 93.4%, 47.5%)",
  "warning-foreground": "hsl(0, 0%, 98%)",
  error: "hsl(0, 84.2%, 60.2%)",
  "error-foreground": "hsl(0, 0%, 98%)",
  info: "hsl(224.3, 76.3%, 48%)",
  "info-foreground": "hsl(0, 0%, 98%)",
  purple: "hsl(271, 91%, 65%)",
  "purple-foreground": "hsl(0, 0%, 98%)",
  border: "hsl(240, 5.9%, 90%)",
  input: "hsl(240, 5.9%, 90%)",
  ring: "hsl(240, 5.9%, 10%)",
} as const;

const darkColors = {
  background: "hsl(240, 10%, 3.9%)",
  foreground: "hsl(0, 0%, 98%)",
  card: "hsl(240, 10%, 3.9%)",
  "card-foreground": "hsl(0, 0%, 98%)",
  popover: "hsl(240, 10%, 3.9%)",
  "popover-foreground": "hsl(0, 0%, 98%)",
  primary: "hsl(0, 0%, 98%)",
  "primary-foreground": "hsl(240, 5.9%, 10%)",
  secondary: "hsl(240, 3.7%, 15.9%)",
  "secondary-foreground": "hsl(0, 0%, 98%)",
  muted: "hsl(240, 3.7%, 15.9%)",
  "muted-foreground": "hsl(240, 5%, 64.9%)",
  accent: "hsl(240, 3.7%, 15.9%)",
  "accent-foreground": "hsl(0, 0%, 98%)",
  destructive: "hsl(0, 72.2%, 50.6%)",
  "destructive-foreground": "hsl(0, 0%, 98%)",
  success: "hsl(142.1, 70.6%, 45.3%)",
  "success-foreground": "hsl(0, 0%, 98%)",
  warning: "hsl(60, 100%, 50.2%)",
  "warning-foreground": "hsl(0, 0%, 98%)",
  error: "hsl(0, 72.2%, 50.6%)",
  "error-foreground": "hsl(0, 0%, 98%)",
  info: "hsl(213.1, 93.9%, 67.8%)",
  "info-foreground": "hsl(0, 0%, 98%)",
  purple: "hsl(271, 91%, 65%)",
  "purple-foreground": "hsl(0, 0%, 98%)",
  border: "hsl(240, 3.7%, 15.9%)",
  input: "hsl(240, 3.7%, 15.9%)",
  ring: "hsl(240, 4.9%, 83.9%)",
} as const;

export type ColorName = keyof typeof lightColors;

const getColor = (
  colorName: ColorName,
  colorScheme?: "light" | "dark",
): string => {
  const colors = colorScheme === "dark" ? darkColors : lightColors;
  return colors[colorName];
};

// Hook to get colors based on current theme
export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const themeColorScheme = colorScheme === "dark" ? "dark" : "light";

  return {
    getColor: (colorName: ColorName) => getColor(colorName, themeColorScheme),
    colorScheme: themeColorScheme,
  };
};

export const useThemedScreenOptions = () => {
  const { getColor } = useThemeColors();

  return {
    headerStyle: {
      backgroundColor: getColor("background"),
    },
    headerTintColor: getColor("foreground"),
    contentStyle: {
      backgroundColor: "transparent",
    },
  };
};

export const handleApiError = ({
  router,
  error,
}: {
  router: ReturnType<typeof useRouter>;
  error: ApiErrorResult["error"];
}) => {
  if (error.type === "UnauthorizedError") {
    void signOut();
    router.push("/auth/login");
  }
  return null;
};

/**
 * Hook to get the correct bottom insets for UI elements.
 * Returns two values for different use cases:
 * - sheetInset: For bottom sheets
 * - keyboardOffset: For keyboard sticky views
 */
export const useBottomInset = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const safeAreaInsets = useSafeAreaInsets();

  const sheetInset =
    Platform.OS === "ios" && !Platform.isPad ? tabBarHeight : 0;

  const keyboardOffset =
    Platform.OS === "ios" && !Platform.isPad
      ? tabBarHeight
      : safeAreaInsets.bottom;

  return {
    sheetInset,
    keyboardOffset,
    tabBarHeight,
    safeAreaInsets,
  };
};
