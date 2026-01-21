import { Effect } from "effect";
import z from "zod/v4";

import { alias, and, count, eq, inArray } from "@flatsby/db";
import {
  expenses,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import {
  activityItemSchema,
  addGroupMemberInputSchema,
  getRecentActivityInputSchema,
  groupFormSchema,
  groupSchema,
  removeGroupMemberInputSchema,
  updateMemberRoleInputSchema,
} from "@flatsby/validators/group";

import type { GroupMember, GroupMemberWithGroupMinimal, Role } from "../types";
import {
  Errors,
  fail,
  getApiResultZod,
  withErrorHandlingAsResult,
} from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  DbUtils,
  GroupUtils,
  OperationUtils,
  safeDbOperation,
  ValidationUtils,
} from "../utils";

export const groupRouter = createTRPCRouter({
  getUserGroups: protectedProcedure.query(async ({ ctx }) => {
    return withErrorHandlingAsResult(
      safeDbOperation(() => {
        // Alias the groupMembers table for counting members
        const gmAll = alias(groupMembers, "gm_all");

        // Fetch groups the user is an active member of, along with active member counts
        return ctx.db
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
          .where(eq(groupMembers.userId, ctx.session.user.id))
          .groupBy(groups.id);
      }, "fetch user groups with member counts"),
    );
  }),

  getGroup: protectedProcedure
    .input(groupSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        OperationUtils.getGroupWithAccess(
          ctx.db,
          input.id,
          ctx.session.user.id,
        ),
      );
    }),

  updateMemberRole: protectedProcedure
    .input(updateMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Fetch the target member with group data (must be active)
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                where: and(
                  eq(groupMembers.id, input.memberId),
                  eq(groupMembers.isActive, true),
                ),
                with: {
                  group: {
                    columns: {
                      id: true,
                    },
                    with: {
                      groupMembers: {
                        where: (members, { eq }) => eq(members.isActive, true),
                      },
                    },
                  },
                },
              }),
            "group member",
          ),
          (targetMember: GroupMemberWithGroupMinimal) =>
            Effect.flatMap(
              // Ensure current user is a group admin
              DbUtils.ensureGroupAdmin(
                ctx.session.user.id,
                targetMember.group.groupMembers,
                "You need admin privileges to change member roles",
              ),
              () =>
                Effect.flatMap(
                  // Ensure we're not removing the last admin
                  DbUtils.ensureNotLastAdmin(
                    input.memberId,
                    targetMember.role as Role,
                    input.newRole,
                    targetMember.group.groupMembers,
                  ),
                  () =>
                    // Perform the update
                    Effect.tryPromise({
                      try: () =>
                        ctx.db
                          .update(groupMembers)
                          .set({ role: input.newRole })
                          .where(eq(groupMembers.id, input.memberId))
                          .returning({ id: groupMembers.id }),
                      catch: (error) =>
                        Errors.database(
                          "update member role",
                          "groupMembers",
                          error,
                          "Unable to update member role at this time",
                        ),
                    }),
                ),
            ),
        ),
      );
    }),

  removeGroupMember: protectedProcedure
    .input(removeGroupMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Find the target group member (must be active)
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                where: and(
                  eq(groupMembers.id, input.memberId),
                  eq(groupMembers.isActive, true),
                ),
              }),
            "group member",
          ),
          (targetGroupMember: GroupMember) =>
            Effect.flatMap(
              // Find current user's active membership in the same group
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.groupMembers.findFirst({
                    where: and(
                      eq(groupMembers.userId, ctx.session.user.id),
                      eq(groupMembers.groupId, targetGroupMember.groupId),
                      eq(groupMembers.isActive, true),
                    ),
                  }),
                "group membership",
              ),
              (currentUserGroupMember: GroupMember) =>
                Effect.flatMap(
                  // Check authorization: admin can remove anyone, members can only remove themselves
                  DbUtils.checkAccess(
                    currentUserGroupMember.role === "admin" ||
                      currentUserGroupMember.id === input.memberId,
                    "remove this member from the",
                    "group",
                    "Only group admins can remove other members. You can only remove yourself.",
                  ),
                  () =>
                    Effect.flatMap(
                      // If removing an admin, ensure it's not the last active admin
                      targetGroupMember.role === "admin" &&
                        targetGroupMember.id === currentUserGroupMember.id
                        ? Effect.flatMap(
                            Effect.tryPromise({
                              try: () =>
                                ctx.db
                                  .select({ count: count(groupMembers.id) })
                                  .from(groupMembers)
                                  .where(
                                    and(
                                      eq(
                                        groupMembers.groupId,
                                        targetGroupMember.groupId,
                                      ),
                                      eq(groupMembers.role, "admin"),
                                      eq(groupMembers.isActive, true),
                                    ),
                                  ),
                              catch: (error) =>
                                Errors.database(
                                  "check admin count",
                                  "groupMembers",
                                  error,
                                ),
                            }),
                            (adminCount: { count: number }[]) =>
                              DbUtils.checkAccess(
                                (adminCount[0]?.count ?? 0) > 1,
                                "remove the last admin from this",
                                "group",
                                "Cannot remove the last admin. Promote another member to admin first.",
                              ),
                          )
                        : Effect.succeed(undefined),
                      () =>
                        // Mark member as inactive (preserves expense history)
                        Effect.tryPromise({
                          try: () =>
                            ctx.db.transaction(async (trx) => {
                              // Clean up shopping list item references
                              await trx
                                .update(shoppingListItems)
                                .set({ completedByGroupMemberId: null })
                                .where(
                                  eq(
                                    shoppingListItems.completedByGroupMemberId,
                                    targetGroupMember.id,
                                  ),
                                );

                              await trx
                                .update(shoppingListItems)
                                .set({ createdByGroupMemberId: null })
                                .where(
                                  eq(
                                    shoppingListItems.createdByGroupMemberId,
                                    targetGroupMember.id,
                                  ),
                                );

                              // Mark member as inactive instead of deleting
                              await trx
                                .update(groupMembers)
                                .set({ isActive: false })
                                .where(
                                  eq(groupMembers.id, targetGroupMember.id),
                                );

                              return { success: true };
                            }),
                          catch: (error) =>
                            Errors.database(
                              "remove group member",
                              "groupMembers",
                              error,
                              "Unable to remove group member at this time. Please try again.",
                            ),
                        }),
                    ),
                ),
            ),
        ),
      );
    }),

  createGroup: protectedProcedure
    .input(groupFormSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Group name"),
          (validName) =>
            Effect.map(
              // Create group and add user as admin in transaction
              DbUtils.transaction(async (trx) => {
                const [group] = await trx
                  .insert(groups)
                  .values({ name: validName })
                  .returning({ id: groups.id });

                if (!group) {
                  throw new Error("Failed to create group");
                }

                await trx.insert(groupMembers).values({
                  groupId: group.id,
                  userId: ctx.session.user.id,
                  role: "admin",
                });

                return group.id;
              }, "create group and add admin member")(ctx.db),
              (groupId) => ({ groupId }),
            ),
        ),
      );
    }),

  addGroupMember: protectedProcedure
    .input(addGroupMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Check current user's active group membership and admin status
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                columns: {
                  role: true,
                },
                where: and(
                  eq(groupMembers.groupId, input.groupId),
                  eq(groupMembers.userId, ctx.session.user.id),
                  eq(groupMembers.isActive, true),
                ),
              }),
            "group membership",
          ),
          (currentGroupMember) =>
            Effect.flatMap(
              // Ensure current user is admin
              DbUtils.checkAccess(
                currentGroupMember.role === "admin",
                "add members to this",
                "group",
                "You need admin privileges to add members to this group",
              ),
              () =>
                Effect.flatMap(
                  // Find user to add by email
                  DbUtils.findOneOrFail(
                    () =>
                      ctx.db.query.users.findFirst({
                        where: eq(users.email, input.memberEmail),
                      }),
                    "user",
                  ),
                  (userToAdd) =>
                    Effect.flatMap(
                      // Check if user has any membership (active or inactive)
                      safeDbOperation(
                        () =>
                          ctx.db.query.groupMembers.findFirst({
                            where: and(
                              eq(groupMembers.groupId, input.groupId),
                              eq(groupMembers.userId, userToAdd.id),
                            ),
                          }),
                        "check existing membership",
                      ),
                      (existingMembership) => {
                        // If membership exists and is active, fail with conflict
                        if (existingMembership?.isActive) {
                          return fail.conflict(
                            "membership",
                            "already exists",
                            "This user is already a member of the group",
                          );
                        }

                        // If membership exists but is inactive, reactivate it
                        if (
                          existingMembership &&
                          !existingMembership.isActive
                        ) {
                          return Effect.map(
                            safeDbOperation(
                              () =>
                                ctx.db
                                  .update(groupMembers)
                                  .set({ isActive: true, role: "member" })
                                  .where(
                                    eq(groupMembers.id, existingMembership.id),
                                  )
                                  .returning({ id: groupMembers.id }),
                              "reactivate group member",
                            ),
                            (result) => {
                              if (!result[0]) {
                                throw new Error(
                                  "Failed to reactivate group member",
                                );
                              }
                              return result[0].id;
                            },
                          );
                        }

                        // No existing membership, create new one
                        return Effect.map(
                          safeDbOperation(
                            () =>
                              ctx.db
                                .insert(groupMembers)
                                .values({
                                  groupId: input.groupId,
                                  userId: userToAdd.id,
                                  role: "member",
                                })
                                .returning({ id: groupMembers.id }),
                            "add group member",
                          ),
                          (result) => {
                            if (!result[0]) {
                              throw new Error("Failed to add new group member");
                            }
                            return result[0].id;
                          },
                        );
                      },
                    ),
                ),
            ),
        ),
      );
    }),

  changeGroupName: protectedProcedure
    .input(groupSchema.pick({ name: true, id: true }))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Group name"),
          (validName) =>
            Effect.flatMap(
              // Check if user is admin of the group
              GroupUtils.requireAdminAccess(
                ctx.db,
                input.id,
                ctx.session.user.id,
              ),
              () =>
                // Update group name
                Effect.map(
                  safeDbOperation(
                    () =>
                      ctx.db
                        .update(groups)
                        .set({ name: validName })
                        .where(eq(groups.id, input.id))
                        .returning({ id: groups.id }),
                    "update group name",
                  ),
                  (result) => {
                    if (!result[0]) {
                      throw new Error("Group not found");
                    }
                    return { groupId: result[0].id };
                  },
                ),
            ),
        ),
      );
    }),

  deleteGroup: protectedProcedure
    .input(groupSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Check if user is admin of the group
          GroupUtils.requireAdminAccess(ctx.db, input.id, ctx.session.user.id),
          () =>
            // Delete group and all related data in transaction
            Effect.map(
              DbUtils.transaction(async (trx) => {
                // Step 1: Delete shopping list items
                await trx
                  .delete(shoppingListItems)
                  .where(
                    inArray(
                      shoppingListItems.shoppingListId,
                      trx
                        .select({ id: shoppingLists.id })
                        .from(shoppingLists)
                        .where(eq(shoppingLists.groupId, input.id)),
                    ),
                  );

                // Step 2: Delete group members
                await trx
                  .delete(groupMembers)
                  .where(eq(groupMembers.groupId, input.id));

                // Step 3: Remove lastGroupUsed references
                await trx
                  .update(users)
                  .set({ lastGroupUsed: null, lastShoppingListUsed: null })
                  .where(eq(users.lastGroupUsed, input.id));

                // Step 4: Delete shopping lists
                await trx
                  .delete(shoppingLists)
                  .where(eq(shoppingLists.groupId, input.id));

                // Step 5: Delete the group
                await trx.delete(groups).where(eq(groups.id, input.id));

                return input.id;
              }, "delete group and all related data")(ctx.db),
              (id) => id,
            ),
        ),
      );
    }),

  getRecentActivity: protectedProcedure
    .input(getRecentActivityInputSchema)
    .output(getApiResultZod(z.array(activityItemSchema)))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Get group with access check
          OperationUtils.getGroupWithAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            // Fetch recent activities
            Effect.map(
              safeDbOperation(async () => {
                // Fetch recent expenses
                const recentExpenses = await ctx.db.query.expenses.findMany({
                  where: eq(expenses.groupId, input.groupId),
                  limit: input.limit,
                  orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
                  with: {
                    createdByGroupMember: {
                      with: {
                        user: {
                          columns: { email: true, name: true, image: true },
                        },
                      },
                    },
                  },
                  columns: {
                    id: true,
                    amountInCents: true,
                    currency: true,
                    description: true,
                    createdAt: true,
                  },
                });

                // Fetch shopping lists for this group
                const groupShoppingLists =
                  await ctx.db.query.shoppingLists.findMany({
                    where: eq(shoppingLists.groupId, input.groupId),
                    columns: { id: true },
                  });

                const shoppingListIds = groupShoppingLists.map(
                  (list) => list.id,
                );

                // Fetch recent shopping list items (created or completed)
                const recentShoppingItems =
                  shoppingListIds.length > 0
                    ? await ctx.db.query.shoppingListItems.findMany({
                        where: inArray(
                          shoppingListItems.shoppingListId,
                          shoppingListIds,
                        ),
                        limit: input.limit * 2, // Get more to account for both created and completed
                        orderBy: (items, { desc }) => [
                          desc(items.completedAt),
                          desc(items.createdAt),
                        ],
                        with: {
                          createdByGroupMember: {
                            with: {
                              user: {
                                columns: {
                                  email: true,
                                  name: true,
                                  image: true,
                                },
                              },
                            },
                          },
                          completedByGroupMember: {
                            with: {
                              user: {
                                columns: {
                                  email: true,
                                  name: true,
                                  image: true,
                                },
                              },
                            },
                          },
                          shoppingList: {
                            columns: {
                              name: true,
                            },
                          },
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

                // Transform expenses to activity items
                const expenseActivities = recentExpenses.map((expense) => ({
                  type: "expense" as const,
                  id: `expense-${expense.id}`,
                  timestamp: expense.createdAt,
                  user: expense.createdByGroupMember.user,
                  data: {
                    expenseId: expense.id,
                    amountInCents: expense.amountInCents,
                    currency: expense.currency,
                    description: expense.description,
                  },
                }));

                // Transform shopping list items to activity items
                const shoppingActivities: {
                  type: "shopping_item_created" | "shopping_item_completed";
                  id: string;
                  timestamp: Date;
                  user: { email: string; name: string; image: string | null };
                  data: {
                    itemId: number;
                    itemName: string;
                    shoppingListName: string;
                  };
                }[] = [];

                for (const item of recentShoppingItems) {
                  // Add created activity
                  if (item.createdByGroupMember) {
                    shoppingActivities.push({
                      type: "shopping_item_created",
                      id: `shopping-item-created-${item.id}`,
                      timestamp: item.createdAt,
                      user: item.createdByGroupMember.user,
                      data: {
                        itemId: item.id,
                        itemName: item.name,
                        shoppingListName: item.shoppingList.name,
                      },
                    });
                  }

                  // Add completed activity if completed
                  if (
                    item.completed &&
                    item.completedAt &&
                    item.completedByGroupMember
                  ) {
                    shoppingActivities.push({
                      type: "shopping_item_completed",
                      id: `shopping-item-completed-${item.id}`,
                      timestamp: item.completedAt,
                      user: item.completedByGroupMember.user,
                      data: {
                        itemId: item.id,
                        itemName: item.name,
                        shoppingListName: item.shoppingList.name,
                      },
                    });
                  }
                }

                // Combine and sort all activities by timestamp
                const allActivities = z
                  .array(activityItemSchema)
                  .parse(
                    [...expenseActivities, ...shoppingActivities].sort(
                      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
                    ),
                  );

                // Return top N activities
                return allActivities.slice(0, input.limit);
              }, "fetch recent activity"),
              (activities) => activities,
            ),
        ),
      );
    }),
});
