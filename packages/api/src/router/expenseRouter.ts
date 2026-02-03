import type { SplitMethod } from "@flatsby/validators/expenses/types";
import { Effect } from "effect";
import { z } from "zod/v4";

import { and, eq } from "@flatsby/db";
import { expenses, expenseSplits, groupMembers } from "@flatsby/db/schema";
import { calculateDebts } from "@flatsby/validators/expenses/debt";
import {
  createExpenseSchema,
  splitMethodSchema,
  updateExpenseSchema,
} from "@flatsby/validators/expenses/schemas";
import { validateExpenseSplitsStrict } from "@flatsby/validators/expenses/validation";

import type { ApiError } from "../errors";
import { fail, withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DbUtils, GroupUtils, OperationUtils, safeDbOperation } from "../utils";

/**
 * Wrapper to convert validateExpenseSplitsStrict result to Effect
 */
function validateExpenseSplitsEffect(
  expenseAmountInCents: number,
  splits: { amountInCents: number }[],
  splitMethod: SplitMethod,
): Effect.Effect<void, ApiError> {
  const result = validateExpenseSplitsStrict(
    expenseAmountInCents,
    splits,
    splitMethod,
  );

  if (result.valid) {
    return Effect.succeed(undefined);
  }

  return fail.validation("splits", result.error, result.userMessage);
}

