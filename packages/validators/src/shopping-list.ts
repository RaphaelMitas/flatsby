import { z } from "zod/v4";

import { categorysIdWithAiAutoSelectSchema } from "./categories";

// Note: We use z.number() directly instead of groupSchema.shape.id to avoid
// circular dependency with group.ts (which imports from this file)

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
    message: "Shopping list icon is invalid",
  })
  .optional()
  .nullable();

export const shoppingListDescriptionSchema = z
  .string()
  .min(1, {
    message: "Shopping list description cannot be empty",
  })
  .max(256, {
    message: "Shopping list description cannot be longer than 256 characters",
  })
  .optional()
  .nullable();

export const shoppingListSchema = z.object({
  id: z.number(),
  name: shoppingListNameSchema,
  icon: shoppingListIconSchema,
  description: shoppingListDescriptionSchema,
  createdAt: z.date(),
});
export type ShoppingList = z.infer<typeof shoppingListSchema>;

export const createShoppingListSchema = shoppingListSchema
  .pick({
    name: true,
    icon: true,
    description: true,
  })
  .extend({
    groupId: z.number(),
  });

export const updateShoppingListSchema = shoppingListSchema
  .pick({
    name: true,
  })
  .extend({
    shoppingListId: shoppingListSchema.shape.id,
  });

export const deleteShoppingListSchema = z.object({
  shoppingListId: shoppingListSchema.shape.id,
  groupId: z.number(),
});

/**
 * Schema for shopping list name form validation
 * Used for creating and renaming shopping lists
 */
export const shoppingListFormSchema = shoppingListSchema.pick({
  name: true,
  icon: true,
  description: true,
});
export type ShoppingListFormValues = z.infer<typeof shoppingListFormSchema>;

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

export const createShoppingListItemSchema = shoppingListItemSchema
  .pick({
    name: true,
    categoryId: true,
  })
  .extend({
    groupId: z.number(),
    shoppingListId: shoppingListSchema.shape.id,
  });

export const updateShoppingListItemSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
  completed: true,
});

export const deleteShoppingListItemSchema = shoppingListItemSchema.pick({
  id: true,
});

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
