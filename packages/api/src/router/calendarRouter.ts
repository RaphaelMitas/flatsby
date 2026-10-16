import type { SQL } from "@flatsby/db";
import type { z } from "zod/v4";
import { Effect } from "effect";

import {
  and,
  asc,
  between,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "@flatsby/db";
import {
  calendarItemMembers,
  calendarItems,
  calendarOccurrences,
  groupMembers,
} from "@flatsby/db/schema";
import {
  addDays,
  calendarItemDetailSchema,
  calendarItemRefSchema,
  calendarRangeSchema,
  createCalendarItemSchema,
  expandOccurrences,
  isScheduledOn,
  sameSchedule,
  setOccurrenceDoneSchema,
  setOccurrenceSkippedSchema,
  splitsSeries,
  updateCalendarItemSchema,
} from "@flatsby/validators/calendar";

import type { ApiError } from "../errors";
import type { Database, DbTransaction, GroupMember } from "../types";
import { fail, safeDbOperation, withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DbUtils, GroupUtils } from "../utils";

const UPCOMING_COUNT = 5;
const HISTORY_COUNT = 8;
// The longest intervals are 365 days and 52 weeks, so this always reaches the next occurrence
const UPCOMING_WINDOW_DAYS = 400;

interface MemberContext {
  locale: Parameters<typeof withErrorHandlingAsResult>[0];
  db: Database;
  session: { user: { id: string } };
}

const asMember = <T>(
  ctx: MemberContext,
  groupId: number,
  run: (member: GroupMember) => Effect.Effect<T, ApiError>,
) =>
  withErrorHandlingAsResult(
    ctx.locale,
    Effect.flatMap(
      GroupUtils.requireMemberAccess(ctx.db, groupId, ctx.session.user.id),
      run,
    ),
  );

const loadItems = async (db: Database, where: SQL | undefined) =>
  (
    await db.query.calendarItems.findMany({
      where,
      columns: {
        id: true,
        kind: true,
        title: true,
        startsOn: true,
        endsOn: true,
        time: true,
        recurrence: true,
      },
      with: {
        members: {
          columns: { groupMemberId: true },
          orderBy: (members, { asc }) => [asc(members.position)],
          with: { groupMember: { columns: { isActive: true } } },
        },
      },
      orderBy: [asc(calendarItems.time), asc(calendarItems.id)],
    })
  ).map(({ members, time, ...item }) => ({
    ...item,
    time: time?.slice(0, 5) ?? null,
    // People who left drop out and the rotation re-flows over whoever is still here
    memberIds: members
      .filter((member) => member.groupMember.isActive)
      .map((member) => member.groupMemberId),
  }));

const loadOverrides = async (
  db: Database,
  where: SQL | undefined,
  limit?: number,
) =>
  (
    await db.query.calendarOccurrences.findMany({
      columns: {
        itemId: true,
        date: true,
        skipped: true,
        completedByGroupMemberId: true,
        completedAt: true,
      },
      with: {
        completedByGroupMember: {
          columns: {},
          with: { user: { columns: { name: true, image: true } } },
        },
      },
      where,
      orderBy: [desc(calendarOccurrences.date)],
      limit,
    })
  ).map(({ completedByGroupMember, ...row }) => ({
    ...row,
    completedBy: completedByGroupMember?.user ?? null,
  }));

const findItem = (db: Database, groupId: number, id: number) =>
  DbUtils.findOneOrFail(
    async () =>
      (
        await loadItems(
          db,
          and(eq(calendarItems.id, id), eq(calendarItems.groupId, groupId)),
        )
      )[0],
    "calendarItem",
  );

const ensureMembersInGroup = (
  db: Database,
  groupId: number,
  memberIds: number[],
) =>
  Effect.flatMap(
    safeDbOperation(
      () =>
        memberIds.length === 0
          ? Promise.resolve([])
          : db
              .select({ id: groupMembers.id })
              .from(groupMembers)
              .where(
                and(
                  inArray(groupMembers.id, memberIds),
                  eq(groupMembers.groupId, groupId),
                  eq(groupMembers.isActive, true),
                ),
              ),
      "check calendar members",
    ),
    (found) =>
      found.length === new Set(memberIds).size
        ? Effect.void
        : fail.notFound("groupMember"),
  );

const writeMembers = async (
  tx: DbTransaction,
  itemId: number,
  memberIds: number[],
) => {
  await tx
    .delete(calendarItemMembers)
    .where(eq(calendarItemMembers.itemId, itemId));
  if (memberIds.length > 0)
    await tx.insert(calendarItemMembers).values(
      [...new Set(memberIds)].map((groupMemberId, position) => ({
        itemId,
        groupMemberId,
        position,
      })),
    );
};

const insertItem = async (
  tx: DbTransaction,
  input: z.infer<typeof createCalendarItemSchema>,
  createdByGroupMemberId: number,
) => {
  const [created] = await tx
    .insert(calendarItems)
    .values({
      ...itemValues(input),
      groupId: input.groupId,
      createdByGroupMemberId,
    })
    .returning({ id: calendarItems.id });
  if (!created) throw new Error("Failed to create calendar item");
  await writeMembers(tx, created.id, input.memberIds);
  return { id: created.id };
};

const itemValues = ({
  kind,
  title,
  startsOn,
  time,
  recurrence,
}: z.infer<typeof createCalendarItemSchema>) => ({
  kind,
  title,
  startsOn,
  time,
  recurrence,
});

const occurrenceOf = (itemId: number, date: string) =>
  and(
    eq(calendarOccurrences.itemId, itemId),
    eq(calendarOccurrences.date, date),
  );

// A row that is neither done nor skipped says nothing the rule doesn't
const pruneOccurrence = (db: Database, itemId: number, date: string) =>
  db
    .delete(calendarOccurrences)
    .where(
      and(
        occurrenceOf(itemId, date),
        eq(calendarOccurrences.skipped, false),
        isNull(calendarOccurrences.completedAt),
      ),
    );

export const calendarRouter = createTRPCRouter({
  range: protectedProcedure.input(calendarRangeSchema).query(({ ctx, input }) =>
    asMember(ctx, input.groupId, () =>
      safeDbOperation(async () => {
        const items = await loadItems(
          ctx.db,
          and(
            eq(calendarItems.groupId, input.groupId),
            lte(calendarItems.startsOn, input.to),
            or(
              isNotNull(calendarItems.recurrence),
              gte(calendarItems.startsOn, input.from),
            ),
            or(
              isNull(calendarItems.endsOn),
              gte(calendarItems.endsOn, input.from),
            ),
          ),
        );
        const overrides =
          items.length === 0
            ? []
            : await loadOverrides(
                ctx.db,
                and(
                  inArray(
                    calendarOccurrences.itemId,
                    items.map((item) => item.id),
                  ),
                  between(calendarOccurrences.date, input.from, input.to),
                ),
              );
        return {
          items,
          occurrences: items.flatMap((item) =>
            expandOccurrences(
              item,
              overrides.filter((row) => row.itemId === item.id),
              input.from,
              input.to,
            ),
          ),
        };
      }, "load calendar range"),
    ),
  ),

  item: protectedProcedure
    .input(calendarItemDetailSchema)
    .query(({ ctx, input }) =>
      asMember(ctx, input.groupId, () =>
        Effect.flatMap(findItem(ctx.db, input.groupId, input.id), (item) =>
          safeDbOperation(async () => {
            const until = addDays(input.today, UPCOMING_WINDOW_DAYS);
            const [ahead, history] = await Promise.all([
              loadOverrides(
                ctx.db,
                and(
                  eq(calendarOccurrences.itemId, item.id),
                  between(calendarOccurrences.date, input.today, until),
                ),
              ),
              loadOverrides(
                ctx.db,
                eq(calendarOccurrences.itemId, item.id),
                HISTORY_COUNT,
              ),
            ]);
            return {
              item,
              upcoming: expandOccurrences(item, ahead, input.today, until)
                .filter((occurrence) => !occurrence.completedAt)
                .slice(0, UPCOMING_COUNT),
              history: history.map(
                ({ date, skipped, completedBy, completedAt }) => ({
                  date,
                  skipped,
                  completedBy,
                  completedAt,
                }),
              ),
            };
          }, "load calendar item"),
        ),
      ),
    ),

  create: protectedProcedure
    .input(createCalendarItemSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, (member) =>
        Effect.flatMap(
          ensureMembersInGroup(ctx.db, input.groupId, input.memberIds),
          () =>
            DbUtils.transaction(
              (tx) => insertItem(tx, input, member.id),
              "create calendar item",
            )(ctx.db),
        ),
      ),
    ),

  update: protectedProcedure
    .input(updateCalendarItemSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, (member) =>
        Effect.flatMap(
          Effect.zip(
            findItem(ctx.db, input.groupId, input.id),
            ensureMembersInGroup(ctx.db, input.groupId, input.memberIds),
          ),
          ([previous]) => {
            // Tasks and events are different things, so an item can't switch
            if (input.kind !== previous.kind)
              return fail.validation("errors.unexpected");
            return DbUtils.transaction(async (tx) => {
              if (splitsSeries(previous, input)) {
                await tx
                  .update(calendarItems)
                  .set({ endsOn: addDays(input.startsOn, -1) })
                  .where(eq(calendarItems.id, previous.id));
                await tx
                  .delete(calendarOccurrences)
                  .where(
                    and(
                      eq(calendarOccurrences.itemId, previous.id),
                      gte(calendarOccurrences.date, input.startsOn),
                    ),
                  );
                return insertItem(tx, input, member.id);
              }
              await tx
                .update(calendarItems)
                .set(itemValues(input))
                .where(eq(calendarItems.id, input.id));
              await writeMembers(tx, input.id, input.memberIds);
              // A rewritten schedule starts over; its ticks and skips belonged to the old one
              if (!sameSchedule(previous, input))
                await tx
                  .delete(calendarOccurrences)
                  .where(eq(calendarOccurrences.itemId, input.id));
              return { id: input.id };
            }, "update calendar item")(ctx.db);
          },
        ),
      ),
    ),

  delete: protectedProcedure
    .input(calendarItemRefSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, () =>
        Effect.flatMap(findItem(ctx.db, input.groupId, input.id), (item) =>
          safeDbOperation(
            () =>
              ctx.db
                .delete(calendarItems)
                .where(eq(calendarItems.id, item.id))
                .then(() => ({ id: item.id })),
            "delete calendar item",
          ),
        ),
      ),
    ),

  setDone: protectedProcedure
    .input(setOccurrenceDoneSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, (member) =>
        Effect.flatMap(
          findItem(ctx.db, input.groupId, input.itemId),
          (item) => {
            if (item.kind !== "task")
              return fail.validation("errors.unexpected");
            if (input.done && !isScheduledOn(item, input.date))
              return fail.conflict("errors.calendarDateNotScheduled");
            return safeDbOperation(async () => {
              const completion = input.done
                ? {
                    completedByGroupMemberId: member.id,
                    completedAt: new Date(),
                  }
                : { completedByGroupMemberId: null, completedAt: null };
              await ctx.db
                .insert(calendarOccurrences)
                .values({ itemId: item.id, date: input.date, ...completion })
                .onConflictDoUpdate({
                  target: [
                    calendarOccurrences.itemId,
                    calendarOccurrences.date,
                  ],
                  set: completion,
                });
              await pruneOccurrence(ctx.db, item.id, input.date);
              return { itemId: item.id, date: input.date };
            }, "set calendar occurrence done");
          },
        ),
      ),
    ),

  setSkipped: protectedProcedure
    .input(setOccurrenceSkippedSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, () =>
        Effect.flatMap(
          findItem(ctx.db, input.groupId, input.itemId),
          (item) => {
            if (!item.recurrence) return fail.validation("errors.unexpected");
            if (input.skipped && !isScheduledOn(item, input.date))
              return fail.conflict("errors.calendarDateNotScheduled");
            return safeDbOperation(async () => {
              await ctx.db
                .insert(calendarOccurrences)
                .values({
                  itemId: item.id,
                  date: input.date,
                  skipped: input.skipped,
                })
                .onConflictDoUpdate({
                  target: [
                    calendarOccurrences.itemId,
                    calendarOccurrences.date,
                  ],
                  set: { skipped: input.skipped },
                });
              await pruneOccurrence(ctx.db, item.id, input.date);
              return { itemId: item.id, date: input.date };
            }, "set calendar occurrence skipped");
          },
        ),
      ),
    ),
});
