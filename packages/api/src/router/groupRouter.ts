import { Effect } from "effect";
import z from "zod/v4";

import {
  alias,
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from "@flatsby/db";
import {
  expenses,
  groupInvites,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import {
  activityItemSchema,
  addGroupMemberInputSchema,
  addPlaceholderInputSchema,
  createGroupSchema,
  deleteGroupSchema,
  getRecentActivityInputSchema,
  groupSchema,
  removeGroupMemberInputSchema,
  renamePlaceholderInputSchema,
  undoClaimInputSchema,
  updateGroupSettingsSchema,
  updateMemberRoleInputSchema,
} from "@flatsby/validators/group";

import type { Database as DbClient, DbTransaction } from "../types";
import {
  addMember,
  getGroupWithAccess,
  requireAdmin,
  requireMember,
} from "../effect/groups";
import { runResult } from "../effect/runtime";
import { CurrentRequest } from "../effect/services/CurrentRequest";
import { Database } from "../effect/services/Database";
import { Errors, getApiResultZod } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  activePlaceholderWhere,
  DbUtils,
  GroupUtils,
  memberUserColumns,
  ValidationUtils,
  withMemberUser,
} from "../utils";

const updateGroup = protectedProcedure
  .input(updateGroupSettingsSchema)
  .mutation(async ({ ctx, input: { id, ...settings } }) =>
    runResult(
      ctx,
      Effect.gen(function* () {
        if (settings.name !== undefined) {
          yield* ValidationUtils.notEmpty(settings.name, "groupName");
        }
        yield* requireAdmin(id);
        const database = yield* Database;
        const [updated] = yield* database.query("update group", (db) =>
          db
            .update(groups)
            .set(settings)
            .where(eq(groups.id, id))
            .returning({ id: groups.id }),
        );
        // A concurrent delete can win between the admin check and the update
        if (!updated) {
          return yield* Errors.notFound("group", id);
        }
        return { groupId: updated.id };
      }),
    ),
  );

// Two Annas would make "I'm Anna" ambiguous when one of them joins
const withFreePlaceholderName = <T>(
  db: DbClient,
  groupId: number,
  name: string,
  exceptMemberId: number | undefined,
  write: (tx: DbTransaction) => Promise<T>,
) =>
  db.transaction(async (tx) => {
    await GroupUtils.lockGroup(tx, groupId);
    const taken = await tx.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        activePlaceholderWhere(),
        sql`lower(${groupMembers.placeholderName}) = lower(${name})`,
        exceptMemberId === undefined
          ? undefined
          : ne(groupMembers.id, exceptMemberId),
      ),
      columns: { id: true },
    });
    return taken ? Errors.conflict("errors.placeholderNameTaken") : write(tx);
  });

