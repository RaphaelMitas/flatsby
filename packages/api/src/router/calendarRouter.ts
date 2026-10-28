import type { SQL, SQLWrapper } from "@flatsby/db";
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
  sql,
} from "@flatsby/db";
import {
  calendarItemMembers,
  calendarItems,
  calendarOccurrences,
} from "@flatsby/db/schema";
import {
  addDays,
  calendarItemDetailSchema,
  calendarItemRefSchema,
  calendarRangeSchema,
  continuedRotation,
  createCalendarItemSchema,
  earliestStartReaching,
  editedDays,
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

import type { Database as DbClient, DbTransaction } from "../types";
import { requireActiveMembers, requireMember } from "../effect/groups";
import { runResult } from "../effect/runtime";
import { Database } from "../effect/services/Database";
import { ConflictError, Errors } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { memberName } from "../utils";

const UPCOMING_COUNT = 5;
const HISTORY_COUNT = 8;

const loadItems = async (db: DbClient, where: SQL | undefined) =>
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
        days: true,
        timeZone: true,
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
  db: DbClient,
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
          columns: { placeholderName: true },
          with: { user: { columns: { name: true, image: true } } },
        },
      },
      where,
      orderBy: [desc(calendarOccurrences.date)],
      limit,
    })
  ).map(({ completedByGroupMember, ...row }) => ({
    ...row,
    completedBy: completedByGroupMember && {
      name: memberName(completedByGroupMember),
      image: completedByGroupMember.user?.image ?? null,
      placeholder: completedByGroupMember.user === null,
    },
  }));

const findItem = Effect.fn("Calendar.findItem")(function* (
  groupId: number,
  id: number,
) {
  const database = yield* Database;
  return yield* database.findOneOrFail(
    "calendarItem",
    async (db) =>
      (
        await loadItems(
          db,
          and(eq(calendarItems.id, id), eq(calendarItems.groupId, groupId)),
        )
      )[0],
  );
});

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

type ItemValues = z.infer<typeof createCalendarItemSchema> & { days: number };

const insertItem = async (
  tx: DbTransaction,
  input: ItemValues,
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
  days,
  timeZone,
}: ItemValues) => ({
  kind,
  title,
  color,
  startsOn,
  endsOn: endsOn ?? null,
  startTime: time?.start ?? null,
  endTime: time?.end ?? null,
  recurrence,
  days,
  // Absent on edits, so the zone the item was made in stays
  ...(timeZone && { timeZone }),
});

const lastDayOf = (date: SQLWrapper) =>
  sql`${date} + ${calendarItems.days} - 1`;

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
  db: DbClient | DbTransaction,
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

// The days come from the client's cache: a day someone ticked since stays done
const skipOpenDays = async (
  db: DbClient | DbTransaction,
  itemId: number,
  dates: string[],
) => {
  if (dates.length === 0) return;
  await upsertOccurrences(
    db,
    dates.map((date) => ({ itemId, date, skipped: true })),
    { skipped: true },
    isNull(calendarOccurrences.completedAt),
  );
};

