// ============================================================================
// Zod Schemas - Shared between API and Client
// ============================================================================

import { z } from "zod/v4";

import { CURRENCY_CODES, SPLIT_METHODS } from "./types";
import { validateSplits } from "./validation";

/**
 * Shared split schema - used by both client forms and API
 * percentage is in basis points (0-10000 = 0-100%)
 */
export const expenseSplitSchema = z.object({
  groupMemberId: z.number(),
  amountInCents: z.number().int(),
  percentage: z.number().int().min(0).max(10000).nullable(),
});

/**
 * Split method enum
 */
export const splitMethodSchema = z.enum(SPLIT_METHODS);

export const currencyCodeSchema = z.enum(CURRENCY_CODES);

/**
 * Shared expense base fields - common between create and update
 */
export const expenseSchema = z
  .object({
    paidByGroupMemberId: z.number().min(1, "Please select who paid"),
    amountInCents: z.number().int().min(1, "Amount must be greater than 0"),
    currency: currencyCodeSchema,
    description: z.string().max(512).optional(),
    category: z.string().max(100).optional(),
    expenseDate: z.date(),
    splits: z
      .array(expenseSplitSchema)
      .min(1, "At least one person must be included"),
    splitMethod: splitMethodSchema,
  })
  .refine(
    (data) => {
      const validation = validateSplits({
        splits: data.splits,
        totalAmountCents: data.amountInCents,
        method: data.splitMethod,
      });
      return validation.isValid;
    },
    {
      message: "Split amounts are invalid",
      path: ["splits"],
    },
  );

export type ExpenseValues = z.infer<typeof expenseSchema>;

/**
 * Schema for creating a new expense - used by both client and API
 */
export const createExpenseSchema = expenseSchema.safeExtend({
  groupId: z.number(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Schema for updating an expense - used by both client and API
 */
export const updateExpenseSchema = expenseSchema.partial().safeExtend({
  expenseId: z.number(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/**
 * Schema for settlement form
 */
export const settlementFormSchema = z.object({
  amountInCents: z.number().min(1, "Amount must be greater than 0"),
  fromGroupMemberId: z.number().min(1, "Please select who is paying"),
  toGroupMemberId: z.number().min(1, "Please select who is receiving"),
  currency: currencyCodeSchema,
});

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
