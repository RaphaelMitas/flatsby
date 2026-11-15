import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import {
  categoryIdSchema,
  categorysIdWithAiAutoSelectSchema,
} from "./categories";

export const shoppingListNameSchema = z
  .string()
  .min(1, {
    message: msg("shoppingList.validation.nameRequired"),
  })
  .max(32, {
    message: msg("shoppingList.validation.nameTooLong"),
  });

export const shoppingListIconSchema = z
  .string()
  .min(1, {
    message: msg("shoppingList.validation.iconRequired"),
  })
  .max(32, {
    message: msg("shoppingList.validation.iconInvalid"),
  })
  .optional()
  .nullable();

export const shoppingListDescriptionSchema = z
  .string()
  .min(1, {
    message: msg("shoppingList.validation.descriptionRequired"),
  })
  .max(256, {
    message: msg("shoppingList.validation.descriptionTooLong"),
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

export const shoppingListFormSchema = shoppingListSchema.pick({
  name: true,
  icon: true,
  description: true,
});
export type ShoppingListFormValues = z.infer<typeof shoppingListFormSchema>;

export const shoppingListItemNameSchema = z
  .string()
  .min(1, {
    message: msg("shoppingList.validation.itemNameRequired"),
  })
  .max(64, {
    message: msg("shoppingList.validation.itemNameTooLong"),
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

export const createShoppingListItemFormSchema = shoppingListItemSchema.pick({
  name: true,
  categoryId: true,
});
export type CreateShoppingListItemFormValues = z.infer<
  typeof createShoppingListItemFormSchema
>;

export const editShoppingListItemFormSchema = shoppingListItemSchema.pick({
  name: true,
  categoryId: true,
  completed: true,
});
export type EditShoppingListItemFormValues = z.infer<
  typeof editShoppingListItemFormSchema
>;

export const suggestItemsSchema = z.object({
  groupId: z.number(),
  query: z.string().min(1).max(64),
});

export const suggestItemsOutputSchema = z.object({
  name: shoppingListItemNameSchema,
  frequency: z.number(),
  categoryId: categoryIdSchema,
});
