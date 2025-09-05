import z from "zod/v4";

import { groupSchema } from "./group";

export const getExpenseSchema = z.object({
  group: groupSchema,
});

const groupMemberId = z.number().int().positive();
export const SplitMethodSchema = z.enum([
  "equal",
  "exact",
  "percent",
  "shares",
]);

export const currencySchema = z.enum(["EUR", "USD", "GBP"]);

export const createExpenseSchema = z
  .object({
    groupId: z.number().int().positive(),
    createdByGroupMemberId: groupMemberId,
    title: z.string().min(1).max(256),
    description: z.string().optional(),
    totalAmountCents: z.number().int().positive(),
    currency: currencySchema,
    occurredAt: z.coerce.date(),
    splitMethod: SplitMethodSchema,
    paidBy: z
      .array(
        z.object({
          groupMemberId,
          amountCents: z.number().int().nonnegative(),
        }),
      )
      .min(1),

    // For "equal": participants = [{ groupMemberId }] (value omitted)
    // For "exact": value = amountCents
    // For "percent": value = basis points (0..10000), must total 10000
    // For "shares": value = positive shares count
    participants: z
      .array(
        z.object({
          groupMemberId,
          value: z.number().int().nonnegative().optional(),
        }),
      )
      .min(1),
  })
  .check(({ value, issues }) => {
    const paidSum = value.paidBy.reduce((s, p) => s + p.amountCents, 0);
    if (paidSum !== value.totalAmountCents) {
      issues.push({
        input: value,
        code: "custom",
        message: "Sum of paidBy must equal totalAmountCents",
        path: ["paidBy"],
      });
    }

    const participantIds = new Set(
      value.participants.map((p) => p.groupMemberId),
    );
    if (participantIds.size !== value.participants.length) {
      issues.push({
        input: value,
        code: "custom",
        message: "Duplicate participant",
        path: ["participants"],
      });
    }

    if (value.splitMethod === "exact") {
      const sum = value.participants.reduce((s, p) => s + (p.value ?? 0), 0);
      if (sum !== value.totalAmountCents) {
        issues.push({
          input: value,
          code: "custom",
          message: "Exact values must sum to totalAmountCents",
          path: ["participants"],
        });
      }
      if (value.participants.some((p) => p.value === undefined)) {
        issues.push({
          input: value,
          code: "custom",
          message: "Exact requires value per participant",
          path: ["participants"],
        });
      }
    }

    if (value.splitMethod === "percent") {
      const sumBps = value.participants.reduce(
        (s, p) => s + (p.value ?? -1),
        0,
      );
      if (sumBps !== 10000) {
        issues.push({
          input: value,
          code: "custom",
          message: "Percent values must total 10000 bps (100%)",
          path: ["participants"],
        });
      }
      if (value.participants.some((p) => p.value === undefined)) {
        issues.push({
          input: value,
          code: "custom",
          message: "Percent requires value per participant (bps)",
          path: ["participants"],
        });
      }
    }

    if (value.splitMethod === "shares") {
      const hasInvalid = value.participants.some((p) => (p.value ?? 0) <= 0);
      if (hasInvalid) {
        issues.push({
          input: value,
          code: "custom",
          message: "Shares must be positive integers",
          path: ["participants"],
        });
      }
      if (value.participants.some((p) => p.value === undefined)) {
        issues.push({
          input: value,
          code: "custom",
          message: "Shares requires value per participant",
          path: ["participants"],
        });
      }
    }

    // equal requires no values
    if (
      value.splitMethod === "equal" &&
      value.participants.some((p) => p.value !== undefined)
    ) {
      issues.push({
        input: value,
        code: "custom",
        message: "Equal splits must not include values",
        path: ["participants"],
      });
    }
  });

// Export helpful TS types
export type SplitMethod = z.infer<typeof SplitMethodSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type SplitParticipantInput = CreateExpenseInput["participants"][number];
