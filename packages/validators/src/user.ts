import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import { chatModelSchema } from "./models";

export const MAX_CONSENT_VERSION_LENGTH = 20;

export const userNameSchema = z
  .string()
  .min(1, {
    message: msg("settings.validation.nameRequired"),
  })
  .max(256, {
    message: msg("settings.validation.nameTooLong"),
  });

export const userEmailSchema = z.email({
  message: msg("settings.validation.emailInvalid"),
});

export const userImageSchema = z.string().optional().nullable();

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

// Gmail ignores dots in the local part
export function inboxOf(email: string) {
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  const untagged = local.split("+")[0] ?? "";
  return GMAIL_DOMAINS.has(domain)
    ? `${untagged.replaceAll(".", "")}@gmail.com`
    : `${untagged}@${domain}`;
}

// Email codes and Apple's hidden name bring no name, so the address's local part stands in
export const defaultUserName = (email: string) => email.split("@")[0] || email;

// Wide enough for a phone clock that runs a few minutes off
const JUST_CREATED_MS = 10 * 60 * 1000;

export interface SignedInUser {
  name: string;
  email: string;
  createdAt: Date;
}

export const asksForName = (user: SignedInUser, now = Date.now()) =>
  now - new Date(user.createdAt).getTime() < JUST_CREATED_MS &&
  user.name === defaultUserName(user.email);

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
  lastToolsEnabled: z.boolean().optional().nullable(),
  // Legal consent tracking
  termsAcceptedAt: z.date().optional().nullable(),
  termsVersion: z.string().optional().nullable(),
  privacyAcceptedAt: z.date().optional().nullable(),
  privacyVersion: z.string().optional().nullable(),
  aiConsentAcceptedAt: z.date().optional().nullable(),
  aiConsentVersion: z.string().optional().nullable(),
  analyticsOptOut: z.boolean().optional(),
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
  version: z.string().max(MAX_CONSENT_VERSION_LENGTH),
});
export type UpdateConsentInput = z.infer<typeof updateConsentInputSchema>;

/**
 * Schema for updating AI consent
 * Used when user accepts AI data sharing terms
 */
export const updateAIConsentInputSchema = z.object({
  accepted: z.boolean(),
  version: z.string().max(MAX_CONSENT_VERSION_LENGTH),
});
export type UpdateAIConsentInput = z.infer<typeof updateAIConsentInputSchema>;

/** Bump when the consent sheet's wording changes, so the log shows which text a choice was made on */
export const ANALYTICS_CONSENT_VERSION = "1";

export const analyticsConsentSchema = z.object({
  screens: z.boolean(),
  recordings: z.boolean(),
});
export type AnalyticsConsent = z.infer<typeof analyticsConsentSchema>;

export const logAnalyticsConsentInputSchema = analyticsConsentSchema.extend({
  version: z.string().max(MAX_CONSENT_VERSION_LENGTH),
  platform: z.enum(["ios", "android"]),
});

export const setAnalyticsOptOutInputSchema = z.object({ optOut: z.boolean() });

/**
 * Schema for GDPR user data export response
 */
export const userDataExportSchema = z.object({
  exportedAt: z.date(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    createdAt: z.date(),
    termsAcceptedAt: z.date().nullable(),
    termsVersion: z.string().nullable(),
    privacyAcceptedAt: z.date().nullable(),
    privacyVersion: z.string().nullable(),
    aiConsentAcceptedAt: z.date().nullable(),
    aiConsentVersion: z.string().nullable(),
    analyticsOptOut: z.boolean(),
    paypalHandle: z.string().nullable(),
  }),
  signInMethods: z.array(
    z.object({
      providerId: z.string(),
      accountId: z.string(),
      createdAt: z.date(),
    }),
  ),
  passkeys: z.array(
    z.object({
      name: z.string().nullable(),
      createdAt: z.date().nullable(),
      backedUp: z.boolean(),
    }),
  ),
  analyticsConsents: z.array(
    analyticsConsentSchema.extend({
      version: z.string(),
      platform: z.string(),
      createdAt: z.date(),
    }),
  ),
  sessions: z.array(
    z.object({
      createdAt: z.date(),
      expiresAt: z.date(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
    }),
  ),
  groups: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      memberId: z.number(),
      role: z.string(),
      joinedOn: z.date(),
      members: z.array(
        z.object({
          memberId: z.number(),
          name: z.string(),
          active: z.boolean(),
        }),
      ),
    }),
  ),
  shoppingLists: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      groupId: z.number(),
      items: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          categoryId: z.string(),
          completed: z.boolean(),
          createdAt: z.date(),
          completedAt: z.date().nullable(),
          createdByGroupMemberId: z.number().nullable(),
          completedByGroupMemberId: z.number().nullable(),
        }),
      ),
    }),
  ),
  expenses: z.array(
    z.object({
      id: z.number(),
      groupId: z.number(),
      description: z.string(),
      amountInCents: z.number(),
      currency: z.string(),
      category: z.string(),
      subcategory: z.string(),
      splitMethod: z.string(),
      expenseDate: z.date(),
      paidByGroupMemberId: z.number(),
      createdByGroupMemberId: z.number(),
      splits: z.array(
        z.object({
          groupMemberId: z.number(),
          amountInCents: z.number(),
          percentage: z.number().nullable(),
          shares: z.number().nullable(),
        }),
      ),
    }),
  ),
  conversations: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      systemPrompt: z.string().nullable(),
      createdAt: z.date(),
      messages: z.array(
        z.object({
          role: z.string(),
          content: z.string(),
          createdAt: z.date(),
        }),
      ),
    }),
  ),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;
