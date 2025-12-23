import { z } from "zod/v4";

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