export const expenseRouter = createTRPCRouter({
  createExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get group with access check
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            Effect.flatMap(
              // Validate splits sum to expense amount
              validateExpenseSplitsEffect(
                input.amountInCents,
                input.splits,
                input.splitMethod,
              ),
              () =>
                Effect.flatMap(
                  // Verify paidByGroupMemberId is an active member of the group
                  DbUtils.findOneOrFail(
                    () =>
                      ctx.db.query.groupMembers.findFirst({
                        where: and(
                          eq(groupMembers.id, input.paidByGroupMemberId),
                          eq(groupMembers.groupId, input.groupId),
                          eq(groupMembers.isActive, true),
                        ),
                      }),
                    "group member",
                  ),
                  () =>
                    Effect.flatMap(
                      // Verify all split groupMemberIds are active members of the group
                      Effect.forEach(
                        input.splits,
                        (split) =>
                          DbUtils.findOneOrFail(
                            () =>
                              ctx.db.query.groupMembers.findFirst({
                                where: and(
                                  eq(groupMembers.id, split.groupMemberId),
                                  eq(groupMembers.groupId, input.groupId),
                                  eq(groupMembers.isActive, true),
                                ),
                              }),
                            "group member",
                          ),
                        { concurrency: "unbounded" },
                      ),
                      () =>
                        Effect.flatMap(
                          // Get current user's group member ID
                          GroupUtils.getBasicMembership(
                            ctx.db,
                            input.groupId,
                            ctx.session.user.id,
                          ),
                          (currentUserGroupMember) =>
                            // Create expense and splits in transaction
                            DbUtils.transaction(async (trx) => {
                              const expenseResult = await trx
                                .insert(expenses)
                                .values({
                                  groupId: input.groupId,
                                  paidByGroupMemberId:
                                    input.paidByGroupMemberId,
                                  amountInCents: input.amountInCents,
                                  currency: input.currency,
                                  description: input.description,
                                  category: input.category,
                                  expenseDate: input.expenseDate,
                                  createdByGroupMemberId:
                                    currentUserGroupMember.id,
                                  splitMethod: input.splitMethod,
                                })
                                .returning();

                              const expense = expenseResult[0];
                              if (!expense) {
                                throw new Error("Failed to create expense");
                              }

                              await trx.insert(expenseSplits).values(
                                input.splits.map((split) => ({
                                  expenseId: expense.id,
                                  groupMemberId: split.groupMemberId,
                                  amountInCents: split.amountInCents,
                                  percentage: split.percentage,
                                })),
                              );

                              return expense;
                            }, "create expense with splits")(ctx.db),
                        ),
                    ),
                ),
            ),
        ),
      );
    }),

  updateExpense: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get expense with group access check (filter active members only)
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                        columns: { userId: true },
                      },
                    },
                  },
                },
              }),
            "expense",
          ),
          (expense) =>
            Effect.flatMap(
              DbUtils.ensureGroupMember(
                ctx.session.user.id,
                expense.group.groupMembers,
                "You don't have access to this expense",
              ),
              () =>
                Effect.flatMap(
                  // If updating splits, validate they sum correctly
                  input.splits && input.amountInCents
                    ? validateExpenseSplitsEffect(
                        input.amountInCents,
                        input.splits,
                        input.splitMethod ??
                          splitMethodSchema.parse(expense.splitMethod),
                      )
                    : input.splits && !input.amountInCents
                      ? validateExpenseSplitsEffect(
                          expense.amountInCents,
                          input.splits,
                          input.splitMethod ??
                            splitMethodSchema.parse(expense.splitMethod),
                        )
                      : Effect.succeed(undefined),
                  () =>
                    Effect.flatMap(
                      // Verify group members if updating (must be active)
                      input.paidByGroupMemberId || input.splits
                        ? Effect.forEach(
                            [
                              ...(input.paidByGroupMemberId
                                ? [{ groupMemberId: input.paidByGroupMemberId }]
                                : []),
                              ...(input.splits
                                ? input.splits.map((s) => ({
                                    groupMemberId: s.groupMemberId,
                                  }))
                                : []),
                            ],
                            ({ groupMemberId }) =>
                              DbUtils.findOneOrFail(
                                () =>
                                  ctx.db.query.groupMembers.findFirst({
                                    where: and(
                                      eq(groupMembers.id, groupMemberId),
                                      eq(groupMembers.groupId, expense.groupId),
                                      eq(groupMembers.isActive, true),
                                    ),
                                  }),
                                "group member",
                              ),
                            { concurrency: "unbounded" },
                          )
                        : Effect.succeed(undefined),
                      () =>
                        // Update expense and splits in transaction
                        DbUtils.transaction(async (trx) => {
                          const updateData: Partial<
                            typeof expenses.$inferInsert
                          > = {};
                          if (input.paidByGroupMemberId !== undefined) {
                            updateData.paidByGroupMemberId =
                              input.paidByGroupMemberId;
                          }
                          if (input.amountInCents !== undefined) {
                            updateData.amountInCents = input.amountInCents;
                          }
                          if (input.currency !== undefined) {
                            updateData.currency = input.currency;
                          }
                          if (input.description !== undefined) {
                            updateData.description = input.description;
                          }
                          if (input.category !== undefined) {
                            updateData.category = input.category;
                          }
                          if (input.expenseDate !== undefined) {
                            updateData.expenseDate = input.expenseDate;
                          }
                          if (input.splitMethod !== undefined) {
                            updateData.splitMethod = input.splitMethod;
                          }

                          if (Object.keys(updateData).length > 0) {
                            await trx
                              .update(expenses)
                              .set(updateData)
                              .where(eq(expenses.id, input.expenseId));
                          }

                          // Update splits if provided
                          if (input.splits) {
                            // Delete existing splits
                            await trx
                              .delete(expenseSplits)
                              .where(
                                eq(expenseSplits.expenseId, input.expenseId),
                              );

                            // Insert new splits
                            await trx.insert(expenseSplits).values(
                              input.splits.map((split) => ({
                                expenseId: input.expenseId,
                                groupMemberId: split.groupMemberId,
                                amountInCents: split.amountInCents,
                                percentage: split.percentage,
                              })),
                            );
                          }

                          return { success: true };
                        }, "update expense")(ctx.db),
                    ),
                ),
            ),
        ),
      );
    }),

  deleteExpense: protectedProcedure
    .input(z.object({ expenseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get expense with group access check (filter active members only)
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                        columns: { userId: true },
                      },
                    },
                  },
                },
              }),
            "expense",
          ),
          (expense) =>
            Effect.flatMap(
              DbUtils.ensureGroupMember(
                ctx.session.user.id,
                expense.group.groupMembers,
                "You don't have access to this expense",
              ),
              () =>
                // Hard delete expense and its splits in transaction
                DbUtils.transaction(async (trx) => {
                  // Delete splits first (foreign key constraint)
                  await trx
                    .delete(expenseSplits)
                    .where(eq(expenseSplits.expenseId, input.expenseId));

                  // Delete expense
                  await trx
                    .delete(expenses)
                    .where(eq(expenses.id, input.expenseId));

                  return { success: true };
                }, "delete expense and splits")(ctx.db),
            ),
        ),
      );
    }),

  getExpense: protectedProcedure
    .input(z.object({ expenseId: z.number() }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get expense with group access check (filter active members only)
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                        columns: { userId: true },
                      },
                    },
                  },
                },
              }),
            "expense",
          ),
          (expense) =>
            Effect.flatMap(
              DbUtils.ensureGroupMember(
                ctx.session.user.id,
                expense.group.groupMembers,
                "You don't have access to this expense",
              ),
              () =>
                // Get full expense with splits and member info
                DbUtils.findOneOrFail(
                  () =>
                    ctx.db.query.expenses.findFirst({
                      where: eq(expenses.id, input.expenseId),
                      with: {
                        paidByGroupMember: {
                          columns: {
                            id: true,
                            groupId: true,
                            userId: true,
                            role: true,
                            joinedOn: true,
                          },
                          with: {
                            user: {
                              columns: { email: true, name: true, image: true },
                            },
                          },
                        },
                        createdByGroupMember: {
                          columns: {
                            id: true,
                            groupId: true,
                            userId: true,
                            role: true,
                            joinedOn: true,
                          },
                          with: {
                            user: {
                              columns: { email: true, name: true, image: true },
                            },
                          },
                        },
                        expenseSplits: {
                          with: {
                            groupMember: {
                              columns: {
                                id: true,
                                groupId: true,
                                userId: true,
                                role: true,
                                joinedOn: true,
                              },
                              with: {
                                user: {
                                  columns: {
                                    email: true,
                                    name: true,
                                    image: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    }),
                  "get expense",
                ),
            ),
        ),
      );
    }),

  getGroupExpenses: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        cursor: z.number().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get group with access check
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            // Get expenses with pagination
            safeDbOperation(async () => {
              const expensesList = await ctx.db.query.expenses.findMany({
                where: eq(expenses.groupId, input.groupId),
                limit: input.limit + 1,
                orderBy: (expenses, { desc }) => [
                  desc(expenses.expenseDate),
                  desc(expenses.createdAt),
                ],
                with: {
                  paidByGroupMember: {
                    columns: {
                      id: true,
                      groupId: true,
                      userId: true,
                      role: true,
                      joinedOn: true,
                    },
                    with: {
                      user: {
                        columns: { email: true, name: true, image: true },
                      },
                    },
                  },
                  createdByGroupMember: {
                    columns: {
                      id: true,
                      groupId: true,
                      userId: true,
                      role: true,
                      joinedOn: true,
                    },
                    with: {
                      user: {
                        columns: { email: true, name: true, image: true },
                      },
                    },
                  },
                  expenseSplits: {
                    with: {
                      groupMember: {
                        columns: {
                          id: true,
                          groupId: true,
                          userId: true,
                          role: true,
                          joinedOn: true,
                        },
                        with: {
                          user: {
                            columns: {
                              email: true,
                              name: true,
                              image: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              });

              const hasMore = expensesList.length > input.limit;
              const items = hasMore
                ? expensesList.slice(0, input.limit)
                : expensesList;
              const nextCursor = hasMore
                ? items[items.length - 1]?.id
                : undefined;

              return {
                items,
                nextCursor,
              };
            }, "fetch group expenses"),
        ),
      );
    }),

  getGroupDebts: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get group with access check
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            // Get all expenses for the group
            safeDbOperation(
              () =>
                ctx.db.query.expenses.findMany({
                  where: eq(expenses.groupId, input.groupId),
                  with: {
                    expenseSplits: {
                      columns: {
                        groupMemberId: true,
                        amountInCents: true,
                      },
                    },
                  },
                  columns: {
                    paidByGroupMemberId: true,
                    amountInCents: true,
                    currency: true,
                  },
                }),
              "fetch expenses for debt calculation",
            ),
        ),
      ).then((result) => {
        if (!result.success) {
          return result;
        }

        // Calculate debts using imported function
        const debtSummary = calculateDebts(result.data);
        return { success: true as const, data: debtSummary };
      });
    }),

  getDebtSummary: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get group with access check
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            // Get all expenses and calculate summary
            safeDbOperation(
              () =>
                ctx.db.query.expenses.findMany({
                  where: eq(expenses.groupId, input.groupId),
                  with: {
                    expenseSplits: {
                      columns: {
                        groupMemberId: true,
                        amountInCents: true,
                      },
                    },
                  },
                  columns: {
                    paidByGroupMemberId: true,
                    amountInCents: true,
                    currency: true,
                  },
                }),
              "fetch expenses for debt summary",
            ),
        ),
      ).then((result) => {
        if (!result.success) {
          return result;
        }

        // Calculate debts using imported function
        const debtSummary = calculateDebts(result.data);
        return { success: true as const, data: debtSummary };
      });
    }),
});
