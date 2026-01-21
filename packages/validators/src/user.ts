import { z } from "zod/v4";

import { chatModelSchema } from "./models";

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
  lastChatModelUsed: chatModelSchema.optional(),
  lastShoppingListToolsEnabled: z.boolean().optional().nullable(),
  lastExpenseToolsEnabled: z.boolean().optional().nullable(),
  // Legal consent tracking
  termsAcceptedAt: z.date().optional().nullable(),
  termsVersion: z.string().optional().nullable(),
  privacyAcceptedAt: z.date().optional().nullable(),
  privacyVersion: z.string().optional().nullable(),
});
export type User = z.infer<typeof userSchema>;

/**
 * Schema for user name form validation
 * Used for updating user names
 */
export const updateUserNameFormSchema = userSchema.pick({ name: true });
export type UpdateUserNameFormValues = z.infer<typeof updateUserNameFormSchema>;

/**
 * Schema for updating legal consent
 * Used when user accepts terms and/or privacy policy
 */
export const updateConsentInputSchema = z.object({
  termsAccepted: z.boolean(),
  privacyAccepted: z.boolean(),
  version: z.string().max(20),
});
export type UpdateConsentInput = z.infer<typeof updateConsentInputSchema>;

/**
 * Schema for GDPR user data export response
 */
export const userDataExportSchema = z.object({
  exportedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string(),
    termsAcceptedAt: z.string().nullable(),
    termsVersion: z.string().nullable(),
    privacyAcceptedAt: z.string().nullable(),
    privacyVersion: z.string().nullable(),
  }),
  groups: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      role: z.string(),
      joinedOn: z.string(),
    }),
  ),
  shoppingLists: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      groupId: z.number(),
      itemsCount: z.number(),
    }),
  ),
  expenses: z.array(
    z.object({
      id: z.number(),
      description: z.string().nullable(),
      amountInCents: z.number(),
      currency: z.string(),
      expenseDate: z.string(),
      groupId: z.number(),
    }),
  ),
  conversations: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      createdAt: z.string(),
      messageCount: z.number(),
    }),
  ),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;
