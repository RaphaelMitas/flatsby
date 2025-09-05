import { Effect } from "effect";
import z from "zod/v4";

import { expensePayers, expenses, expenseSplits } from "@flatsby/db/schema";
import {
  createExpenseSchema,
  groupWithAccessSchema,
} from "@flatsby/validators";

import { getApiResultZod, withErrorHandlingAsResult } from "../errors";
import { calculateOwedAmounts } from "../split/calculations";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DbUtils, GroupUtils, OperationUtils } from "../utils";

export const split = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;
    return user;
  }),

  getExpenses: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .output(getApiResultZod(z.object({ group: groupWithAccessSchema })))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.map(
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          (group) => {
            return {
              group: group,
            };
          },
        ),
      );
    }),

  createExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify user is member of group
          GroupUtils.requireMemberAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            DbUtils.transaction(async (trx) => {
              const {
                createdByGroupMemberId,
                currency,
                groupId,
                occurredAt,
                paidBy,
                participants,
                splitMethod,
                title,
                totalAmountCents,
                description,
              } = input;
              const [expense] = await trx
                .insert(expenses)
                .values({
                  createdByGroupMemberId,
                  currency,
                  groupId,
                  occurredAt,
                  splitMethod,
                  title,
                  totalAmountCents,
                  description,
                })
                .returning({ id: expenses.id });

              if (!expense) {
                throw new Error("Failed to create expense");
              }

              const owed = calculateOwedAmounts({
                totalAmountCents,
                splitMethod,
                participants,
              });

              await trx.insert(expenseSplits).values(
                owed.map((o) => ({
                  expenseId: expense.id,
                  groupMemberId: o.groupMemberId,
                  owedAmountCents: o.owedAmountCents,
                  rawValue: o.rawValue,
                })),
              );

              await trx.insert(expensePayers).values(
                paidBy.map((p) => ({
                  expenseId: expense.id,
                  groupMemberId: p.groupMemberId,
                  amountCents: p.amountCents,
                })),
              );

              return expense;
            }, "create expense")(ctx.db),
        ),
      );
    }),
});
