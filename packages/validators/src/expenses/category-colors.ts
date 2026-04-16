// ============================================================================
// Shared category color maps (Tailwind class strings)
// Used by both web (Next.js) and mobile (Expo/NativeWind)
// ============================================================================

export const categoryColorKeys = [
  "primary",
  "orange",
  "blue",
  "cyan",
  "pink",
  "purple",
  "gray",
  "red",
  "green",
  "yellow",
  "zinc",
] as const;

export type CategoryColorKey = (typeof categoryColorKeys)[number];
export type CategoryColorVariant = "default" | "inverted";

const categoryColorKeySet = new Set<string>(categoryColorKeys);

export function isCategoryColorKey(value: string): value is CategoryColorKey {
  return categoryColorKeySet.has(value);
}

// ---- Text colors (with variant support for inverted backgrounds) -----------

export const categoryTextColorMap: Record<
  CategoryColorKey,
  Record<CategoryColorVariant, string>
> = {
  primary: {
    default: "text-primary",
    inverted: "text-primary",
  },
  green: {
    default: "text-green-600 dark:text-green-300",
    inverted: "text-green-300 dark:text-green-600",
  },
  red: {
    default: "text-red-600 dark:text-red-300",
    inverted: "text-red-300 dark:text-red-600",
  },
  blue: {
    default: "text-blue-600 dark:text-blue-300",
    inverted: "text-blue-300 dark:text-blue-600",
  },
  orange: {
    default: "text-orange-600 dark:text-orange-300",
    inverted: "text-orange-300 dark:text-orange-600",
  },
  cyan: {
    default: "text-cyan-600 dark:text-cyan-300",
    inverted: "text-cyan-300 dark:text-cyan-600",
  },
  purple: {
    default: "text-purple-600 dark:text-purple-300",
    inverted: "text-purple-300 dark:text-purple-600",
  },
  yellow: {
    default: "text-yellow-600 dark:text-yellow-300",
    inverted: "text-yellow-300 dark:text-yellow-600",
  },
  pink: {
    default: "text-pink-600 dark:text-pink-300",
    inverted: "text-pink-300 dark:text-pink-600",
  },
  gray: {
    default: "text-gray-600 dark:text-gray-300",
    inverted: "text-gray-300 dark:text-gray-600",
  },
  zinc: {
    default: "text-zinc-600 dark:text-zinc-300",
    inverted: "text-zinc-300 dark:text-zinc-600",
  },
};

export function getCategoryTextColor(
  colorKey: CategoryColorKey,
  variant: CategoryColorVariant = "default",
): string {
  return categoryTextColorMap[colorKey][variant];
}

// ---- Background colors -----------------------------------------------------

export const categoryBgColorMap: Record<CategoryColorKey, string> = {
  primary: "bg-primary/10",
  orange: "bg-orange-100 dark:bg-orange-900/30",
  blue: "bg-blue-100 dark:bg-blue-900/30",
  cyan: "bg-cyan-100 dark:bg-cyan-900/30",
  pink: "bg-pink-100 dark:bg-pink-900/30",
  purple: "bg-purple-100 dark:bg-purple-900/30",
  gray: "bg-gray-100 dark:bg-gray-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
  green: "bg-green-100 dark:bg-green-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
  zinc: "bg-zinc-100 dark:bg-zinc-900/30",
};

// ---- Border colors ---------------------------------------------------------

export const categoryBorderColorMap: Record<CategoryColorKey, string> = {
  primary: "border-primary/40",
  orange: "border-orange-300 dark:border-orange-700",
  blue: "border-blue-300 dark:border-blue-700",
  cyan: "border-cyan-300 dark:border-cyan-700",
  pink: "border-pink-300 dark:border-pink-700",
  purple: "border-purple-300 dark:border-purple-700",
  gray: "border-gray-300 dark:border-gray-700",
  red: "border-red-300 dark:border-red-700",
  green: "border-green-300 dark:border-green-700",
  yellow: "border-yellow-300 dark:border-yellow-700",
  zinc: "border-zinc-300 dark:border-zinc-700",
};

// ---- Native color values (hex) for React Native style props -----------------
// These bypass NativeWind's class scanning and work reliably on all devices.

export interface NativeCategoryColors {
  text: { light: string; dark: string };
  bg: { light: string; dark: string };
  border: { light: string; dark: string };
}

export const categoryNativeColorMap: Record<
  CategoryColorKey,
  NativeCategoryColors
> = {
  primary: {
    text: { light: "#18181b", dark: "#fafafa" },
    bg: { light: "rgba(24,24,27,0.1)", dark: "rgba(250,250,250,0.1)" },
    border: { light: "rgba(24,24,27,0.4)", dark: "rgba(250,250,250,0.4)" },
  },
  green: {
    text: { light: "#16a34a", dark: "#86efac" },
    bg: { light: "#dcfce7", dark: "rgba(20,83,45,0.3)" },
    border: { light: "#86efac", dark: "#15803d" },
  },
  red: {
    text: { light: "#dc2626", dark: "#fca5a5" },
    bg: { light: "#fee2e2", dark: "rgba(127,29,29,0.3)" },
    border: { light: "#fca5a5", dark: "#b91c1c" },
  },
  blue: {
    text: { light: "#2563eb", dark: "#93c5fd" },
    bg: { light: "#dbeafe", dark: "rgba(30,58,138,0.3)" },
    border: { light: "#93c5fd", dark: "#1d4ed8" },
  },
  orange: {
    text: { light: "#ea580c", dark: "#fdba74" },
    bg: { light: "#ffedd5", dark: "rgba(124,45,18,0.3)" },
    border: { light: "#fdba74", dark: "#c2410c" },
  },
  cyan: {
    text: { light: "#0891b2", dark: "#67e8f9" },
    bg: { light: "#cffafe", dark: "rgba(22,78,99,0.3)" },
    border: { light: "#67e8f9", dark: "#0e7490" },
  },
  purple: {
    text: { light: "#9333ea", dark: "#d8b4fe" },
    bg: { light: "#f3e8ff", dark: "rgba(88,28,135,0.3)" },
    border: { light: "#d8b4fe", dark: "#7e22ce" },
  },
  yellow: {
    text: { light: "#ca8a04", dark: "#fde047" },
    bg: { light: "#fef9c3", dark: "rgba(113,63,18,0.3)" },
    border: { light: "#fde047", dark: "#a16207" },
  },
  pink: {
    text: { light: "#db2777", dark: "#f9a8d4" },
    bg: { light: "#fce7f3", dark: "rgba(131,24,67,0.3)" },
    border: { light: "#f9a8d4", dark: "#be185d" },
  },
  gray: {
    text: { light: "#4b5563", dark: "#d1d5db" },
    bg: { light: "#f3f4f6", dark: "rgba(17,24,39,0.3)" },
    border: { light: "#d1d5db", dark: "#374151" },
  },
  zinc: {
    text: { light: "#52525b", dark: "#d4d4d8" },
    bg: { light: "#f4f4f5", dark: "rgba(24,24,27,0.3)" },
    border: { light: "#d4d4d8", dark: "#3f3f46" },
  },
};

export function getNativeCategoryColor(
  colorKey: CategoryColorKey,
  isDark: boolean,
): { text: string; bg: string; border: string } {
  const colors = categoryNativeColorMap[colorKey];
  const mode = isDark ? "dark" : "light";
  return {
    text: colors.text[mode],
    bg: colors.bg[mode],
    border: colors.border[mode],
  };
}
