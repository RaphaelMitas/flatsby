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
