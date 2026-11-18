import type { SQLWrapper } from "@flatsby/db";
import { Effect } from "effect";
import { z } from "zod/v4";

import {
  and,
  between,
  count,
  eq,
  gte,
  isNotNull,
  lt,
  ne,
  sql,
} from "@flatsby/db";
import {
  calendarItems,
  calendarOccurrences,
  expenses,
  shoppingListItems,
  shoppingLists,
} from "@flatsby/db/schema";
import { addDays, localDateIn } from "@flatsby/validators/calendar";
import {
  homeCardOpenedSchema,
  homePaceInputSchema,
  homePaceSchema,
  monthPace,
  paceWindow,
} from "@flatsby/validators/home";

import { getGroupWithAccess } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { getApiResultZod } from "../errors";
import { captureUserEvent } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";

function thirtyDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

const ledgerAmount = sql<number>`coalesce(${expenses.convertedAmountInCents}, ${expenses.amountInCents})`;
const ledgerCurrency = sql<string>`coalesce(${expenses.convertedCurrency}, ${expenses.currency})`;

const localDay = (column: SQLWrapper, timeZone: string) =>
  sql<string>`to_char(${column} at time zone 'UTC' at time zone ${timeZone}, 'YYYY-MM-DD')`;
const firstColumn = sql`1`;

const homeStatsInputSchema = z.object({
  groupId: z.number(),
});

export const statsRouter = createTRPCRouter({
  getHomePace: protectedProcedure
    .input(homePaceInputSchema)
    .output(getApiResultZod(homePaceSchema))
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const group = yield* getGroupWithAccess(input.groupId);
          const database = yield* Database;
          const today = input.today ?? localDateIn(input.timeZone);
          const { from, to } = paceWindow(today);
          const after = new Date(addDays(from, -1));
          const before = new Date(addDays(to, 2));
          return yield* database.query("fetch home pace", async (db) => {
            const [spending, itemsBought, choresDone] = await Promise.all([
              db
                .select({
                  day: localDay(expenses.expenseDate, input.timeZone),
                  total: sql`sum(${ledgerAmount})`.mapWith(Number),
                })
                .from(expenses)
                .where(
                  and(
                    eq(expenses.groupId, input.groupId),
                    gte(expenses.expenseDate, after),
                    lt(expenses.expenseDate, before),
                    eq(ledgerCurrency, group.currency),
                    ne(expenses.splitMethod, "settlement"),
                  ),
                )
                .groupBy(firstColumn),

              db
                .select({
                  day: localDay(shoppingListItems.completedAt, input.timeZone),
                  total: count(),
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
                    gte(shoppingListItems.completedAt, after),
                    lt(shoppingListItems.completedAt, before),
                  ),
                )
                .groupBy(firstColumn),

              db
                .select({ day: calendarOccurrences.date, total: count() })
                .from(calendarOccurrences)
                .where(
                  and(
                    sql`${calendarOccurrences.itemId} = any(array(${db
                      .select({ id: calendarItems.id })
                      .from(calendarItems)
                      .where(
                        and(
                          eq(calendarItems.groupId, input.groupId),
                          eq(calendarItems.kind, "task"),
                        ),
                      )}))`,
                    isNotNull(calendarOccurrences.completedAt),
                    between(calendarOccurrences.date, from, to),
                  ),
                )
                .groupBy(calendarOccurrences.date),
            ]);

            return {
              today,
              spending: monthPace(spending, today),
              itemsBought: monthPace(itemsBought, today),
              choresDone: monthPace(choresDone, today),
            };
          });
        }),
      ),
    ),

  homeCardOpened: protectedProcedure
    .input(homeCardOpenedSchema)
    .mutation(({ ctx, input }) => {
      captureUserEvent({
        user: ctx.session.user,
        event: "home_card_opened",
        headers: ctx.headers,
        additionalProperties: input,
      });
    }),

  /** @deprecated Only app versions with the old home call this. Delete it once they are gone; the home reads getHomePace. */
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

            const [spendingResult, itemsCompletedResult] = await Promise.all([
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
            ]);

            const spending = spendingResult.map((row) => ({
              totalInCents: parseInt(row.total, 10),
              currency: row.currency,
            }));

            const itemsCompleted = parseInt(
              itemsCompletedResult[0]?.count ?? "0",
              10,
            );

            return {
              spending,
              itemsCompleted,
            };
          });
        }),
      ),
    ),
});
