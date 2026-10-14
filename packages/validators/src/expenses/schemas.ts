// ============================================================================
// Zod Schemas - Shared between API and Client
// ============================================================================

import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import { expenseSubcategoryIdSchema } from "./categories";
import { CURRENCY_CODES, MAX_SHARES, SPLIT_METHODS } from "./types";
import { validateSplits } from "./validation";

/**
 * Shared split schema - used by both client forms and API
 * percentage is in basis points (0-10000 = 0-100%)
 */
export const expenseSplitSchema = z.object({
  groupMemberId: z.number(),
  amountInCents: z.number().int(),
  percentage: z.number().int().min(0).max(10000).nullable(),
  shares: z.number().int().min(1).max(MAX_SHARES).nullish(),
});

export const splitMethodSchema = z.enum(SPLIT_METHODS);

export const currencyCodeSchema = z.enum(CURRENCY_CODES);

export const expenseSchema = z.object({
  paidByGroupMemberId: z
    .number()
    .min(1, msg("expenses.validation.selectPayer")),
  amountInCents: z
    .number()
    .int()
    .min(1, msg("expenses.validation.amountPositive")),
  currency: currencyCodeSchema,
  description: z.string().max(512),
  subcategory: expenseSubcategoryIdSchema.optional(),
  expenseDate: z.date(),
  splits: z
    .array(expenseSplitSchema)
    .min(1, msg("expenses.validation.atLeastOnePerson")),
  splitMethod: splitMethodSchema,
});
export const expenseSchemaWithValidateSplits = expenseSchema.refine(
  (data) => {
    const validation = validateSplits({
      splits: data.splits,
      totalAmountCents: data.amountInCents,
      method: data.splitMethod,
    });
    return validation.isValid;
  },
  {
    message: msg("expenses.validation.splitAmountsInvalid"),
    path: ["splits"],
  },
);

export type ExpenseValues = z.infer<typeof expenseSchemaWithValidateSplits>;

export const createExpenseSchema = expenseSchemaWithValidateSplits.safeExtend({
  groupId: z.number(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = expenseSchema
  .partial()
  .refine(
    (data) => {
      if (!data.splits) {
        return true;
      }
      if (data.amountInCents === undefined || data.splitMethod === undefined) {
        return true;
      }
      const validation = validateSplits({
        splits: data.splits,
        totalAmountCents: data.amountInCents,
        method: data.splitMethod,
      });
      return validation.isValid;
    },
    {
      message: msg("expenses.validation.splitAmountsInvalid"),
      path: ["splits"],
    },
  )
  .safeExtend({
    expenseId: z.number(),
  });

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const deleteExpenseSchema = z.object({
  expenseId: updateExpenseSchema.shape.expenseId,
});

export const settlementFormSchema = z
  .object({
    amountInCents: z.number().min(1, msg("expenses.validation.amountPositive")),
    fromGroupMemberId: z
      .number()
      .min(1, msg("expenses.validation.selectSender")),
    toGroupMemberId: z
      .number()
      .min(1, msg("expenses.validation.selectRecipient")),
    currency: currencyCodeSchema,
  })
  .refine((values) => values.fromGroupMemberId !== values.toGroupMemberId, {
    path: ["toGroupMemberId"],
    message: msg("expenses.validation.pickTwoPeople"),
  });

export type SettlementFormValues = z.infer<typeof settlementFormSchema>;

export const getPairActivityInputSchema = z.object({
  groupId: z.number(),
  groupMemberIds: z
    .tuple([z.number(), z.number()])
    .refine(([a, b]) => a !== b, msg("expenses.validation.pickTwoMembers")),
  cursor: z.object({ date: z.date(), id: z.number() }).optional(),
});

export const pairActivityItemSchema = z.object({
  id: z.number(),
  description: z.string(),
  expenseDate: z.date(),
  currency: z.string(),
  paidByGroupMemberId: z.number(),
  amountInCents: z.number().int(),
  /** The non-payer's split: what this expense moved between the two */
  pairAmountInCents: z.number().int(),
  isSettlement: z.boolean(),
});

export type PairActivityItem = z.infer<typeof pairActivityItemSchema>;

export const pairActivitySchema = z.object({
  items: z.array(pairActivityItemSchema),
  nextCursor: z.object({ date: z.date(), id: z.number() }).optional(),
});
