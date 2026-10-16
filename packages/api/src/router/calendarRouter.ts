import type { SQL } from "@flatsby/db";
import type { OccurrenceOverride } from "@flatsby/validators/calendar";
import type { z } from "zod/v4";
import { Effect } from "effect";

import {
  and,
  asc,
  between,
  eq,
  inArray,
  isNotNull,
  isNull,
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
  canComplete,
  createCalendarItemSchema,
  expandOccurrences,
  isScheduledOn,
  rescheduleOccurrenceSchema,
  sameSchedule,
  setOccurrenceDoneSchema,
  turnOn,
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

const loadItems = async (
  db: Database | DbTransaction,
  where: SQL | undefined,
) =>
  (
    await db.query.calendarItems.findMany({
      where,
      columns: {
        id: true,
        kind: true,
        title: true,
        startsOn: true,
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

const overrideColumns = {
  itemId: true,
  originalDate: true,
  movedTo: true,
  skipped: true,
  completedByGroupMemberId: true,
  completedAt: true,
} as const;

const groupOverrides = (
  rows: (OccurrenceOverride & { itemId: number })[],
  itemId: number,
) => rows.filter((row) => row.itemId === itemId);

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

// Drops rows that no longer differ from the rule
const pruneOccurrence = (db: Database, itemId: number, originalDate: string) =>
  db
    .delete(calendarOccurrences)
    .where(
      and(
        eq(calendarOccurrences.itemId, itemId),
        eq(calendarOccurrences.originalDate, originalDate),
        isNull(calendarOccurrences.movedTo),
        eq(calendarOccurrences.skipped, false),
        isNull(calendarOccurrences.completedAt),
      ),
    );

export const calendarRouter = createTRPCRouter({
  range: protectedProcedure.input(calendarRangeSchema).query(({ ctx, input }) =>
    asMember(ctx, input.groupId, () =>
      safeDbOperation(async () => {
        // Repeating items load whatever their start, since done and moved occurrences can land before it
        const items = await loadItems(
          ctx.db,
          and(
            eq(calendarItems.groupId, input.groupId),
            or(
              isNotNull(calendarItems.recurrence),
              between(calendarItems.startsOn, input.from, input.to),
            ),
          ),
        );
        const afterDoneIds = items
          .filter((item) => item.recurrence?.type === "afterDone")
          .map((item) => item.id);
        const overrides =
          items.length === 0
            ? []
            : await ctx.db.query.calendarOccurrences.findMany({
                columns: overrideColumns,
                where: and(
                  inArray(
                    calendarOccurrences.itemId,
                    items.map((item) => item.id),
                  ),
                  or(
                    between(
                      calendarOccurrences.originalDate,
                      input.from,
                      input.to,
                    ),
                    between(calendarOccurrences.movedTo, input.from, input.to),
                    afterDoneIds.length > 0
                      ? inArray(calendarOccurrences.itemId, afterDoneIds)
                      : undefined,
                  ),
                ),
              });
        return {
          items,
          occurrences: items.flatMap((item) =>
            expandOccurrences(
              item,
              groupOverrides(overrides, item.id),
              input.from,
              input.to,
              input.today,
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
            const overrides = await ctx.db.query.calendarOccurrences.findMany({
              columns: overrideColumns,
              where: eq(calendarOccurrences.itemId, item.id),
            });
            return {
              item,
              upcoming: expandOccurrences(
                item,
                overrides,
                input.today,
                addDays(input.today, UPCOMING_WINDOW_DAYS),
                input.today,
              )
                .filter((occurrence) => !occurrence.completedAt)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, UPCOMING_COUNT),
              history: overrides
                .filter((row) => row.completedAt || row.skipped)
                .sort((a, b) => b.originalDate.localeCompare(a.originalDate))
                .slice(0, HISTORY_COUNT)
                .map((row) => ({
                  originalDate: row.originalDate,
                  date: row.movedTo ?? row.originalDate,
                  skipped: row.skipped,
                  completedByGroupMemberId: row.completedByGroupMemberId,
                  completedAt: row.completedAt,
                  turnGroupMemberId: turnOn(item, overrides, row.originalDate),
                })),
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
            DbUtils.transaction(async (tx) => {
              const [created] = await tx
                .insert(calendarItems)
                .values({
                  ...itemValues(input),
                  groupId: input.groupId,
                  createdByGroupMemberId: member.id,
                })
                .returning({ id: calendarItems.id });
              if (!created) throw new Error("Failed to create calendar item");
              await writeMembers(tx, created.id, input.memberIds);
              return { id: created.id };
            }, "create calendar item")(ctx.db),
        ),
      ),
    ),

  update: protectedProcedure
    .input(updateCalendarItemSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, () =>
        Effect.flatMap(
          Effect.zip(
            findItem(ctx.db, input.groupId, input.id),
            ensureMembersInGroup(ctx.db, input.groupId, input.memberIds),
          ),
          ([previous]) =>
            DbUtils.transaction(async (tx) => {
              await tx
                .update(calendarItems)
                .set(itemValues(input))
                .where(eq(calendarItems.id, input.id));
              await writeMembers(tx, input.id, input.memberIds);
              // Skips and moves belong to the old rule; completions stay as history
              if (!sameSchedule(previous, input))
                await tx
                  .delete(calendarOccurrences)
                  .where(
                    and(
                      eq(calendarOccurrences.itemId, input.id),
                      isNull(calendarOccurrences.completedAt),
                    ),
                  );
              return { id: input.id };
            }, "update calendar item")(ctx.db),
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
            // An afterDone chore counts from the day it was actually done
            const originalDate =
              input.done && item.recurrence?.type === "afterDone"
                ? input.today
                : input.originalDate;
            const allowed = input.done
              ? Effect.flatMap(
                  safeDbOperation(
                    () =>
                      ctx.db.query.calendarOccurrences.findMany({
                        columns: overrideColumns,
                        where: eq(calendarOccurrences.itemId, item.id),
                      }),
                    "load calendar occurrences",
                  ),
                  (overrides) =>
                    canComplete(
                      item,
                      overrides,
                      input.originalDate,
                      input.today,
                    )
                      ? Effect.void
                      : fail.conflict("errors.calendarDateNotScheduled"),
                )
              : Effect.void;
            return Effect.flatMap(allowed, () =>
              safeDbOperation(async () => {
                if (input.done) {
                  const completion = {
                    completedByGroupMemberId: member.id,
                    completedAt: new Date(),
                    skipped: false,
                  };
                  await ctx.db
                    .insert(calendarOccurrences)
                    .values({ itemId: item.id, originalDate, ...completion })
                    .onConflictDoUpdate({
                      target: [
                        calendarOccurrences.itemId,
                        calendarOccurrences.originalDate,
                      ],
                      set: completion,
                    });
                } else {
                  await ctx.db
                    .update(calendarOccurrences)
                    .set({ completedByGroupMemberId: null, completedAt: null })
                    .where(
                      and(
                        eq(calendarOccurrences.itemId, item.id),
                        eq(calendarOccurrences.originalDate, originalDate),
                      ),
                    );
                  await pruneOccurrence(ctx.db, item.id, originalDate);
                }
                return { itemId: item.id, originalDate };
              }, "set calendar occurrence done"),
            );
          },
        ),
      ),
    ),

  reschedule: protectedProcedure
    .input(rescheduleOccurrenceSchema)
    .mutation(({ ctx, input }) =>
      asMember(ctx, input.groupId, () =>
        Effect.flatMap(
          findItem(ctx.db, input.groupId, input.itemId),
          (item) => {
            if (!item.recurrence || item.recurrence.type === "afterDone")
              return fail.validation("errors.unexpected");
            if (!isScheduledOn(item, input.originalDate))
              return fail.conflict("errors.calendarDateNotScheduled");
            const change = { movedTo: input.movedTo, skipped: input.skipped };
            return safeDbOperation(async () => {
              await ctx.db
                .insert(calendarOccurrences)
                .values({
                  itemId: item.id,
                  originalDate: input.originalDate,
                  ...change,
                })
                .onConflictDoUpdate({
                  target: [
                    calendarOccurrences.itemId,
                    calendarOccurrences.originalDate,
                  ],
                  set: change,
                });
              await pruneOccurrence(ctx.db, item.id, input.originalDate);
              return { itemId: item.id, originalDate: input.originalDate };
            }, "reschedule calendar occurrence");
          },
        ),
      ),
    ),
});
