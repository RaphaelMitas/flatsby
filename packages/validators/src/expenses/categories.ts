import type { MessageKey } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

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

const subcategoryDefinitions = [
  // food-drinks
  {
    id: "restaurant",
    group: "food-drinks",
    icon: "utensils",
  },
  { id: "coffee", group: "food-drinks", icon: "coffee" },
  { id: "bar", group: "food-drinks", icon: "wine" },
  {
    id: "groceries",
    group: "food-drinks",
    icon: "shopping-cart",
  },
  {
    id: "fast-food",
    group: "food-drinks",
    icon: "pizza",
  },
  {
    id: "other-food-drinks",
    group: "food-drinks",
    icon: "circle-ellipsis",
  },
  // transport
  {
    id: "ride-sharing",
    group: "transport",
    icon: "car",
  },
  {
    id: "public-transit",
    group: "transport",
    icon: "train-front",
  },
  { id: "gas", group: "transport", icon: "fuel" },
  {
    id: "parking",
    group: "transport",
    icon: "square-parking",
  },
  {
    id: "taxi",
    group: "transport",
    icon: "car-taxi-front",
  },
  {
    id: "other-transport",
    group: "transport",
    icon: "circle-ellipsis",
  },
  // shopping
  { id: "clothes", group: "shopping", icon: "shirt" },
  {
    id: "electronics",
    group: "shopping",
    icon: "smartphone",
  },
  {
    id: "home-goods",
    group: "shopping",
    icon: "lamp",
  },
  {
    id: "other-shopping",
    group: "shopping",
    icon: "circle-ellipsis",
  },
  // entertainment
  {
    id: "movies",
    group: "entertainment",
    icon: "clapperboard",
  },
  {
    id: "games",
    group: "entertainment",
    icon: "gamepad-2",
  },
  {
    id: "sports",
    group: "entertainment",
    icon: "dumbbell",
  },
  {
    id: "events",
    group: "entertainment",
    icon: "ticket",
  },
  { id: "music", group: "entertainment", icon: "music" },
  {
    id: "other-entertainment",
    group: "entertainment",
    icon: "circle-ellipsis",
  },
  // housing
  { id: "rent", group: "housing", icon: "house" },
  {
    id: "maintenance",
    group: "housing",
    icon: "wrench",
  },
  {
    id: "furniture",
    group: "housing",
    icon: "armchair",
  },
  {
    id: "other-housing",
    group: "housing",
    icon: "circle-ellipsis",
  },
  // utilities
  { id: "electric", group: "utilities", icon: "zap" },
  { id: "water", group: "utilities", icon: "droplets" },
  { id: "internet", group: "utilities", icon: "wifi" },
  { id: "phone", group: "utilities", icon: "phone" },
  {
    id: "other-utilities",
    group: "utilities",
    icon: "circle-ellipsis",
  },
  // health
  {
    id: "doctor",
    group: "health",
    icon: "stethoscope",
  },
  { id: "pharmacy", group: "health", icon: "pill" },
  { id: "gym", group: "health", icon: "dumbbell" },
  {
    id: "other-health",
    group: "health",
    icon: "circle-ellipsis",
  },
  // travel
  { id: "hotel", group: "travel", icon: "bed" },
  { id: "flight", group: "travel", icon: "plane" },
  {
    id: "activities",
    group: "travel",
    icon: "map-pin",
  },
  {
    id: "other-travel",
    group: "travel",
    icon: "circle-ellipsis",
  },
  // subscriptions
  {
    id: "streaming",
    group: "subscriptions",
    icon: "tv",
  },
  {
    id: "software",
    group: "subscriptions",
    icon: "app-window",
  },
  {
    id: "membership",
    group: "subscriptions",
    icon: "id-card",
  },
  {
    id: "other-subscriptions",
    group: "subscriptions",
    icon: "circle-ellipsis",
  },
  // education
  {
    id: "courses",
    group: "education",
    icon: "graduation-cap",
  },
  { id: "books", group: "education", icon: "book-open" },
  {
    id: "other-education",
    group: "education",
    icon: "circle-ellipsis",
  },
  // gifts
  { id: "gift", group: "gifts", icon: "gift" },
  {
    id: "donation",
    group: "gifts",
    icon: "heart-handshake",
  },
  {
    id: "other-gifts",
    group: "gifts",
    icon: "circle-ellipsis",
  },
  // other
  { id: "other", group: "other", icon: "circle-help" },
] as const;

export type ExpenseSubcategoryId =
  (typeof subcategoryDefinitions)[number]["id"];

export const expenseSubcategories = subcategoryDefinitions;

// Build the enum tuple at the type level for z.enum
const firstSubId = subcategoryDefinitions[0].id;
const restSubIds = subcategoryDefinitions.slice(1).map((s) => s.id);
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

export function getSubcategoryGroup(
  subcategoryId: string | undefined,
): ExpenseCategoryGroup {
  return subcategoryRecord[subcategoryId ?? "other"]?.group ?? "other";
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

export function expenseCategoryLabelKeys(subcategoryId: string): {
  name: MessageKey;
  description: MessageKey;
} {
  if (subcategoryId === AI_AUTO_DETECT) {
    return {
      name: msg("expenseCategories.aiAutoDetect"),
      description: msg("expenseCategories.aiAutoDetectDescription"),
    };
  }
  const id = isExpenseSubcategoryId(subcategoryId) ? subcategoryId : "other";
  return {
    name: msg(`expenseCategories.subcategories.${id}`),
    description: msg(`expenseCategories.groups.${getSubcategoryGroup(id)}`),
  };
}
