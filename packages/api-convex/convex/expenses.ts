import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import {
  requireAuth,
  requireGroupMember,
  getGroupMembership,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "./helpers";

// Split method type
type SplitMethod = "equal" | "itemized" | "percentage";

// Split input type
interface SplitInput {
  groupMemberId: Id<"groupMembers">;
  amountInCents: number;
  percentage?: number;
}

/**
 * Validate that splits sum to the expense amount
 */
function validateExpenseSplits(
  expenseAmountInCents: number,
  splits: SplitInput[],
  splitMethod: SplitMethod
): void {
  if (splits.length === 0) {
    throw new ValidationError("splits", "At least one split is required");
  }

  const totalSplitAmount = splits.reduce(
    (sum, split) => sum + split.amountInCents,
    0
  );

  // Allow small rounding differences (up to 1 cent per split)
  const allowedDifference = splits.length;

  if (Math.abs(totalSplitAmount - expenseAmountInCents) > allowedDifference) {
    throw new ValidationError(
      "splits",
      `Split amounts must sum to expense amount. Expected ${expenseAmountInCents}, got ${totalSplitAmount}`
    );
  }

  // Validate percentages if using percentage split
  if (splitMethod === "percentage") {
    const totalPercentage = splits.reduce(
      (sum, split) => sum + (split.percentage ?? 0),
      0
    );
    // Percentages are in basis points (0-10000)
    if (Math.abs(totalPercentage - 10000) > 1) {
      throw new ValidationError(
        "splits",
        "Percentages must sum to 100%"
      );
    }
  }
}

/**
 * Calculate debts between group members
 */
function calculateDebts(
  expenses: Array<{
    paidByGroupMemberId: Id<"groupMembers">;
    amountInCents: number;
    currency: string;
    expenseSplits: Array<{
      groupMemberId: Id<"groupMembers">;
      amountInCents: number;
    }>;
  }>
) {
  // Track net balance per member per currency
  // Positive = owed money, Negative = owes money
  const balances = new Map<string, Map<Id<"groupMembers">, number>>();

  for (const expense of expenses) {
    const currency = expense.currency;

    if (!balances.has(currency)) {
      balances.set(currency, new Map());
    }

    const currencyBalances = balances.get(currency)!;

    // The payer paid the full amount
    const payerBalance = currencyBalances.get(expense.paidByGroupMemberId) ?? 0;
    currencyBalances.set(
      expense.paidByGroupMemberId,
      payerBalance + expense.amountInCents
    );

    // Each person in the split owes their share
    for (const split of expense.expenseSplits) {
      const memberBalance = currencyBalances.get(split.groupMemberId) ?? 0;
      currencyBalances.set(
        split.groupMemberId,
        memberBalance - split.amountInCents
      );
    }
  }

  // Convert balances to debt pairs
  const debts: Array<{
    from: Id<"groupMembers">;
    to: Id<"groupMembers">;
    amountInCents: number;
    currency: string;
  }> = [];

  for (const [currency, currencyBalances] of balances) {
    const creditors: Array<{ memberId: Id<"groupMembers">; amount: number }> = [];
    const debtors: Array<{ memberId: Id<"groupMembers">; amount: number }> = [];

    for (const [memberId, balance] of currencyBalances) {
      if (balance > 0) {
        creditors.push({ memberId, amount: balance });
      } else if (balance < 0) {
        debtors.push({ memberId, amount: -balance });
      }
    }

    // Match debtors with creditors
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]!;
      const creditor = creditors[j]!;

      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0) {
        debts.push({
          from: debtor.memberId,
          to: creditor.memberId,
          amountInCents: amount,
          currency,
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }
  }

  return debts;
}

/**
 * Create a new expense with splits
 */
export const createExpense = mutation({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
    paidByGroupMemberId: v.id("groupMembers"),
    amountInCents: v.number(),
    currency: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    expenseDate: v.optional(v.number()),
    splitMethod: v.union(
      v.literal("equal"),
      v.literal("itemized"),
      v.literal("percentage")
    ),
    splits: v.array(
      v.object({
        groupMemberId: v.id("groupMembers"),
        amountInCents: v.number(),
        percentage: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    const currentMember = await requireGroupMember(ctx, args.groupId, user._id);

    // Validate splits
    validateExpenseSplits(args.amountInCents, args.splits, args.splitMethod);

    // Verify payer is in the group
    const payer = await ctx.db.get(args.paidByGroupMemberId);
    if (!payer || payer.groupId !== args.groupId) {
      throw new NotFoundError("group member (payer)");
    }

    // Verify all split members are in the group
    for (const split of args.splits) {
      const member = await ctx.db.get(split.groupMemberId);
      if (!member || member.groupId !== args.groupId) {
        throw new NotFoundError("group member (split)");
      }
    }

    // Create expense
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      paidByGroupMemberId: args.paidByGroupMemberId,
      amountInCents: args.amountInCents,
      currency: args.currency,
      description: args.description,
      category: args.category,
      expenseDate: args.expenseDate ?? Date.now(),
      createdByGroupMemberId: currentMember._id,
      splitMethod: args.splitMethod,
    });

    // Create splits
    for (const split of args.splits) {
      await ctx.db.insert("expenseSplits", {
        expenseId,
        groupMemberId: split.groupMemberId,
        amountInCents: split.amountInCents,
        percentage: split.percentage,
      });
    }

    return expenseId;
  },
});

/**
 * Update an expense
 */
export const updateExpense = mutation({
  args: {
    sessionToken: v.string(),
    expenseId: v.id("expenses"),
    paidByGroupMemberId: v.optional(v.id("groupMembers")),
    amountInCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    expenseDate: v.optional(v.number()),
    splitMethod: v.optional(
      v.union(
        v.literal("equal"),
        v.literal("itemized"),
        v.literal("percentage")
      )
    ),
    splits: v.optional(
      v.array(
        v.object({
          groupMemberId: v.id("groupMembers"),
          amountInCents: v.number(),
          percentage: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new NotFoundError("expense");
    }

    await requireGroupMember(ctx, expense.groupId, user._id);

    // Validate splits if provided
    if (args.splits) {
      const amount = args.amountInCents ?? expense.amountInCents;
      const method = args.splitMethod ?? expense.splitMethod;
      validateExpenseSplits(amount, args.splits, method);

      // Verify all split members are in the group
      for (const split of args.splits) {
        const member = await ctx.db.get(split.groupMemberId);
        if (!member || member.groupId !== expense.groupId) {
          throw new NotFoundError("group member (split)");
        }
      }
    }

    // Verify payer if updating
    if (args.paidByGroupMemberId) {
      const payer = await ctx.db.get(args.paidByGroupMemberId);
      if (!payer || payer.groupId !== expense.groupId) {
        throw new NotFoundError("group member (payer)");
      }
    }

    // Update expense
    const updates: Record<string, unknown> = {};
    if (args.paidByGroupMemberId !== undefined)
      updates.paidByGroupMemberId = args.paidByGroupMemberId;
    if (args.amountInCents !== undefined)
      updates.amountInCents = args.amountInCents;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.expenseDate !== undefined) updates.expenseDate = args.expenseDate;
    if (args.splitMethod !== undefined) updates.splitMethod = args.splitMethod;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.expenseId, updates);
    }

    // Update splits if provided
    if (args.splits) {
      // Delete existing splits
      const existingSplits = await ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
        .collect();

      for (const split of existingSplits) {
        await ctx.db.delete(split._id);
      }

      // Create new splits
      for (const split of args.splits) {
        await ctx.db.insert("expenseSplits", {
          expenseId: args.expenseId,
          groupMemberId: split.groupMemberId,
          amountInCents: split.amountInCents,
          percentage: split.percentage,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Delete an expense
 */
export const deleteExpense = mutation({
  args: {
    sessionToken: v.string(),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new NotFoundError("expense");
    }

    await requireGroupMember(ctx, expense.groupId, user._id);

    // Delete splits first
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    for (const split of splits) {
      await ctx.db.delete(split._id);
    }

    // Delete expense
    await ctx.db.delete(args.expenseId);

    return { success: true };
  },
});

/**
 * Get a single expense with full details
 */
export const getExpense = query({
  args: {
    sessionToken: v.string(),
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new NotFoundError("expense");
    }

    await requireGroupMember(ctx, expense.groupId, user._id);

    // Get payer info
    const paidByMember = await ctx.db.get(expense.paidByGroupMemberId);
    const paidByUser = paidByMember
      ? await ctx.db.get(paidByMember.userId)
      : null;

    // Get creator info
    const createdByMember = await ctx.db.get(expense.createdByGroupMemberId);
    const createdByUser = createdByMember
      ? await ctx.db.get(createdByMember.userId)
      : null;

    // Get splits with member info
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    const splitsWithUsers = await Promise.all(
      splits.map(async (split) => {
        const member = await ctx.db.get(split.groupMemberId);
        const memberUser = member ? await ctx.db.get(member.userId) : null;

        return {
          ...split,
          id: split._id,
          groupMember: member
            ? {
                id: member._id,
                user: memberUser
                  ? {
                      email: memberUser.email,
                      name: memberUser.name,
                      image: memberUser.image,
                    }
                  : null,
              }
            : null,
        };
      })
    );

    return {
      ...expense,
      id: expense._id,
      createdAt: expense._creationTime,
      paidByGroupMember: paidByMember
        ? {
            ...paidByMember,
            id: paidByMember._id,
            user: paidByUser
              ? {
                  email: paidByUser.email,
                  name: paidByUser.name,
                  image: paidByUser.image,
                }
              : null,
          }
        : null,
      createdByGroupMember: createdByMember
        ? {
            ...createdByMember,
            id: createdByMember._id,
            user: createdByUser
              ? {
                  email: createdByUser.email,
                  name: createdByUser.name,
                  image: createdByUser.image,
                }
              : null,
          }
        : null,
      expenseSplits: splitsWithUsers,
    };
  },
});

/**
 * Get all expenses for a group with pagination
 */
export const getGroupExpenses = query({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupMember(ctx, args.groupId, user._id);

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(limit + 1);

    const hasMore = expenses.length > limit;
    const items = hasMore ? expenses.slice(0, limit) : expenses;
    const nextCursor = hasMore ? items[items.length - 1]?._id : undefined;

    // Get full details for each expense
    const expensesWithDetails = await Promise.all(
      items.map(async (expense) => {
        const paidByMember = await ctx.db.get(expense.paidByGroupMemberId);
        const paidByUser = paidByMember
          ? await ctx.db.get(paidByMember.userId)
          : null;

        const createdByMember = await ctx.db.get(expense.createdByGroupMemberId);
        const createdByUser = createdByMember
          ? await ctx.db.get(createdByMember.userId)
          : null;

        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();

        const splitsWithUsers = await Promise.all(
          splits.map(async (split) => {
            const member = await ctx.db.get(split.groupMemberId);
            const memberUser = member ? await ctx.db.get(member.userId) : null;

            return {
              ...split,
              id: split._id,
              groupMember: {
                id: member?._id,
                user: memberUser
                  ? {
                      email: memberUser.email,
                      name: memberUser.name,
                      image: memberUser.image,
                    }
                  : null,
              },
            };
          })
        );

        return {
          ...expense,
          id: expense._id,
          createdAt: expense._creationTime,
          paidByGroupMember: {
            id: paidByMember?._id,
            user: paidByUser
              ? {
                  email: paidByUser.email,
                  name: paidByUser.name,
                  image: paidByUser.image,
                }
              : null,
          },
          createdByGroupMember: {
            id: createdByMember?._id,
            user: createdByUser
              ? {
                  email: createdByUser.email,
                  name: createdByUser.name,
                  image: createdByUser.image,
                }
              : null,
          },
          expenseSplits: splitsWithUsers,
        };
      })
    );

    return {
      items: expensesWithDetails,
      nextCursor,
    };
  },
});

/**
 * Get debts between group members
 */
export const getGroupDebts = query({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupMember(ctx, args.groupId, user._id);

    // Get all expenses for the group
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get splits for each expense
    const expensesWithSplits = await Promise.all(
      expenses.map(async (expense) => {
        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();

        return {
          paidByGroupMemberId: expense.paidByGroupMemberId,
          amountInCents: expense.amountInCents,
          currency: expense.currency,
          expenseSplits: splits.map((s) => ({
            groupMemberId: s.groupMemberId,
            amountInCents: s.amountInCents,
          })),
        };
      })
    );

    const debts = calculateDebts(expensesWithSplits);

    // Enrich debts with user info
    const debtsWithUsers = await Promise.all(
      debts.map(async (debt) => {
        const fromMember = await ctx.db.get(debt.from);
        const fromUser = fromMember ? await ctx.db.get(fromMember.userId) : null;

        const toMember = await ctx.db.get(debt.to);
        const toUser = toMember ? await ctx.db.get(toMember.userId) : null;

        return {
          ...debt,
          fromUser: fromUser
            ? { id: fromUser._id, name: fromUser.name, email: fromUser.email }
            : null,
          toUser: toUser
            ? { id: toUser._id, name: toUser.name, email: toUser.email }
            : null,
        };
      })
    );

    return debtsWithUsers;
  },
});
