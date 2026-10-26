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

import { getGroupWithAccess } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { createTRPCRouter, protectedProcedure } from "../trpc";

function thirtyDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

const ledgerAmount = sql<number>`coalesce(${expenses.convertedAmountInCents}, ${expenses.amountInCents})`;
const ledgerCurrency = sql<string>`coalesce(${expenses.convertedCurrency}, ${expenses.currency})`;

const homeStatsInputSchema = z.object({
  groupId: z.number(),
});

export const statsRouter = createTRPCRouter({
  getHomeStats: protectedProcedure
    .input(homeStatsInputSchema)
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getGroupWithAccess(input.groupId);
          const database = yield* Database;
          return yield* database.query("fetch home stats", async (db) => {
            const cutoffDate = thirtyDaysAgo();

            const [spendingResult, itemsCompletedResult, chatMessagesResult] =
              await Promise.all([
                db
                  .select({
                    total: sql<string>`coalesce(sum(${ledgerAmount}), 0)`,
                    currency: ledgerCurrency,
                  })
                  .from(expenses)
                  .where(
                    and(
                      eq(expenses.groupId, input.groupId),
                      gte(expenses.expenseDate, cutoffDate),
                    ),
                  )
                  .groupBy(ledgerCurrency),

                db
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

                db
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
          });
        }),
      ),
    ),
});
