import { z } from "zod/v4";

import type { CategoryColorKey } from "./category-colors";

// ============================================================================
// Category Groups (determines color)
// ============================================================================

export const expenseCategoryGroups = [
  "food-drinks",
  "transport",
  "shopping",
  "entertainment",
  "housing",
  "utilities",
  "health",
  "travel",
  "subscriptions",
  "education",
  "gifts",
  "other",
] as const;

export type ExpenseCategoryGroup = (typeof expenseCategoryGroups)[number];
export const expenseCategoryGroupSchema = z.enum(expenseCategoryGroups);

export const expenseCategoryGroupLabels: Record<ExpenseCategoryGroup, string> =
  {
    "food-drinks": "Food & Drinks",
    transport: "Transport",
    shopping: "Shopping",
    entertainment: "Entertainment",
    housing: "Housing",
    utilities: "Utilities",
    health: "Health",
    travel: "Travel",
    subscriptions: "Subscriptions",
    education: "Education",
    gifts: "Gifts",
    other: "Other",
  };

/**
 * Maps each group to a color key matching the existing CATEGORY_COLORS palette
 * (text-{color}-600 dark:text-{color}-300 pastels)
 */
export const expenseCategoryGroupColorKeys: Record<
  ExpenseCategoryGroup,
  CategoryColorKey
> = {
  "food-drinks": "green",
  transport: "blue",
  shopping: "cyan",
  entertainment: "pink",
  housing: "purple",
  utilities: "gray",
  health: "red",
  travel: "blue",
  subscriptions: "orange",
  education: "yellow",
  gifts: "pink",
  other: "zinc",
};

// ============================================================================
// Subcategories (determines icon)
// ============================================================================

export const expenseSubcategories = [
  // food-drinks
  {
    id: "restaurant",
    group: "food-drinks",
    icon: "utensils",
    label: "Restaurant",
  },
  { id: "coffee", group: "food-drinks", icon: "coffee", label: "Coffee" },
  { id: "bar", group: "food-drinks", icon: "wine", label: "Bar" },
  {
    id: "groceries",
    group: "food-drinks",
    icon: "shopping-cart",
    label: "Groceries",
  },
  {
    id: "fast-food",
    group: "food-drinks",
    icon: "pizza",
    label: "Fast Food",
  },
  {
    id: "other-food-drinks",
    group: "food-drinks",
    icon: "circle-ellipsis",
    label: "Other Food & Drinks",
  },
  // transport
  {
    id: "ride-sharing",
    group: "transport",
    icon: "car",
    label: "Ride-sharing",
  },
  {
    id: "public-transit",
    group: "transport",
    icon: "train-front",
    label: "Public Transit",
  },
  { id: "gas", group: "transport", icon: "fuel", label: "Gas" },
  {
    id: "parking",
    group: "transport",
    icon: "square-parking",
    label: "Parking",
  },
  {
    id: "taxi",
    group: "transport",
    icon: "car-taxi-front",
    label: "Taxi",
  },
  {
    id: "other-transport",
    group: "transport",
    icon: "circle-ellipsis",
    label: "Other Transport",
  },
  // shopping
  { id: "clothes", group: "shopping", icon: "shirt", label: "Clothes" },
  {
    id: "electronics",
    group: "shopping",
    icon: "smartphone",
    label: "Electronics",
  },
  {
    id: "home-goods",
    group: "shopping",
    icon: "lamp",
    label: "Home Goods",
  },
  {
    id: "other-shopping",
    group: "shopping",
    icon: "circle-ellipsis",
    label: "Other Shopping",
  },
  // entertainment
  {
    id: "movies",
    group: "entertainment",
    icon: "clapperboard",
    label: "Movies",
  },
  {
    id: "games",
    group: "entertainment",
    icon: "gamepad-2",
    label: "Games",
  },
  {
    id: "sports",
    group: "entertainment",
    icon: "dumbbell",
    label: "Sports",
  },
  {
    id: "events",
    group: "entertainment",
    icon: "ticket",
    label: "Events",
  },
  { id: "music", group: "entertainment", icon: "music", label: "Music" },
  {
    id: "other-entertainment",
    group: "entertainment",
    icon: "circle-ellipsis",
    label: "Other Entertainment",
  },
  // housing
  { id: "rent", group: "housing", icon: "house", label: "Rent" },
  {
    id: "maintenance",
    group: "housing",
    icon: "wrench",
    label: "Maintenance",
  },
  {
    id: "furniture",
    group: "housing",
    icon: "armchair",
    label: "Furniture",
  },
  {
    id: "other-housing",
    group: "housing",
    icon: "circle-ellipsis",
    label: "Other Housing",
  },
  // utilities
  { id: "electric", group: "utilities", icon: "zap", label: "Electric" },
  { id: "water", group: "utilities", icon: "droplets", label: "Water" },
  { id: "internet", group: "utilities", icon: "wifi", label: "Internet" },
  { id: "phone", group: "utilities", icon: "phone", label: "Phone" },
  {
    id: "other-utilities",
    group: "utilities",
    icon: "circle-ellipsis",
    label: "Other Utilities",
  },
  // health
  {
    id: "doctor",
    group: "health",
    icon: "stethoscope",
    label: "Doctor",
  },
  { id: "pharmacy", group: "health", icon: "pill", label: "Pharmacy" },
  { id: "gym", group: "health", icon: "dumbbell", label: "Gym" },
  {
    id: "other-health",
    group: "health",
    icon: "circle-ellipsis",
    label: "Other Health",
  },
  // travel
  { id: "hotel", group: "travel", icon: "bed", label: "Hotel" },
  { id: "flight", group: "travel", icon: "plane", label: "Flight" },
  {
    id: "activities",
    group: "travel",
    icon: "map-pin",
    label: "Activities",
  },
  {
    id: "other-travel",
    group: "travel",
    icon: "circle-ellipsis",
    label: "Other Travel",
  },
  // subscriptions
  {
    id: "streaming",
    group: "subscriptions",
    icon: "tv",
    label: "Streaming",
  },
  {
    id: "software",
    group: "subscriptions",
    icon: "app-window",
    label: "Software",
  },
  {
    id: "membership",
    group: "subscriptions",
    icon: "id-card",
    label: "Membership",
  },
  {
    id: "other-subscriptions",
    group: "subscriptions",
    icon: "circle-ellipsis",
    label: "Other Subscriptions",
  },
  // education
  {
    id: "courses",
    group: "education",
    icon: "graduation-cap",
    label: "Courses",
  },
  { id: "books", group: "education", icon: "book-open", label: "Books" },
  {
    id: "other-education",
    group: "education",
    icon: "circle-ellipsis",
    label: "Other Education",
  },
  // gifts
  { id: "gift", group: "gifts", icon: "gift", label: "Gift" },
  {
    id: "donation",
    group: "gifts",
    icon: "heart-handshake",
    label: "Donation",
  },
  {
    id: "other-gifts",
    group: "gifts",
    icon: "circle-ellipsis",
    label: "Other Gifts",
  },
  // other
  { id: "other", group: "other", icon: "circle-help", label: "Other" },
] as const;

