import { Effect } from "effect";
import { z } from "zod/v4";

import { and, eq, gte, sql } from "@flatsby/db";
import {
  chatMessages,
  conversations,
  expenses,
  shoppingListItems,
  shoppingLists,
} from "@flatsby/db/schema";

import { withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { OperationUtils, safeDbOperation } from "../utils";

function thirtyDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

const homeStatsInputSchema = z.object({
  groupId: z.number(),
});

export const statsRouter = createTRPCRouter({
  getHomeStats: protectedProcedure
    .input(homeStatsInputSchema)
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            safeDbOperation(async () => {
              const cutoffDate = thirtyDaysAgo();

              const [spendingResult, itemsCompletedResult, chatMessagesResult] =
                await Promise.all([
                  ctx.db
                    .select({
                      total: sql<string>`coalesce(sum(${expenses.amountInCents}), 0)`,
                      currency: expenses.currency,
                    })
                    .from(expenses)
                    .where(
                      and(
                        eq(expenses.groupId, input.groupId),
                        gte(expenses.expenseDate, cutoffDate),
                      ),
                    )
                    .groupBy(expenses.currency),

                  ctx.db
                    .select({
                      count: sql<string>`count(*)`,
                    })
                    .from(shoppingListItems)
                    .innerJoin(
                      shoppingLists,
                      eq(shoppingListItems.shoppingListId, shoppingLists.id),
                    )
                    .where(
                      and(
                        eq(shoppingLists.groupId, input.groupId),
                        eq(shoppingListItems.completed, true),
                        gte(shoppingListItems.completedAt, cutoffDate),
                      ),
                    ),

                  ctx.db
                    .select({
                      count: sql<string>`count(*)`,
                    })
                    .from(chatMessages)
                    .innerJoin(
                      conversations,
                      eq(chatMessages.conversationId, conversations.id),
                    )
                    .where(
                      and(
                        eq(conversations.userId, ctx.session.user.id),
                        eq(chatMessages.role, "user"),
                        gte(chatMessages.createdAt, cutoffDate),
                      ),
                    ),
                ]);

              const spending = spendingResult.map((row) => ({
                totalInCents: parseInt(row.total, 10),
                currency: row.currency,
              }));

              const itemsCompleted = parseInt(
                itemsCompletedResult[0]?.count ?? "0",
                10,
              );

              const messagesCount = parseInt(
                chatMessagesResult[0]?.count ?? "0",
                10,
              );

              return {
                spending,
                itemsCompleted,
                chatMessages: messagesCount,
              };
            }, "fetch home stats"),
        ),
      );
    }),
});