export const groupRouter = createTRPCRouter({
  getUserGroups: protectedProcedure.query(async ({ ctx }) =>
    runResult(
      ctx,
      Effect.gen(function* () {
        const { user } = yield* CurrentRequest;
        const database = yield* Database;
        return yield* database.query(
          "fetch user groups with member counts",
          (db) => {
            const gmAll = alias(groupMembers, "gm_all");

            return db
              .select({
                id: groups.id,
                name: groups.name,
                createdAt: groups.createdAt,
                profilePicture: groups.profilePicture,
                memberCount: count(gmAll.userId),
              })
              .from(groups)
              .innerJoin(
                groupMembers,
                and(
                  eq(groups.id, groupMembers.groupId),
                  eq(groupMembers.isActive, true),
                ),
              )
              .innerJoin(
                gmAll,
                and(eq(groups.id, gmAll.groupId), eq(gmAll.isActive, true)),
              )
              .where(eq(groupMembers.userId, user.id))
              .groupBy(groups.id);
          },
        );
      }),
    ),
  ),

  getGroup: protectedProcedure
    .input(groupSchema.pick({ id: true }))
    .query(async ({ ctx, input }) =>
      runResult(ctx, getGroupWithAccess(input.id)),
    ),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const { user } = yield* CurrentRequest;
          const database = yield* Database;
          const targetMember = yield* database.findOneOrFail(
            "groupMember",
            (db) =>
              db.query.groupMembers.findFirst({
                where: and(
                  eq(groupMembers.id, input.memberId),
                  eq(groupMembers.isActive, true),
                ),
                with: {
                  group: {
                    columns: { id: true },
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                      },
                    },
                  },
                },
              }),
          );
          yield* DbUtils.ensureGroupAdmin(
            user.id,
            targetMember.group.groupMembers,
            "errors.adminRequiredToChangeRoles",
          );
          yield* DbUtils.ensureNotLastAdmin(
            input.memberId,
            targetMember.role,
            input.newRole,
            targetMember.group.groupMembers,
          );
          const updated = yield* database.query(
            "update member role",
            (db) =>
              db
                .update(groupMembers)
                .set({ role: input.newRole })
                .where(
                  and(
                    eq(groupMembers.id, input.memberId),
                    input.newRole === "admin"
                      ? isNotNull(groupMembers.userId)
                      : undefined,
                  ),
                )
                .returning({ id: groupMembers.id }),
            { messageKey: "errors.updateRoleFailed" },
          );
          if (updated.length === 0) {
            return yield* Errors.forbidden("errors.placeholderCannotBeAdmin");
          }
          return updated;
        }),
      ),
    ),

  removeGroupMember: protectedProcedure
    .input(removeGroupMemberInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          const target = yield* database.findOneOrFail("groupMember", (db) =>
            db.query.groupMembers.findFirst({
              where: and(
                eq(groupMembers.id, input.memberId),
                eq(groupMembers.isActive, true),
              ),
            }),
          );
          const current = yield* requireMember(target.groupId);
          yield* DbUtils.checkAccess(
            current.role === "admin" || current.id === input.memberId,
            "errors.onlyAdminsRemoveMembers",
          );
          const isLeaving = target.id === current.id;

          if (target.role === "admin" && isLeaving) {
            const [admins] = yield* database.query(
              "check admin count",
              (db) =>
                db
                  .select({ count: count(groupMembers.id) })
                  .from(groupMembers)
                  .where(
                    and(
                      eq(groupMembers.groupId, target.groupId),
                      eq(groupMembers.role, "admin"),
                      eq(groupMembers.isActive, true),
                    ),
                  ),
              { messageKey: "errors.databaseFailed" },
            );
            yield* DbUtils.checkAccess(
              (admins?.count ?? 0) > 1,
              "errors.promoteAdminFirst",
            );
          }

          const removed = yield* database.query(
            "remove group member",
            (db) =>
              db.transaction(async (trx) => {
                await GroupUtils.lockGroup(trx, target.groupId);
                // Inactive, not deleted, so expense history survives
                const [deactivated] = await trx
                  .update(groupMembers)
                  .set({ isActive: false })
                  .where(
                    and(
                      eq(groupMembers.id, target.id),
                      target.userId === null
                        ? isNull(groupMembers.userId)
                        : eq(groupMembers.userId, target.userId),
                    ),
                  )
                  .returning({ id: groupMembers.id });
                // Someone claimed or released the spot since it was read
                if (!deactivated)
                  return Errors.conflict("errors.placeholderTaken");
                await GroupUtils.detachMemberFromItems(trx, target.id);
                // A placeholder has no account to keep out, so the group's live link stays
                if (target.userId === null) return { success: true };
                // Removal kills the live link so they can't rejoin; leaving only kills links the leaver created
                await trx
                  .delete(groupInvites)
                  .where(
                    and(
                      eq(groupInvites.groupId, target.groupId),
                      isLeaving
                        ? eq(groupInvites.createdByMemberId, target.id)
                        : undefined,
                    ),
                  );
                return { success: true };
              }),
            { messageKey: "errors.removeMemberFailed" },
          );
          if (!("success" in removed)) return yield* removed;
          return removed;
        }),
      ),
    ),

  createGroup: protectedProcedure
    .input(createGroupSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const { user } = yield* CurrentRequest;
          const name = yield* ValidationUtils.notEmpty(input.name, "groupName");
          const database = yield* Database;
          const groupId = yield* database.query(
            "transaction: create group and add admin member",
            (db) =>
              db.transaction(async (trx) => {
                const [group] = await trx
                  .insert(groups)
                  .values({ name, currency: input.currency })
                  .returning({ id: groups.id });

                if (!group) {
                  throw new Error("Failed to create group");
                }

                await trx.insert(groupMembers).values({
                  groupId: group.id,
                  userId: user.id,
                  role: "admin",
                });

                await trx
                  .update(users)
                  .set({ lastGroupUsed: group.id })
                  .where(
                    and(eq(users.id, user.id), isNull(users.lastGroupUsed)),
                  );

                return group.id;
              }),
          );
          return { groupId };
        }),
      ),
    ),

  /** @deprecated app builds before group invites call this */
  addGroupMember: protectedProcedure
    .input(addGroupMemberInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          const current = yield* requireMember(input.groupId);
          yield* DbUtils.checkAccess(
            current.role === "admin",
            "errors.adminRequiredToAddMembers",
          );
          const userToAdd = yield* database.findOneOrFail("user", (db) =>
            db.query.users.findFirst({
              where: eq(users.email, input.memberEmail),
            }),
          );
          return yield* addMember(input.groupId, userToAdd.id);
        }),
      ),
    ),

  addPlaceholder: protectedProcedure
    .input(addPlaceholderInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireAdmin(input.groupId);
          const database = yield* Database;
          const memberId = yield* database.query("add placeholder", (db) =>
            withFreePlaceholderName(
              db,
              input.groupId,
              input.name,
              undefined,
              async (tx) => {
                const [member] = await tx
                  .insert(groupMembers)
                  .values({
                    groupId: input.groupId,
                    placeholderName: input.name,
                    role: "member",
                  })
                  .returning({ id: groupMembers.id });
                if (!member) throw new Error("Failed to add placeholder");
                return member.id;
              },
            ),
          );
          if (typeof memberId !== "number") return yield* memberId;
          return { memberId };
        }),
      ),
    ),

  renamePlaceholder: protectedProcedure
    .input(renamePlaceholderInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          const target = yield* database.findOneOrFail("groupMember", (db) =>
            db.query.groupMembers.findFirst({
              where: activePlaceholderWhere(input.memberId),
            }),
          );
          yield* requireAdmin(target.groupId);
          const refused = yield* database.query("rename placeholder", (db) =>
            withFreePlaceholderName(
              db,
              target.groupId,
              input.name,
              target.id,
              async (tx) => {
                const [renamed] = await tx
                  .update(groupMembers)
                  .set({ placeholderName: input.name })
                  .where(activePlaceholderWhere(target.id))
                  .returning({ id: groupMembers.id });
                return renamed
                  ? undefined
                  : Errors.conflict("errors.placeholderTaken");
              },
            ),
          );
          if (refused) return yield* refused;
          return { memberId: target.id };
        }),
      ),
    ),

  undoClaim: protectedProcedure
    .input(undoClaimInputSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          const database = yield* Database;
          const target = yield* database.findOneOrFail("groupMember", (db) =>
            db.query.groupMembers.findFirst({
              where: and(
                eq(groupMembers.id, input.memberId),
                eq(groupMembers.isActive, true),
              ),
            }),
          );
          const { userId, placeholderName } = target;
          if (userId === null || placeholderName === null) {
            return yield* Errors.notFound("groupMember", input.memberId);
          }
          yield* requireAdmin(target.groupId);
          if (target.role === "admin") {
            return yield* Errors.forbidden("errors.adminClaimCannotBeUndone");
          }
          const refused = yield* database.query("undo claim", (db) =>
            withFreePlaceholderName(
              db,
              target.groupId,
              placeholderName,
              target.id,
              async (tx) => {
                const [undone] = await tx
                  .update(groupMembers)
                  .set({ userId: null })
                  .where(
                    and(
                      eq(groupMembers.id, target.id),
                      eq(groupMembers.userId, userId),
                      eq(groupMembers.role, "member"),
                      eq(groupMembers.isActive, true),
                    ),
                  )
                  .returning({ id: groupMembers.id });
                return undone
                  ? undefined
                  : Errors.notFound("groupMember", target.id);
              },
            ),
          );
          if (refused) return yield* refused;
          return { memberId: target.id };
        }),
      ),
    ),

  updateGroup,
  /** @deprecated app builds before group currency call this */
  changeGroupName: updateGroup,

  deleteGroup: protectedProcedure
    .input(deleteGroupSchema)
    .mutation(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* requireAdmin(input.id);
          const database = yield* Database;
          return yield* database.query(
            "transaction: delete group and all related data",
            (db) =>
              db.transaction(async (trx) => {
                // Same lock order as joins and removals, which lock the group before its rows
                await GroupUtils.lockGroup(trx, input.id);
                await GroupUtils.deleteGroupData(trx, input.id);
                return input.id;
              }),
          );
        }),
      ),
    ),

  getRecentActivity: protectedProcedure
    .input(getRecentActivityInputSchema)
    .output(getApiResultZod(z.array(activityItemSchema)))
    .query(async ({ ctx, input }) =>
      runResult(
        ctx,
        Effect.gen(function* () {
          yield* getGroupWithAccess(input.groupId);
          const database = yield* Database;
          const { recentExpenses, recentShoppingItems } = yield* database.query(
            "fetch recent activity",
            async (db) => {
              const recentExpenses = await db.query.expenses.findMany({
                where: eq(expenses.groupId, input.groupId),
                limit: input.limit,
                orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
                with: {
                  createdByGroupMember: {
                    with: { user: { columns: memberUserColumns } },
                  },
                },
                columns: {
                  id: true,
                  amountInCents: true,
                  currency: true,
                  convertedAmountInCents: true,
                  convertedCurrency: true,
                  description: true,
                  createdAt: true,
                },
              });

              const shoppingListIds = (
                await db.query.shoppingLists.findMany({
                  where: eq(shoppingLists.groupId, input.groupId),
                  columns: { id: true },
                })
              ).map((list) => list.id);

              const recentShoppingItems =
                shoppingListIds.length > 0
                  ? await db.query.shoppingListItems.findMany({
                      where: inArray(
                        shoppingListItems.shoppingListId,
                        shoppingListIds,
                      ),
                      // Each item can yield both a created and a completed activity
                      limit: input.limit * 2,
                      orderBy: (items, { desc }) => [
                        desc(items.completedAt),
                        desc(items.createdAt),
                      ],
                      with: {
                        createdByGroupMember: {
                          with: { user: { columns: memberUserColumns } },
                        },
                        completedByGroupMember: {
                          with: { user: { columns: memberUserColumns } },
                        },
                        shoppingList: { columns: { name: true } },
                      },
                      columns: {
                        id: true,
                        name: true,
                        createdAt: true,
                        completedAt: true,
                        completed: true,
                      },
                    })
                  : [];

              return { recentExpenses, recentShoppingItems };
            },
          );

          const expenseActivities = recentExpenses.map((expense) => ({
            type: "expense" as const,
            id: `expense-${expense.id}`,
            timestamp: expense.createdAt,
            user: withMemberUser(expense.createdByGroupMember).user,
            data: {
              expenseId: expense.id,
              amountInCents:
                expense.convertedAmountInCents ?? expense.amountInCents,
              currency: expense.convertedCurrency ?? expense.currency,
              description: expense.description,
            },
          }));

          const shoppingActivities = recentShoppingItems.flatMap((item) => {
            const data = {
              itemId: item.id,
              itemName: item.name,
              shoppingListName: item.shoppingList.name,
            };
            return [
              ...(item.createdByGroupMember
                ? [
                    {
                      type: "shopping_item_created" as const,
                      id: `shopping-item-created-${item.id}`,
                      timestamp: item.createdAt,
                      user: withMemberUser(item.createdByGroupMember).user,
                      data,
                    },
                  ]
                : []),
              ...(item.completed &&
              item.completedAt &&
              item.completedByGroupMember
                ? [
                    {
                      type: "shopping_item_completed" as const,
                      id: `shopping-item-completed-${item.id}`,
                      timestamp: item.completedAt,
                      user: withMemberUser(item.completedByGroupMember).user,
                      data,
                    },
                  ]
                : []),
            ];
          });

          return z
            .array(activityItemSchema)
            .parse(
              [...expenseActivities, ...shoppingActivities].sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
              ),
            )
            .slice(0, input.limit);
        }),
      ),
    ),
});