export type ExpenseSubcategoryId = (typeof expenseSubcategories)[number]["id"];

// Build the enum tuple at the type level for z.enum
const firstSubId = expenseSubcategories[0].id;
const restSubIds = expenseSubcategories.slice(1).map((s) => s.id);
export const expenseSubcategoryIdSchema = z.enum([firstSubId, ...restSubIds]);

// ============================================================================
// With AI Auto Detect (for picker UI, not stored in DB)
// ============================================================================

export const AI_AUTO_DETECT = "ai-auto-detect" as const;

export const expenseSubcategoryIdsWithAuto = [
  AI_AUTO_DETECT,
  ...expenseSubcategories.map((s) => s.id),
] as const;

export type ExpenseSubcategoryIdWithAuto =
  (typeof expenseSubcategoryIdsWithAuto)[number];

// ============================================================================
// Helpers
// ============================================================================

const subcategoryRecord: Record<string, (typeof expenseSubcategories)[number]> =
  Object.fromEntries(expenseSubcategories.map((s) => [s.id, s]));

const subcategoryIdSet = new Set<string>(expenseSubcategories.map((s) => s.id));

const categoryGroupSet = new Set<string>(expenseCategoryGroups);

export function getSubcategoryConfig(subcategoryId: string) {
  return subcategoryRecord[subcategoryId];
}

export function getSubcategoryGroup(
  subcategoryId: string,
): ExpenseCategoryGroup | undefined {
  const config = subcategoryRecord[subcategoryId];
  if (!config) return undefined;
  return config.group satisfies ExpenseCategoryGroup;
}

export function isExpenseSubcategoryId(
  value: string,
): value is ExpenseSubcategoryId {
  return subcategoryIdSet.has(value);
}

export function isExpenseCategoryGroup(
  value: string,
): value is ExpenseCategoryGroup {
  return categoryGroupSet.has(value);
}

export function coerceCategory(
  value: string | undefined | null,
): ExpenseCategoryGroup {
  if (value && isExpenseCategoryGroup(value)) return value;
  return "other";
}

export function coerceSubcategory(
  value: string | undefined | null,
): ExpenseSubcategoryId {
  if (value && isExpenseSubcategoryId(value)) return value;
  return "other";
}
