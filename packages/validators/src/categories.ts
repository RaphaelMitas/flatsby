import z from "zod/v4";

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

export const categorysIdWithAiAutoSelectSchema = z.enum(
  categorysIdWithAiAutoSelect,
);
