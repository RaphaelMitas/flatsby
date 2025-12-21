import { Effect } from "effect";
import { z } from "zod/v4";

import { and, eq } from "@flatsby/db";
import { expenses, expenseSplits, groupMembers } from "@flatsby/db/schema";

import type { GroupDebtSummary } from "../types";
import { withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  DbUtils,
  ExpenseUtils,
  GroupUtils,
  OperationUtils,
  safeDbOperation,
} from "../utils";

// ISO 4217 currency codes (common ones)
const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "INR",
  "NZD",
  "SGD",
  "HKD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "MXN",
  "BRL",
  "ZAR",
  "KRW",
] as const;

const expenseSplitSchema = z.object({
  groupMemberId: z.number(),
  amountInCents: z.number().int().min(1),
  percentage: z.number().int().min(0).max(10000).optional(), // basis points (0-10000 = 0-100%)
});

export const expenseRouter = createTRPCRouter({
  createExpense: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        paidByGroupMemberId: z.number(),
        amountInCents: z.number().int().min(1),
        currency: z.enum(CURRENCY_CODES),
        description: z.string().max(512).optional(),
        category: z.string().max(100).optional(),
        expenseDate: z.date().optional(),
        splits: z.array(expenseSplitSchema).min(1),
        isSettlement: z.boolean(),
      }),
    )
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
              ExpenseUtils.validateExpenseSplits(
                input.amountInCents,
                input.splits,
                input.isSettlement,
              ),
              () =>
                Effect.flatMap(
                  // Verify paidByGroupMemberId is in the group
                  DbUtils.findOneOrFail(
                    () =>
                      ctx.db.query.groupMembers.findFirst({
                        where: and(
                          eq(groupMembers.id, input.paidByGroupMemberId),
                          eq(groupMembers.groupId, input.groupId),
                        ),
                      }),
                    "group member",
                  ),
                  () =>
                    Effect.flatMap(
                      // Verify all split groupMemberIds are in the group
                      Effect.forEach(
                        input.splits,
                        (split) =>
                          DbUtils.findOneOrFail(
                            () =>
                              ctx.db.query.groupMembers.findFirst({
                                where: and(
                                  eq(groupMembers.id, split.groupMemberId),
                                  eq(groupMembers.groupId, input.groupId),
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
                                  expenseDate: input.expenseDate ?? new Date(),
                                  createdByGroupMemberId:
                                    currentUserGroupMember.id,
                                  isSettlement: input.isSettlement,
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
    .input(
      z.object({
        expenseId: z.number(),
        paidByGroupMemberId: z.number().optional(),
        amountInCents: z.number().int().min(1).optional(),
        currency: z.enum(CURRENCY_CODES).optional(),
        description: z.string().max(512).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        expenseDate: z.date().optional(),
        splits: z.array(expenseSplitSchema).min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get expense with group access check
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
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
                    ? ExpenseUtils.validateExpenseSplits(
                        input.amountInCents,
                        input.splits,
                        expense.isSettlement,
                      )
                    : input.splits && !input.amountInCents
                      ? ExpenseUtils.validateExpenseSplits(
                          expense.amountInCents,
                          input.splits,
                          expense.isSettlement,
                        )
                      : Effect.succeed(undefined),
                  () =>
                    Effect.flatMap(
                      // Verify group members if updating
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
          // Get expense with group access check
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
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
          // Get expense with group access check
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.expenses.findFirst({
                where: eq(expenses.id, input.expenseId),
                with: {
                  group: {
                    with: {
                      groupMembers: {
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
                safeDbOperation(
                  () =>
                    ctx.db.query.expenses.findFirst({
                      where: eq(expenses.id, input.expenseId),
                      with: {
                        paidByGroupMember: {
                          with: {
                            user: {
                              columns: { email: true, name: true, image: true },
                            },
                          },
                        },
                        createdByGroupMember: {
                          with: {
                            user: {
                              columns: { email: true, name: true, image: true },
                            },
                          },
                        },
                        expenseSplits: {
                          with: {
                            groupMember: {
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
                  "fetch expense",
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
                orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
                with: {
                  paidByGroupMember: {
                    with: {
                      user: {
                        columns: { email: true, name: true, image: true },
                      },
                    },
                  },
                  createdByGroupMember: {
                    with: {
                      user: {
                        columns: { email: true, name: true, image: true },
                      },
                    },
                  },
                  expenseSplits: {
                    with: {
                      groupMember: {
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

        // Calculate debts
        const debtSummary = ExpenseUtils.calculateDebts(result.data);
        return { success: true as const, data: debtSummary };
      });
    }),

  getMemberDebts: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        groupMemberId: z.number(),
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
            // Verify groupMemberId is in the group
            Effect.flatMap(
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.groupMembers.findFirst({
                    where: and(
                      eq(groupMembers.id, input.groupMemberId),
                      eq(groupMembers.groupId, input.groupId),
                    ),
                  }),
                "group member",
              ),
              () =>
                // Get all expenses and calculate debts
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
                  "fetch expenses for member debt calculation",
                ),
            ),
        ),
      ).then((result) => {
        if (!result.success) {
          return result;
        }

        // Calculate debts and filter for this member
        const debtSummary = ExpenseUtils.calculateDebts(result.data);
        const memberBalances =
          debtSummary.memberBalances[input.groupMemberId] ?? {};
        const memberDebts: GroupDebtSummary["currencies"] = {};

        for (const [currency, summary] of Object.entries(
          debtSummary.currencies,
        )) {
          const memberDebtsForCurrency = summary.debts.filter(
            (debt) =>
              debt.fromGroupMemberId === input.groupMemberId ||
              debt.toGroupMemberId === input.groupMemberId,
          );
          if (memberDebtsForCurrency.length > 0) {
            memberDebts[currency] = {
              debts: memberDebtsForCurrency,
              currency,
            };
          }
        }

        return {
          success: true as const,
          data: {
            currencies: memberDebts,
            memberBalances: { [input.groupMemberId]: memberBalances },
          },
        };
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

        // Calculate debts
        const debtSummary = ExpenseUtils.calculateDebts(result.data);
        return { success: true as const, data: debtSummary };
      });
    }),
});
