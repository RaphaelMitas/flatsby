// NativeWind safelist — ensures Tailwind generates styles for all category color
// classes. NativeWind only scans files inside the Metro bundle's source dirs, so
// classes defined in packages/validators/ are invisible without this file.
//
// Keep in sync with packages/validators/src/expenses/category-colors.ts

export const _dependencies = [
  // ---- text (default) ----
  "text-primary",
  "text-green-600 dark:text-green-300",
  "text-red-600 dark:text-red-300",
  "text-blue-600 dark:text-blue-300",
  "text-orange-600 dark:text-orange-300",
  "text-cyan-600 dark:text-cyan-300",
  "text-purple-600 dark:text-purple-300",
  "text-yellow-600 dark:text-yellow-300",
  "text-pink-600 dark:text-pink-300",
  "text-gray-600 dark:text-gray-300",
  "text-zinc-600 dark:text-zinc-300",
  // ---- text (inverted) ----
  "text-green-300 dark:text-green-600",
  "text-red-300 dark:text-red-600",
  "text-blue-300 dark:text-blue-600",
  "text-orange-300 dark:text-orange-600",
  "text-cyan-300 dark:text-cyan-600",
  "text-purple-300 dark:text-purple-600",
  "text-yellow-300 dark:text-yellow-600",
  "text-pink-300 dark:text-pink-600",
  "text-gray-300 dark:text-gray-600",
  "text-zinc-300 dark:text-zinc-600",
  // ---- background ----
  "bg-primary/10",
  "bg-orange-100 dark:bg-orange-900/30",
  "bg-blue-100 dark:bg-blue-900/30",
  "bg-cyan-100 dark:bg-cyan-900/30",
  "bg-pink-100 dark:bg-pink-900/30",
  "bg-purple-100 dark:bg-purple-900/30",
  "bg-gray-100 dark:bg-gray-900/30",
  "bg-red-100 dark:bg-red-900/30",
  "bg-green-100 dark:bg-green-900/30",
  "bg-yellow-100 dark:bg-yellow-900/30",
  "bg-zinc-100 dark:bg-zinc-900/30",
  // ---- border ----
  "border-primary/40",
  "border-orange-300 dark:border-orange-700",
  "border-blue-300 dark:border-blue-700",
  "border-cyan-300 dark:border-cyan-700",
  "border-pink-300 dark:border-pink-700",
  "border-purple-300 dark:border-purple-700",
  "border-gray-300 dark:border-gray-700",
  "border-red-300 dark:border-red-700",
  "border-green-300 dark:border-green-700",
  "border-yellow-300 dark:border-yellow-700",
  "border-zinc-300 dark:border-zinc-700",
] as const;
