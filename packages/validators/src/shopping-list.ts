import { z } from "zod/v4";

import { categorysIdWithAiAutoSelectSchema } from "./categories";

/**
 * Schema for validating shopping list name
 * - Minimum length: 1 character
 * - Maximum length: 256 characters
 */
export const shoppingListNameSchema = z
  .string()
  .min(1, {
    message: "Shopping list name is required",
  })
  .max(32, {
    message: "Shopping list name cannot be longer than 32 characters",
  });
export const shoppingListIconSchema = z
  .string()
  .min(1, {
    message: "Shopping list icon cannot be empty",
  })
  .max(32, {
    message: "Shopping list icon cannot be longer than 32 characters",
  })
  .optional();
export const shoppingListDescriptionSchema = z
  .string()
  .min(1, {
    message: "Shopping list description cannot be empty",
  })
  .max(256, {
    message: "Shopping list description cannot be longer than 256 characters",
  })
  .optional();

/**
 * Schema for shopping list name form validation
 * Used for creating and renaming shopping lists
 */
export const shoppingListFormSchema = z.object({
  name: shoppingListNameSchema,
  icon: shoppingListIconSchema,
  description: shoppingListDescriptionSchema,
});

/**
 * Schema for validating shopping list item name
 * - Minimum length: 1 character
 * - Maximum length: 256 characters
 */
export const shoppingListItemNameSchema = z
  .string()
  .min(1, {
    message: "Shopping list item name cannot be empty",
  })
  .max(64, {
    message: "Shopping list item name cannot be longer than 64 characters",
  });

export const shoppingListItemSchema = z.object({
  id: z.number(),
  name: shoppingListItemNameSchema,
  categoryId: categorysIdWithAiAutoSelectSchema,
  createdAt: z.date(),
  completed: z.boolean(),
  createdByGroupMemberId: z.number().nullable(),
  completedByGroupMemberId: z.number().nullable(),
  completedAt: z.date().nullable(),
  isPending: z.boolean().optional(),
});
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

/**
 * Schema for shopping list item form validation
 * Used for adding items to shopping lists
 */
export const createShoppingListItemFormSchema = shoppingListItemSchema.pick({
  name: true,
  categoryId: true,
});
export type CreateShoppingListItemFormValues = z.infer<
  typeof createShoppingListItemFormSchema
>;

/**
 * Schema for shopping list item edit form validation
 * Used for editing items in shopping lists
 */
export const editShoppingListItemFormSchema = shoppingListItemSchema.pick({
  name: true,
  categoryId: true,
  completed: true,
});
export type EditShoppingListItemFormValues = z.infer<
  typeof editShoppingListItemFormSchema
>;
