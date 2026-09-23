import { z } from "zod/v4";

export const categoryIds = [
  "produce",
  "meat-seafood",
  "dairy",
  "bakery",
  "frozen-foods",
  "beverages",
  "snacks",
  "pantry",
  "personal-care",
  "household",
  "other",
] as const;

const categoryIdSet = new Set<string>(categoryIds);
export function isCategoryId(value: string): value is CategoryId {
  return categoryIdSet.has(value);
}

export function isCategoryIdWithAiAutoSelect(
  value: string,
): value is CategoryIdWithAiAutoSelect {
  return categorysIdWithAiAutoSelect.includes(
    value as CategoryIdWithAiAutoSelect,
  );
}

export type CategoryId = (typeof categoryIds)[number];

export const categorysIdWithAiAutoSelect = [
  ...categoryIds,
  "ai-auto-select",
] as const;

export type CategoryIdWithAiAutoSelect =
  (typeof categorysIdWithAiAutoSelect)[number];

export const categoryIdSchema = z.enum(categoryIds);

export const categorysIdWithAiAutoSelectSchema = z.enum(
  categorysIdWithAiAutoSelect,
);

export const categoryCountsSchema = z.object({
  counts: z.record(categoryIdSchema, z.number().optional()),
  total: z.number(),
});

export const categoryNames: Record<CategoryIdWithAiAutoSelect, string> = {
  "ai-auto-select": "AI Auto Select",
  produce: "Produce",
  "meat-seafood": "Meat & Fish",
  dairy: "Dairy",
  bakery: "Bakery",
  "frozen-foods": "Frozen Foods",
  beverages: "Beverages",
  snacks: "Snacks",
  pantry: "Pantry",
  "personal-care": "Personal Care",
  household: "Household",
  other: "Other",
};

export const categoryDescriptions: Record<CategoryIdWithAiAutoSelect, string> =
  {
    "ai-auto-select":
      "AI will select the most appropriate category for the item",
    produce: "Fruits, vegetables, fresh herbs",
    "meat-seafood": "Beef, chicken, pork, fish, seafood",
    dairy: "Milk, cheese, yogurt, eggs",
    bakery: "Bread, cakes, pastries, muffins",
    "frozen-foods": "Frozen dinners, pizza, ice cream",
    beverages: "Coffee, tea, soda, juice, water",
    snacks: "Chips, crackers, nuts, candy, chocolate",
    pantry: "Pasta, rice, cereal, soups, vegetables, sauces",
    "personal-care": "Soap, lotions, deodorant, toothpaste, floss",
    household: "Paper towels, tissues, cleaners, supplies",
    other: "Other",
  };
