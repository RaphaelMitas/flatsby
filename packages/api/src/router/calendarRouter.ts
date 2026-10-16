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
  not,
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
  turnForCompletion,
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

const loadOverrides = async (db: Database, where: SQL | undefined) =>
  (
    await db.query.calendarOccurrences.findMany({
      columns: {
        itemId: true,
        originalDate: true,
        movedTo: true,
        skipped: true,
        completedByGroupMemberId: true,
        completedAt: true,
        turnGroupMemberId: true,
      },
      with: {
        completedByGroupMember: {
          columns: {},
          with: { user: { columns: { name: true, image: true } } },
        },
      },
      where,
    })
  ).map(({ completedByGroupMember, ...row }) => ({
    ...row,
    completedBy: completedByGroupMember?.user ?? null,
  }));

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
const pruneOccurrences = (
  db: Database | DbTransaction,
  itemId: number,
  originalDate?: string,
) =>
  db
    .delete(calendarOccurrences)
    .where(
      and(
        eq(calendarOccurrences.itemId, itemId),
        originalDate === undefined
          ? undefined
          : eq(calendarOccurrences.originalDate, originalDate),
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
            : await loadOverrides(
                ctx.db,
                and(
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
              );
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
            const overrides = await loadOverrides(
              ctx.db,
              eq(calendarOccurrences.itemId, item.id),
            );
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
                .filter(
                  (row) =>
                    row.completedAt ||
                    // A skip that raced a schedule edit can outlive its rule
                    (row.skipped && isScheduledOn(item, row.originalDate)),
                )
                .sort((a, b) => b.originalDate.localeCompare(a.originalDate))
                .slice(0, HISTORY_COUNT)
                .map((row) => ({
                  originalDate: row.originalDate,
                  date: row.movedTo ?? row.originalDate,
                  skipped: row.skipped,
                  completedByGroupMemberId: row.completedByGroupMemberId,
                  completedBy: row.completedBy,
                  completedAt: row.completedAt,
                  turnGroupMemberId: row.completedAt
                    ? row.turnGroupMemberId
                    : turnOn(item, overrides, row.originalDate),
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
              const ofItem = eq(calendarOccurrences.itemId, input.id);
              if (!sameSchedule(previous, input)) {
                // Rows of the old rule go; a task keeps its completions as history, a one-off only its own date's
                const history =
                  input.kind === "task"
                    ? and(
                        isNotNull(calendarOccurrences.completedAt),
                        input.recurrence === null
                          ? eq(calendarOccurrences.originalDate, input.startsOn)
                          : undefined,
                      )
                    : undefined;
                await tx
                  .delete(calendarOccurrences)
                  .where(history ? and(ofItem, not(history)) : ofItem);
                // A one-off can't be moved, and is only loaded around its own date
                if (input.recurrence === null)
                  await tx
                    .update(calendarOccurrences)
                    .set({ movedTo: null })
                    .where(ofItem);
              } else if (input.kind === "event") {
                // Events can't be done, but their skips and moves still hold
                await tx
                  .update(calendarOccurrences)
                  .set({
                    completedByGroupMemberId: null,
                    completedAt: null,
                    turnGroupMemberId: null,
                  })
                  .where(ofItem);
                await pruneOccurrences(tx, input.id);
              }
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
            const turn = input.done
              ? Effect.flatMap(
                  safeDbOperation(
                    () =>
                      loadOverrides(
                        ctx.db,
                        eq(calendarOccurrences.itemId, item.id),
                      ),
                    "load calendar occurrences",
                  ),
                  (overrides) =>
                    canComplete(
                      item,
                      overrides,
                      input.originalDate,
                      input.today,
                    )
                      ? Effect.succeed(
                          turnForCompletion(item, overrides, originalDate),
                        )
                      : fail.conflict("errors.calendarDateNotScheduled"),
                )
              : Effect.succeed(null);
            return Effect.flatMap(turn, (turnGroupMemberId) =>
              safeDbOperation(async () => {
                if (input.done) {
                  const completion = {
                    completedByGroupMemberId: member.id,
                    completedAt: new Date(),
                    turnGroupMemberId,
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
                    .set({
                      completedByGroupMemberId: null,
                      completedAt: null,
                      turnGroupMemberId: null,
                    })
                    .where(
                      and(
                        eq(calendarOccurrences.itemId, item.id),
                        eq(calendarOccurrences.originalDate, originalDate),
                      ),
                    );
                  await pruneOccurrences(ctx.db, item.id, originalDate);
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
              await pruneOccurrences(ctx.db, item.id, input.originalDate);
              return { itemId: item.id, originalDate: input.originalDate };
            }, "reschedule calendar occurrence");
          },
        ),
      ),
    ),
});
