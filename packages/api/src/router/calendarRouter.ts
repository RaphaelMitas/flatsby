import type { SQL } from "@flatsby/db";
import type { ExpandableItem } from "@flatsby/validators/calendar";
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
  continuedRotation,
  createCalendarItemSchema,
  editedEndsOn,
  endsBeforeStart,
  expandOccurrences,
  isScheduledOn,
  LONGEST_GAP_DAYS,
  rewritesPast,
  setOccurrenceDoneSchema,
  setOccurrenceSkippedSchema,
  splitEndsOn,
  splitsSeries,
  updateCalendarItemSchema,
} from "@flatsby/validators/calendar";

import type { ApiError } from "../errors";
import type { Database, DbTransaction, GroupMember } from "../types";
import {
  ConflictError,
  Errors,
  fail,
  safeDbOperation,
  withErrorHandlingAsResult,
} from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { DbUtils, GroupUtils } from "../utils";

const UPCOMING_COUNT = 5;
const HISTORY_COUNT = 8;

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
        color: true,
        startsOn: true,
        endsOn: true,
        startTime: true,
        endTime: true,
        recurrence: true,
      },
      with: {
        members: {
          columns: { groupMemberId: true },
          orderBy: (members, { asc }) => [asc(members.position)],
          with: { groupMember: { columns: { isActive: true } } },
        },
      },
      orderBy: [asc(calendarItems.startTime), asc(calendarItems.id)],
    })
  ).map(({ members, startTime, endTime, ...item }) => ({
    ...item,
    time:
      startTime && endTime
        ? { start: startTime.slice(0, 5), end: endTime.slice(0, 5) }
        : null,
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
  color,
  startsOn,
  time,
  recurrence,
  endsOn,
}: z.infer<typeof createCalendarItemSchema>) => ({
  kind,
  title,
  color,
  startsOn,
  endsOn: endsOn ?? null,
  startTime: time?.start ?? null,
  endTime: time?.end ?? null,
  recurrence,
});

const endsOnStill = (endsOn: string | null) =>
  endsOn === null
    ? isNull(calendarItems.endsOn)
    : eq(calendarItems.endsOn, endsOn);

const occurrenceOf = (itemId: number, date: string) =>
  and(
    eq(calendarOccurrences.itemId, itemId),
    eq(calendarOccurrences.date, date),
  );

type OccurrenceRow = typeof calendarOccurrences.$inferInsert;

const upsertOccurrences = (
  db: Database | DbTransaction,
  rows: OccurrenceRow[],
  set: Partial<OccurrenceRow>,
  setWhere?: SQL,
) =>
  db
    .insert(calendarOccurrences)
    .values(rows)
    .onConflictDoUpdate({
      target: [calendarOccurrences.itemId, calendarOccurrences.date],
      set,
      setWhere,
    });

// A row that is neither done nor skipped says nothing the rule doesn't
const pruneOccurrence = (
  db: Database | DbTransaction,
  itemId: number,
  date: string,
) =>
  db
    .delete(calendarOccurrences)
    .where(
      and(
        occurrenceOf(itemId, date),
        eq(calendarOccurrences.skipped, false),
        isNull(calendarOccurrences.completedAt),
      ),
    );

/** A changed schedule keeps the ticks and skips on days it still has; the rest belonged to the old one. */
const carryOccurrences = async (
  tx: DbTransaction,
  fromItemId: number,
  to: ExpandableItem,
) => {
  const split = to.id !== fromItemId;
  const since = split ? gte(calendarOccurrences.date, to.startsOn) : undefined;
  const rows = await tx
    .select({ date: calendarOccurrences.date })
    .from(calendarOccurrences)
    .where(and(eq(calendarOccurrences.itemId, fromItemId), since));
  const dropped = rows
    .map((row) => row.date)
    .filter((date) => !isScheduledOn(to, date));
  if (dropped.length > 0)
    await tx
      .delete(calendarOccurrences)
      .where(
        and(
          eq(calendarOccurrences.itemId, fromItemId),
          inArray(calendarOccurrences.date, dropped),
        ),
      );
  if (split)
    await tx
      .update(calendarOccurrences)
      .set({ itemId: to.id })
      .where(and(eq(calendarOccurrences.itemId, fromItemId), since));
};

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
            const until = addDays(input.today, LONGEST_GAP_DAYS);
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
            const edited = { ...input, endsOn: editedEndsOn(previous, input) };
            if (rewritesPast(previous, edited, input.today))
              return fail.conflict("errors.calendarSeriesEnded");
            // An edit without endsOn keeps the stored end, which the new start can pass
            if (endsBeforeStart(edited))
              return fail.conflict("errors.calendarSeriesReplaced");
            const saved = DbUtils.transaction(async (tx) => {
              if (splitsSeries(previous, input, input.today)) {
                const [ended] = await tx
                  .update(calendarItems)
                  .set({ endsOn: splitEndsOn(previous, input.startsOn) })
                  .where(
                    and(
                      eq(calendarItems.id, previous.id),
                      endsOnStill(previous.endsOn),
                    ),
                  )
                  .returning({ id: calendarItems.id });
                if (!ended)
                  return Errors.conflict("errors.calendarItemChanged");
                const piece = {
                  ...edited,
                  memberIds: continuedRotation(previous, edited),
                };
                const next = await insertItem(tx, piece, member.id);
                await carryOccurrences(tx, previous.id, { ...piece, ...next });
                return next;
              }
              const [updated] = await tx
                .update(calendarItems)
                .set(itemValues(edited))
                .where(
                  and(
                    eq(calendarItems.id, input.id),
                    endsOnStill(previous.endsOn),
                  ),
                )
                .returning({ id: calendarItems.id });
              if (!updated)
                return Errors.conflict("errors.calendarItemChanged");
              await writeMembers(tx, input.id, input.memberIds);
              await carryOccurrences(tx, input.id, edited);
              return { id: input.id };
            }, "update calendar item")(ctx.db);
            return Effect.flatMap(saved, (result) =>
              result instanceof ConflictError
                ? Effect.fail(result)
                : Effect.succeed(result),
            );
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
            const skip = input.done ? (input.skip ?? []) : [];
            if (item.kind !== "task" || (skip.length > 0 && !item.recurrence))
              return fail.validation("errors.unexpected");
            if (
              input.done &&
              [input.date, ...skip].some((date) => !isScheduledOn(item, date))
            )
              return fail.conflict("errors.calendarDateNotScheduled");
            return DbUtils.transaction(async (tx) => {
              const completion = input.done
                ? {
                    completedByGroupMemberId: member.id,
                    completedAt: new Date(),
                  }
                : { completedByGroupMemberId: null, completedAt: null };
              await upsertOccurrences(
                tx,
                [{ itemId: item.id, date: input.date, ...completion }],
                completion,
              );
              await pruneOccurrence(tx, item.id, input.date);
              if (skip.length > 0) {
                // The skip days come from the client's cache: a day someone ticked since stays done
                await upsertOccurrences(
                  tx,
                  skip.map((date) => ({
                    itemId: item.id,
                    date,
                    skipped: true,
                  })),
                  { skipped: true },
                  isNull(calendarOccurrences.completedAt),
                );
              }
              return { itemId: item.id, date: input.date };
            }, "set calendar occurrence done")(ctx.db);
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
              await upsertOccurrences(
                ctx.db,
                [{ itemId: item.id, date: input.date, skipped: input.skipped }],
                { skipped: input.skipped },
              );
              await pruneOccurrence(ctx.db, item.id, input.date);
              return { itemId: item.id, date: input.date };
            }, "set calendar occurrence skipped");
          },
        ),
      ),
    ),
});
