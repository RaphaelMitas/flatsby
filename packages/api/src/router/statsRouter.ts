import type { SQLWrapper } from "@flatsby/db";
import { Effect } from "effect";
import { z } from "zod/v4";

import {
  and,
  between,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
} from "@flatsby/db";
import {
  calendarItems,
  calendarOccurrences,
  expenses,
  expenseSplits,
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
import {
  choreStatistics,
  convertedShares,
  shoppingStatistics,
  spendingStatistics,
  statisticsInputSchema,
  statisticsPeriod,
  statisticsSchema,
  statisticsWindow,
} from "@flatsby/validators/statistics";

import { getGroupWithAccess } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { fail, getApiResultZod } from "../errors";
import { captureUserEvent } from "../lib/posthog";
import { createTRPCRouter, protectedProcedure } from "../trpc";

function thirtyDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface Days {
  from: string;
  to: string;
}

const ledgerAmount = sql<number>`coalesce(${expenses.convertedAmountInCents}, ${expenses.amountInCents})`;
const ledgerCurrency = sql<string>`coalesce(${expenses.convertedCurrency}, ${expenses.currency})`;

const localDay = (column: SQLWrapper, timeZone: string) =>
  sql<string>`to_char(${column} at time zone 'UTC' at time zone ${timeZone}, 'YYYY-MM-DD')`;
const firstColumn = sql`1`;

const aroundDays = (column: SQLWrapper, { from, to }: Days) =>
  and(
    gte(column, new Date(addDays(from, -1))),
    lt(column, new Date(addDays(to, 2))),
  );

const spentIn = (groupId: number, currency: string, days: Days) =>
  and(
    eq(expenses.groupId, groupId),
    aroundDays(expenses.expenseDate, days),
    eq(ledgerCurrency, currency),
    ne(expenses.splitMethod, "settlement"),
  );

const boughtIn = (groupId: number, days: Days) =>
  and(
    eq(shoppingLists.groupId, groupId),
    eq(shoppingListItems.completed, true),
    aroundDays(shoppingListItems.completedAt, days),
  );

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
          return yield* database.query("fetch home pace", async (db) => {
            const [spending, itemsBought, choresDone] = await Promise.all([
              db
                .select({
                  day: localDay(expenses.expenseDate, input.timeZone),
                  total: sql`sum(${ledgerAmount})`.mapWith(Number),
                })
                .from(expenses)
                .where(spentIn(input.groupId, group.currency, { from, to }))
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
                .where(boughtIn(input.groupId, { from, to }))
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

  getStatistics: protectedProcedure
    .input(statisticsInputSchema)
    .output(getApiResultZod(statisticsSchema))
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const group = yield* getGroupWithAccess(input.groupId);
          const database = yield* Database;
          const member = group.thisGroupMember;
          const today = localDateIn(input.timeZone);
          const period = statisticsPeriod(
            input.range,
            today,
            localDateIn(input.timeZone, member.joinedOn),
          );
          if (!period) return yield* fail.validation("errors.monthNotShown");
          const window = statisticsWindow(period);
          const spent = spentIn(input.groupId, group.currency, window);
          const bought = boughtIn(input.groupId, window);
          const spentOn = localDay(expenses.expenseDate, input.timeZone);
          const boughtOn = localDay(
            shoppingListItems.completedAt,
            input.timeZone,
          );
          const tasks = and(
            eq(calendarItems.groupId, input.groupId),
            eq(calendarItems.kind, "task"),
          );
          return yield* database.query("fetch statistics", async (db) => {
            const [spending, converted, items, onList, chores, choreColors] =
              await Promise.all([
                db
                  .select({
                    day: spentOn,
                    subcategory: expenses.subcategory,
                    household: sql`sum(${ledgerAmount})`.mapWith(Number),
                    share:
                      sql`coalesce(sum(${expenseSplits.amountInCents}) filter (where ${isNull(expenses.convertedAmountInCents)}), 0)`.mapWith(
                        Number,
                      ),
                  })
                  .from(expenses)
                  .leftJoin(
                    expenseSplits,
                    and(
                      eq(expenseSplits.expenseId, expenses.id),
                      eq(expenseSplits.groupMemberId, member.id),
                    ),
                  )
                  .where(spent)
                  .groupBy(firstColumn, expenses.subcategory),

                db.query.expenses.findMany({
                  where: and(spent, isNotNull(expenses.convertedAmountInCents)),
                  columns: {
                    subcategory: true,
                    amountInCents: true,
                    currency: true,
                    convertedAmountInCents: true,
                    convertedCurrency: true,
                  },
                  extras: {
                    day: spentOn.as("day"),
                  },
                  with: {
                    expenseSplits: {
                      columns: { groupMemberId: true, amountInCents: true },
                    },
                  },
                }),

                db
                  .select({
                    day: boughtOn,
                    category: shoppingListItems.categoryId,
                    total: count(),
                  })
                  .from(shoppingListItems)
                  .innerJoin(
                    shoppingLists,
                    eq(shoppingListItems.shoppingListId, shoppingLists.id),
                  )
                  .where(bought)
                  .groupBy(firstColumn, shoppingListItems.categoryId),

                db
                  .select({
                    items: count(),
                    medianDays: sql<
                      number | null
                    >`percentile_cont(0.5) within group (order by extract(epoch from ${shoppingListItems.completedAt} - ${shoppingListItems.createdAt})) / 86400`,
                  })
                  .from(shoppingListItems)
                  .innerJoin(
                    shoppingLists,
                    eq(shoppingListItems.shoppingListId, shoppingLists.id),
                  )
                  .where(
                    and(bought, between(boughtOn, period.from, period.to)),
                  ),

                db
                  .select({
                    day: calendarOccurrences.date,
                    title: calendarItems.title,
                    total: count(),
                  })
                  .from(calendarOccurrences)
                  .innerJoin(
                    calendarItems,
                    eq(calendarOccurrences.itemId, calendarItems.id),
                  )
                  .where(
                    and(
                      tasks,
                      isNotNull(calendarOccurrences.completedAt),
                      between(calendarOccurrences.date, window.from, window.to),
                    ),
                  )
                  .groupBy(calendarOccurrences.date, calendarItems.title),

                db
                  .selectDistinctOn([calendarItems.title], {
                    title: calendarItems.title,
                    color: calendarItems.color,
                  })
                  .from(calendarItems)
                  .where(tasks)
                  .orderBy(calendarItems.title, desc(calendarItems.id)),
              ]);

            return {
              wholeMonth: period.pace === "wholeMonth",
              from: period.from,
              to: period.to,
              spending: spendingStatistics(
                [...spending, ...convertedShares(converted, member.id)],
                period,
              ),
              shopping: shoppingStatistics(
                items,
                period,
                onList[0] ?? { items: 0, medianDays: null },
              ),
              chores: choreStatistics(chores, choreColors, period),
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
