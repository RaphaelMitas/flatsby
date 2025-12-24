import { z } from "zod/v4";

export const userNameSchema = z
  .string()
  .min(1, {
    message: "User name cannot be empty",
  })
  .max(256, {
    message: "User name cannot be longer than 256 characters",
  });

export const userEmailSchema = z.email({
  message: "Please enter a valid email address",
});

export const userImageSchema = z.string().optional().nullable();

export const userSchema = z.object({
  id: z.string(),
  name: userNameSchema,
  email: userEmailSchema,
  emailVerified: z.boolean(),
  image: userImageSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  lastGroupUsed: z.number().optional().nullable(),
  lastShoppingListUsed: z.number().optional().nullable(),
});
export type User = z.infer<typeof userSchema>;

/**
 * Schema for user name form validation
 * Used for updating user names
 */
export const updateUserNameFormSchema = userSchema.pick({ name: true });
export type UpdateUserNameFormValues = z.infer<typeof updateUserNameFormSchema>;