// A row that is neither done nor skipped says nothing the rule doesn't
const pruneOccurrence = (
  db: DbClient | DbTransaction,
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
    runResult(
      ctx,
      Effect.gen(function* () {
        yield* requireMember(input.groupId);
        const database = yield* Database;
        return yield* database.query("load calendar range", async (db) => {
          const items = await loadItems(
            db,
            and(
              eq(calendarItems.groupId, input.groupId),
              lte(calendarItems.startsOn, input.to),
              or(
                isNotNull(calendarItems.recurrence),
                gte(lastDayOf(calendarItems.startsOn), input.from),
              ),
              or(
                isNull(calendarItems.endsOn),
                gte(lastDayOf(calendarItems.endsOn), input.from),
              ),
            ),
          );
          const overrides =
            items.length === 0
              ? []
              : await loadOverrides(
                  db,
                  and(
                    inArray(
                      calendarOccurrences.itemId,
                      items.map((item) => item.id),
                    ),
                    between(
                      calendarOccurrences.date,
                      earliestStartReaching(
                        input.from,
                        Math.max(...items.map((item) => item.days)),
                      ),
                      input.to,
                    ),
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
        });
      }),
    ),
  ),

  item: protectedProcedure
    .input(calendarItemDetailSchema)
    .query(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const item = yield* findItem(input.groupId, input.id);
          const database = yield* Database;
          return yield* database.query("load calendar item", async (db) => {
            const until = addDays(input.today, LONGEST_GAP_DAYS);
            const [ahead, history] = await Promise.all([
              loadOverrides(
                db,
                and(
                  eq(calendarOccurrences.itemId, item.id),
                  between(
                    calendarOccurrences.date,
                    earliestStartReaching(input.today, item.days),
                    until,
                  ),
                ),
              ),
              loadOverrides(
                db,
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
          });
        }),
      ),
    ),

  create: protectedProcedure
    .input(createCalendarItemSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const member = yield* requireMember(input.groupId);
          yield* requireActiveMembers(input.groupId, input.memberIds);
          const database = yield* Database;
          return yield* database.query(
            "transaction: create calendar item",
            (db) =>
              db.transaction((tx) =>
                insertItem(
                  tx,
                  { ...input, days: editedDays(input) },
                  member.id,
                ),
              ),
          );
        }),
      ),
    ),

  update: protectedProcedure
    .input(updateCalendarItemSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const member = yield* requireMember(input.groupId);
          const previous = yield* findItem(input.groupId, input.id);
          yield* requireActiveMembers(input.groupId, input.memberIds);
          // Tasks and events are different things, so an item can't switch
          if (input.kind !== previous.kind) {
            return yield* Errors.validation("errors.unexpected");
          }
          const edited = {
            ...input,
            endsOn: editedEndsOn(previous, input),
            days: editedDays(input, previous),
          };
          if (rewritesPast(previous, edited, input.today)) {
            return yield* Errors.conflict("errors.calendarSeriesEnded");
          }
          // An edit without endsOn keeps the stored end, which the new start can pass
          if (endsBeforeStart(edited)) {
            return yield* Errors.conflict("errors.calendarSeriesReplaced");
          }
          const database = yield* Database;
          const result = yield* database.query(
            "transaction: update calendar item",
            (db) =>
              db.transaction(async (tx) => {
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
                    timeZone: previous.timeZone,
                    memberIds: continuedRotation(previous, edited),
                  };
                  const next = await insertItem(tx, piece, member.id);
                  await carryOccurrences(tx, previous.id, {
                    ...piece,
                    ...next,
                  });
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
              }),
          );
          if (result instanceof ConflictError) {
            return yield* result;
          }
          return result;
        }),
      ),
    ),

  delete: protectedProcedure
    .input(calendarItemRefSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const item = yield* findItem(input.groupId, input.id);
          const database = yield* Database;
          yield* database.query("delete calendar item", (db) =>
            db.delete(calendarItems).where(eq(calendarItems.id, item.id)),
          );
          return { id: item.id };
        }),
      ),
    ),

  setDone: protectedProcedure
    .input(setOccurrenceDoneSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const member = yield* requireMember(input.groupId);
          const item = yield* findItem(input.groupId, input.itemId);
          const skip = input.done ? (input.skip ?? []) : [];
          if (item.kind !== "task" || (skip.length > 0 && !item.recurrence)) {
            return yield* Errors.validation("errors.unexpected");
          }
          if (
            input.done &&
            [input.date, ...skip].some((date) => !isScheduledOn(item, date))
          ) {
            return yield* Errors.conflict("errors.calendarDateNotScheduled");
          }
          const database = yield* Database;
          yield* database.query(
            "transaction: set calendar occurrence done",
            (db) =>
              db.transaction(async (tx) => {
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
                await skipOpenDays(tx, item.id, skip);
              }),
          );
          return { itemId: item.id, date: input.date };
        }),
      ),
    ),

  setSkipped: protectedProcedure
    .input(setOccurrenceSkippedSchema)
    .mutation(({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireMember(input.groupId);
          const item = yield* findItem(input.groupId, input.itemId);
          if (!item.recurrence) {
            return yield* Errors.validation("errors.unexpected");
          }
          const skip = input.skipped
            ? [input.date, ...(input.missed ?? [])]
            : [];
          if (skip.some((date) => !isScheduledOn(item, date))) {
            return yield* Errors.conflict("errors.calendarDateNotScheduled");
          }
          const database = yield* Database;
          yield* database.query(
            "transaction: set calendar occurrence skipped",
            (db) =>
              db.transaction(async (tx) => {
                if (input.skipped) await skipOpenDays(tx, item.id, skip);
                else {
                  await upsertOccurrences(
                    tx,
                    [{ itemId: item.id, date: input.date, skipped: false }],
                    { skipped: false },
                  );
                  await pruneOccurrence(tx, item.id, input.date);
                }
              }),
          );
          return { itemId: item.id, date: input.date };
        }),
      ),
    ),
});
