// ============================================================================
// Zod Schemas - Shared between API and Client
// ============================================================================

import { z } from "zod/v4";

import { CURRENCY_CODES } from "./types";
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
 * Shared expense base fields - common between create and update
 */
const expenseBaseFields = {
  paidByGroupMemberId: z.number().min(1, "Please select who paid"),
  amountInCents: z.number().int().min(1, "Amount must be greater than 0"),
  currency: z.enum(CURRENCY_CODES),
  description: z.string().max(512).optional(),
  category: z.string().max(100).optional(),
  expenseDate: z.date(),
  splits: z
    .array(expenseSplitSchema)
    .min(1, "At least one person must be included"),
};

/**
 * Schema for creating a new expense - used by both client and API
 */
export const createExpenseSchema = z.object({
  ...expenseBaseFields,
  groupId: z.number(),
  isSettlement: z.boolean(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

/**
 * Schema for updating an expense - used by both client and API
 */
export const updateExpenseSchema = z.object({
  expenseId: z.number(),
  paidByGroupMemberId: z.number().optional(),
  amountInCents: z.number().int().min(1).optional(),
  currency: z.enum(CURRENCY_CODES).optional(),
  description: z.string().max(512).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  expenseDate: z.date().optional(),
  splits: z.array(expenseSplitSchema).min(1).optional(),
});

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

/**
 * Split method enum
 */
export const splitMethodSchema = z.enum(["equal", "percentage", "custom"]);

/**
 * Schema for expense form - extends base with splitMethod for UI
 */
export const expenseFormSchema = z
  .object({
    ...expenseBaseFields,
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

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/**
 * Schema for settlement form
 */
export const settlementFormSchema = z.object({
  amountInCents: z.number().min(1, "Amount must be greater than 0"),
});

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;
