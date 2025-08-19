import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { Effect } from "effect";
import { z } from "zod/v4";

import type { CategoryId } from "@flatsby/ui/categories";
import { alias, and, count, eq, inArray, ne } from "@flatsby/db";
import {
  accounts,
  groupMembers,
  groups,
  sessions,
  shoppingListItems,
  shoppingLists,
  users,
  verificationTokens,
} from "@flatsby/db/schema";
import {
  categoryIds,
  categorysIdWithAiAutoSelect,
  isCategoryIdWithAiAutoSelect,
} from "@flatsby/ui/categories";

import type {
  Group,
  GroupMember,
  GroupMemberWithGroupMinimal,
  GroupMemberWithUser,
  Role,
} from "../types";
import {
  Errors,
  fail,
  getApiResultZod,
  withErrorHandlingAsResult,
} from "../errors";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  AIUtils,
  DbUtils,
  GroupUtils,
  OperationUtils,
  safeDbOperation,
  ValidationUtils,
} from "../utils";

export const shoppingList = createTRPCRouter({
  getCurrentUser: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;
    return user;
  }),

  getCurrentUserWithGroups: protectedProcedure.query(async ({ ctx }) => {
    return await withErrorHandlingAsResult(
      Effect.map(
        safeDbOperation(
          () =>
            ctx.db.query.groupMembers.findMany({
              columns: {},
              where: eq(groupMembers.userId, ctx.session.user.id),
              with: {
                group: {
                  columns: {
                    id: true,
                    name: true,
                    profilePicture: true,
                  },
                },
                user: {
                  with: {
                    lastGroupUsed: true,
                    lastShoppingListUsed: true,
                  },
                },
              },
            }),
          "fetch user groups",
          "groupMembers",
        ),
        (groups) => ({
          user: groups[0]?.user,
          groups: groups.map((g) => g.group),
        }),
      ),
    );
  }),

  updateUserName: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "User name cannot be empty")
          .max(256, "User name cannot be longer than 256 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input
          input.name.trim().length > 0
            ? Effect.succeed(input.name.trim())
            : fail.validation(
                "name",
                "cannot be empty",
                "Please enter a valid name",
              ),
          (validName) =>
            // Perform the update with better error handling
            Effect.tryPromise({
              try: async () => {
                const res = await ctx.db
                  .update(users)
                  .set({ name: validName })
                  .where(eq(users.id, ctx.session.user.id))
                  .returning({ id: users.id });
                return { user: res };
              },
              catch: (error) =>
                Errors.database(
                  "update user name",
                  "users",
                  error,
                  "Unable to update your name at this time. Please try again.",
                ),
            }),
        ),
      );
    }),

  deleteUser: protectedProcedure.mutation(async ({ ctx }) => {
    return withErrorHandlingAsResult(
      DbUtils.transaction(async (trx) => {
        const user = ctx.session.user;

        // Clear user's last used references
        await trx
          .update(users)
          .set({ lastGroupUsed: null, lastShoppingListUsed: null })
          .where(eq(users.id, user.id));

        // Fetch all group memberships of the user, including related data
        const userGroupMemberships = await trx.query.groupMembers.findMany({
          where: eq(groupMembers.userId, user.id),
          columns: {
            id: true,
            groupId: true,
            role: true,
            joinedOn: true,
          },
          with: {
            group: {
              columns: {
                id: true,
                name: true,
              },
              with: {
                groupMembers: {
                  where: ne(groupMembers.userId, user.id),
                  columns: {
                    id: true,
                    userId: true,
                    role: true,
                    joinedOn: true,
                  },
                },
                shoppingLists: {
                  columns: {
                    id: true,
                    name: true,
                  },
                  with: {
                    shoppingListItems: {
                      columns: {
                        id: true,
                        shoppingListId: true,
                        createdByGroupMemberId: true,
                        completedByGroupMemberId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Process each group membership
        for (const membership of userGroupMemberships) {
          const { id: groupMemberId, groupId, role, group } = membership;
          const isAdmin = role === "admin";

          const otherMembers = group.groupMembers;
          const otherAdmins = otherMembers.filter(
            (member) => member.role === "admin",
          );

          if (otherMembers.length > 0) {
            // Set `createdByGroupMemberId` and `completedByGroupMemberId` to null
            const affectedShoppingListItemIds = group.shoppingLists
              .flatMap((list) => list.shoppingListItems)
              .filter(
                (item) =>
                  item.createdByGroupMemberId === groupMemberId ||
                  item.completedByGroupMemberId === groupMemberId,
              )
              .map((item) => item.id);

            if (affectedShoppingListItemIds.length > 0) {
              await trx
                .update(shoppingListItems)
                .set({ createdByGroupMemberId: null })
                .where(
                  and(
                    inArray(shoppingListItems.id, affectedShoppingListItemIds),
                    eq(shoppingListItems.createdByGroupMemberId, groupMemberId),
                  ),
                );

              await trx
                .update(shoppingListItems)
                .set({ completedByGroupMemberId: null })
                .where(
                  and(
                    inArray(shoppingListItems.id, affectedShoppingListItemIds),
                    eq(
                      shoppingListItems.completedByGroupMemberId,
                      groupMemberId,
                    ),
                  ),
                );
            }
          }
          if (isAdmin) {
            if (otherAdmins.length > 0) {
              // There are other admins, so we can safely remove the user
              // Remove the user's membership
              await trx
                .delete(groupMembers)
                .where(eq(groupMembers.id, groupMemberId));
            } else if (otherMembers.length > 0) {
              // The user is the last admin but there are other members
              // Promote the member who joined first to admin
              const sortedMembers = otherMembers.sort((a, b) =>
                a.joinedOn < b.joinedOn ? -1 : 1,
              );
              const newAdmin = sortedMembers[0];

              if (newAdmin?.id === undefined) {
                throw new Error("Couldn't find a new admin");
              }
              await trx
                .update(groupMembers)
                .set({ role: "admin" })
                .where(eq(groupMembers.id, newAdmin.id));

              await trx
                .delete(groupMembers)
                .where(eq(groupMembers.id, groupMemberId));
            } else {
              // The user is the last member and admin
              // Delete all entries related to the group

              // Collect all shopping list item IDs
              const shoppingListItemIds = group.shoppingLists
                .flatMap((list) => list.shoppingListItems)
                .map((item) => item.id);

              if (shoppingListItemIds.length > 0) {
                // Delete shopping list items
                await trx
                  .delete(shoppingListItems)
                  .where(inArray(shoppingListItems.id, shoppingListItemIds));
              }

              // Collect all shopping list IDs
              const shoppingListIds = group.shoppingLists.map(
                (list) => list.id,
              );

              if (shoppingListIds.length > 0) {
                // Delete shopping lists
                await trx
                  .delete(shoppingLists)
                  .where(inArray(shoppingLists.id, shoppingListIds));
              }

              // Delete group memberships
              await trx
                .delete(groupMembers)
                .where(eq(groupMembers.groupId, groupId));

              // Delete the group
              await trx.delete(groups).where(eq(groups.id, groupId));
            }
          } else {
            // The user is not an admin, simply remove their membership
            await trx
              .delete(groupMembers)
              .where(eq(groupMembers.id, groupMemberId));
          }
        }

        // Finally, delete the user
        if (user.email)
          await trx
            .delete(verificationTokens)
            .where(eq(verificationTokens.identifier, user.email));
        await trx.delete(accounts).where(eq(accounts.userId, user.id));
        await trx.delete(sessions).where(eq(sessions.userId, user.id));
        await trx.delete(users).where(eq(users.id, user.id));

        return { success: true };
      }, "delete user and cleanup related data")(ctx.db),
    );
  }),

  getUserGroups: protectedProcedure.query(async ({ ctx }) => {
    return withErrorHandlingAsResult(
      safeDbOperation(() => {
        // Alias the groupMembers table for counting members
        const gmAll = alias(groupMembers, "gm_all");

        // Fetch groups the user is a member of, along with member counts
        return ctx.db
          .select({
            id: groups.id,
            name: groups.name,
            createdAt: groups.createdAt,
            profilePicture: groups.profilePicture,
            memberCount: count(gmAll.userId),
          })
          .from(groups)
          .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
          .innerJoin(gmAll, eq(groups.id, gmAll.groupId))
          .where(eq(groupMembers.userId, ctx.session.user.id))
          .groupBy(groups.id);
      }, "fetch user groups with member counts"),
    );
  }),

  getGroupName: publicProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.map(
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groups.findFirst({
                where: eq(groups.id, input.groupId),
                columns: {
                  name: true,
                },
              }),
            "group",
          ),
          (group: Pick<Group, "name">) => group.name,
        ),
      );
    }),

  getGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        OperationUtils.getGroupWithAccess(
          ctx.db,
          input.groupId,
          ctx.session.user.id,
        ),
      );
    }),

  getGroupMemberById: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // First, find the target group member
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                with: {
                  user: {
                    columns: {
                      email: true,
                      name: true,
                      image: true,
                    },
                  },
                },
                where: eq(groupMembers.id, input),
              }),
            "group member",
          ),
          (groupMember: GroupMemberWithUser) =>
            Effect.flatMap(
              // Then find the current user's membership in the same group
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.groupMembers.findFirst({
                    where: and(
                      eq(groupMembers.groupId, groupMember.groupId),
                      eq(groupMembers.userId, ctx.session.user.id),
                    ),
                  }),
                "group membership",
              ),
              (currentUserGroupMember: GroupMember) =>
                Effect.succeed({ ...groupMember, currentUserGroupMember }),
            ),
        ),
      );
    }),

  updateMemberRole: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
        newRole: z.enum(["admin", "member"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Fetch the target member with group data
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                where: eq(groupMembers.id, input.memberId),
                with: {
                  group: {
                    columns: {
                      id: true,
                    },
                    with: {
                      groupMembers: true,
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
    .input(
      z.object({
        memberId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Find the target group member
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                where: eq(groupMembers.id, input.memberId),
              }),
            "group member",
          ),
          (targetGroupMember: GroupMember) =>
            Effect.flatMap(
              // Find current user's membership in the same group
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.groupMembers.findFirst({
                    where: and(
                      eq(groupMembers.userId, ctx.session.user.id),
                      eq(groupMembers.groupId, targetGroupMember.groupId),
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
                      // If removing an admin, ensure it's not the last admin
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
                        // Perform the removal transaction
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

                              // Remove the group member
                              await trx
                                .delete(groupMembers)
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
    .input(z.object({ name: z.string().min(1, "Group name cannot be empty") }))
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
    .input(
      z.object({
        groupId: z.number(),
        memberEmail: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Check current user's group membership and admin status
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.groupMembers.findFirst({
                columns: {
                  role: true,
                },
                where: and(
                  eq(groupMembers.groupId, input.groupId),
                  eq(groupMembers.userId, ctx.session.user.id),
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
                      // Check if user is already a member
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
                      (existingMembership) =>
                        Effect.flatMap(
                          // Fail if user is already a member
                          existingMembership
                            ? fail.conflict(
                                "membership",
                                "already exists",
                                "This user is already a member of the group",
                              )
                            : Effect.succeed(undefined),
                          () =>
                            // Add the new group member
                            Effect.map(
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
                                  throw new Error(
                                    "Failed to add new group member",
                                  );
                                }
                                return result[0].id;
                              },
                            ),
                        ),
                    ),
                ),
            ),
        ),
      );
    }),

  changeGroupName: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        name: z.string().min(1, "Group name cannot be empty"),
      }),
    )
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
                input.groupId,
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
                        .where(eq(groups.id, input.groupId))
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
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Check if user is admin of the group
          GroupUtils.requireAdminAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
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
                        .where(eq(shoppingLists.groupId, input.groupId)),
                    ),
                  );

                // Step 2: Delete group members
                await trx
                  .delete(groupMembers)
                  .where(eq(groupMembers.groupId, input.groupId));

                // Step 3: Remove lastGroupUsed references
                await trx
                  .update(users)
                  .set({ lastGroupUsed: null, lastShoppingListUsed: null })
                  .where(eq(users.lastGroupUsed, input.groupId));

                // Step 4: Delete shopping lists
                await trx
                  .delete(shoppingLists)
                  .where(eq(shoppingLists.groupId, input.groupId));

                // Step 5: Delete the group
                await trx.delete(groups).where(eq(groups.id, input.groupId));

                return input.groupId;
              }, "delete group and all related data")(ctx.db),
              (groupId) => groupId,
            ),
        ),
      );
    }),

  getShoppingListName: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify user is member of group
          GroupUtils.requireMemberAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            Effect.map(
              // Get shopping list name
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingLists.findFirst({
                    where: and(
                      eq(shoppingLists.id, input.shoppingListId),
                      eq(shoppingLists.groupId, input.groupId),
                    ),
                    columns: {
                      name: true,
                    },
                  }),
                "shopping list",
              ),
              (shoppingList) => shoppingList.name,
            ),
        ),
      );
    }),

  getShoppingLists: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify group membership and fetch shopping lists
          GroupUtils.requireMemberAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            Effect.map(
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.groups.findFirst({
                    where: eq(groups.id, input.groupId),
                    columns: {
                      id: true,
                    },
                    with: {
                      shoppingLists: {
                        columns: {
                          id: true,
                          name: true,
                          icon: true,
                          description: true,
                        },
                        with: {
                          shoppingListItems: {
                            columns: {
                              completed: true,
                            },
                            where: eq(shoppingListItems.completed, false),
                          },
                        },
                      },
                    },
                  }),
                "get shopping lists",
              ),
              (group) => {
                // Transform shopping lists with unchecked item counts
                const shoppingLists = group.shoppingLists.map((list) => {
                  const uncheckedItemLength = list.shoppingListItems.length;

                  return {
                    id: list.id,
                    name: list.name,
                    description: list.description,
                    icon: list.icon,
                    uncheckedItemLength,
                  };
                });

                return shoppingLists;
              },
            ),
        ),
      );
    }),

  createShoppingList: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        name: z.string().min(1, "Shopping list name cannot be empty"),
        icon: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Shopping list name"),
          (validName) =>
            Effect.flatMap(
              // Check if user is member of group
              GroupUtils.requireMemberAccess(
                ctx.db,
                input.groupId,
                ctx.session.user.id,
              ),
              () =>
                // Create shopping list
                Effect.map(
                  safeDbOperation(
                    () =>
                      ctx.db
                        .insert(shoppingLists)
                        .values({
                          groupId: input.groupId,
                          name: validName,
                          icon: input.icon,
                          description: input.description,
                        })
                        .returning({ id: shoppingLists.id }),
                    "create shopping list",
                  ),
                  (result) => {
                    if (!result[0]) {
                      throw new Error("Failed to create shopping list");
                    }
                    return { shoppingListId: result[0].id };
                  },
                ),
            ),
        ),
      );
    }),

  getShoppingList: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .output(
      getApiResultZod(
        z.object({
          shoppingList: z.object({
            id: z.number(),
            groupId: z.number(),
            name: z.string().min(1, "Shopping list name cannot be empty"),
            icon: z.string().nullable(),
            description: z.string().nullable(),
            createdAt: z.date(),
            group: z.object({
              id: z.number(),
              groupMembers: z.array(
                z.object({
                  id: z.number(),
                  user: z.object({
                    email: z.string().email(),
                    name: z.string().min(1, "User name cannot be empty"),
                    image: z.string().nullable(),
                  }),
                }),
              ),
            }),
          }),
          currentMember: z.object({
            id: z.number(),
            groupId: z.number(),
            userId: z.string(),
            role: z.string(),
            joinedOn: z.date(),
            user: z.object({
              email: z.string().email(),
              name: z.string().min(1, "User name cannot be empty"),
              image: z.string().nullable(),
            }),
          }),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify group membership and get current member info
          GroupUtils.getUserMembership(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          (groupMemberRes) =>
            Effect.map(
              // Get shopping list with group members
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingLists.findFirst({
                    where: and(
                      eq(shoppingLists.id, input.shoppingListId),
                      eq(shoppingLists.groupId, input.groupId),
                    ),
                    with: {
                      group: {
                        columns: {
                          id: true,
                        },
                        with: {
                          groupMembers: {
                            columns: {
                              id: true,
                            },
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
                        },
                      },
                    },
                  }),
                "shopping list",
              ),
              (shoppingList) => ({
                shoppingList,
                currentMember: groupMemberRes,
              }),
            ),
        ),
      );
    }),

  deleteShoppingList: protectedProcedure
    .input(z.object({ groupId: z.number(), shoppingListId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify user is member of group
          GroupUtils.requireMemberAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            Effect.flatMap(
              // Check if shopping list exists in this group
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingLists.findFirst({
                    where: and(
                      eq(shoppingLists.id, input.shoppingListId),
                      eq(shoppingLists.groupId, input.groupId),
                    ),
                    columns: {
                      id: true,
                    },
                  }),
                "shopping list",
              ),
              () =>
                // Delete shopping list and all items in transaction
                Effect.map(
                  DbUtils.transaction(async (trx) => {
                    // First delete all shopping list items
                    await trx
                      .delete(shoppingListItems)
                      .where(
                        eq(
                          shoppingListItems.shoppingListId,
                          input.shoppingListId,
                        ),
                      );

                    // Then delete the shopping list itself
                    await trx
                      .delete(shoppingLists)
                      .where(eq(shoppingLists.id, input.shoppingListId));

                    return { success: true };
                  }, "delete shopping list and all items")(ctx.db),
                  (result) => result,
                ),
            ),
        ),
      );
    }),

  changeShoppingListName: protectedProcedure
    .input(
      z.object({
        shoppingListId: z.number(),
        name: z.string().min(1, "Shopping list name cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Shopping list name"),
          (validName) =>
            Effect.flatMap(
              // Get shopping list with group information and verify user access
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingLists.findFirst({
                    where: eq(shoppingLists.id, input.shoppingListId),
                    with: {
                      group: {
                        with: {
                          groupMembers: {
                            where: eq(groupMembers.userId, ctx.session.user.id),
                          },
                        },
                      },
                    },
                  }),
                "shopping list",
              ),
              (shoppingList) =>
                Effect.flatMap(
                  DbUtils.ensureGroupMember(
                    ctx.session.user.id,
                    shoppingList.group.groupMembers,
                    "You are not a member of this group",
                  ),
                  () =>
                    Effect.map(
                      safeDbOperation(
                        () =>
                          ctx.db
                            .update(shoppingLists)
                            .set({ name: validName })
                            .where(eq(shoppingLists.id, input.shoppingListId))
                            .returning({ id: shoppingLists.id }),
                        "update shopping list name",
                      ),
                      (result) => {
                        if (!result[0]) {
                          throw new Error("Shopping list not found");
                        }
                        return { shoppingListId: result[0].id };
                      },
                    ),
                ),
            ),
        ),
      );
    }),

  getShoppingListItems: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.number().min(0).default(0),
      }),
    )
    .output(
      getApiResultZod(
        z.object({
          items: z.array(
            z.object({
              id: z.number(),
              name: z
                .string()
                .min(1, "Shopping list item name cannot be empty"),
              categoryId: z.enum(categorysIdWithAiAutoSelect),
              createdAt: z.date(),
              completed: z.boolean(),
              createdByGroupMemberId: z.number().nullable(),
              completedByGroupMemberId: z.number().nullable(),
              completedAt: z.date().nullable(),
              isPending: z.boolean().optional(),
            }),
          ),
          nextCursor: z.number().optional(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Verify user is member of group
          GroupUtils.requireMemberAccess(
            ctx.db,
            input.groupId,
            ctx.session.user.id,
          ),
          () =>
            Effect.flatMap(
              // Check if shopping list exists in this group
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingLists.findFirst({
                    where: and(
                      eq(shoppingLists.id, input.shoppingListId),
                      eq(shoppingLists.groupId, input.groupId),
                    ),
                    columns: {
                      id: true,
                    },
                  }),
                "shopping list",
              ),
              () =>
                // Fetch shopping list items with pagination
                Effect.map(
                  safeDbOperation(
                    () =>
                      ctx.db.query.shoppingListItems.findMany({
                        where: eq(
                          shoppingListItems.shoppingListId,
                          input.shoppingListId,
                        ),
                        columns: {
                          id: true,
                          name: true,
                          completed: true,
                          createdAt: true,
                          categoryId: true,
                          completedAt: true,
                          completedByGroupMemberId: true,
                          createdByGroupMemberId: true,
                        },
                        orderBy: (item, { desc }) => [
                          desc(item.completedAt),
                          desc(item.createdAt),
                        ],
                        limit: input.limit + 1,
                        offset: input.cursor,
                      }),
                    "fetch shopping list items",
                  ),
                  (items) => {
                    // Handle pagination
                    let nextOffset: number | undefined = undefined;

                    if (items.length > input.limit) {
                      items.pop();
                      nextOffset = input.cursor + input.limit;
                    }

                    // Transform items with proper categoryId
                    const itemsWithCategoryId = items.map((item) => ({
                      ...item,
                      categoryId: isCategoryIdWithAiAutoSelect(item.categoryId)
                        ? item.categoryId
                        : "other",
                    }));

                    return {
                      items: itemsWithCategoryId,
                      nextCursor: nextOffset,
                    };
                  },
                ),
            ),
        ),
      );
    }),

  createShoppingListItem: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
        name: z.string().min(1, "Shopping list item name cannot be empty"),
        categoryId: z.enum(categorysIdWithAiAutoSelect),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Shopping list item name"),
          (validName) =>
            Effect.flatMap(
              // Verify user is member of group
              GroupUtils.getUserMembership(
                ctx.db,
                input.groupId,
                ctx.session.user.id,
              ),
              (groupMemberRes) =>
                Effect.flatMap(
                  // Verify shopping list exists in this group
                  DbUtils.findOneOrFail(
                    () =>
                      ctx.db.query.shoppingLists.findFirst({
                        where: and(
                          eq(shoppingLists.id, input.shoppingListId),
                          eq(shoppingLists.groupId, input.groupId),
                        ),
                        columns: {
                          id: true,
                        },
                      }),
                    "shopping list",
                  ),
                  () =>
                    Effect.flatMap(
                      // Determine category ID (with AI if needed)
                      input.categoryId === "ai-auto-select"
                        ? AIUtils.categorizeItemSafely(
                            validName,
                            getItemCategory,
                          )
                        : Effect.succeed(input.categoryId),
                      (categoryId) =>
                        // Create shopping list item
                        Effect.map(
                          safeDbOperation(
                            () =>
                              ctx.db
                                .insert(shoppingListItems)
                                .values({
                                  shoppingListId: input.shoppingListId,
                                  name: validName,
                                  categoryId: categoryId,
                                  completed: false,
                                  createdByGroupMemberId: groupMemberRes.id,
                                  createdAt: new Date(),
                                })
                                .returning({ id: shoppingListItems.id }),
                            "create shopping list item",
                          ),
                          (result) => {
                            if (!result[0]) {
                              throw new Error(
                                "Failed to create shopping list item",
                              );
                            }
                            return result[0].id;
                          },
                        ),
                    ),
                ),
            ),
        ),
      );
    }),

  updateShoppingListItem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Shopping list item name cannot be empty"),
        categoryId: z.enum(categorysIdWithAiAutoSelect),
        completed: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.name, "Shopping list item name"),
          (validName) =>
            Effect.flatMap(
              // Find shopping list item with group membership verification
              DbUtils.findOneOrFail(
                () =>
                  ctx.db.query.shoppingListItems.findFirst({
                    where: eq(shoppingListItems.id, input.id),
                    with: {
                      shoppingList: {
                        with: {
                          group: {
                            columns: {
                              id: true,
                            },
                            with: {
                              groupMembers: {
                                where: eq(
                                  groupMembers.userId,
                                  ctx.session.user.id,
                                ),
                              },
                            },
                          },
                        },
                      },
                    },
                  }),
                "shopping list item",
              ),
              (shoppingListItem) =>
                Effect.flatMap(
                  shoppingListItem.shoppingList.group.groupMembers.length > 0 &&
                    shoppingListItem.shoppingList.group.groupMembers[0]
                    ? Effect.succeed(
                        shoppingListItem.shoppingList.group.groupMembers[0],
                      )
                    : fail.forbidden(
                        "update items in this",
                        "shopping list",
                        "You are not a member of this group",
                      ),

                  (groupMemberRes) =>
                    Effect.flatMap(
                      // Get current item state (for completion status comparison)
                      safeDbOperation(
                        () =>
                          ctx.db.query.shoppingListItems.findFirst({
                            where: eq(shoppingListItems.id, input.id),
                          }),
                        "get current item state",
                      ),
                      (currentItem) =>
                        Effect.flatMap(
                          // Determine category ID (with AI if needed)
                          input.categoryId === "ai-auto-select"
                            ? AIUtils.categorizeItemSafely(
                                validName,
                                getItemCategory,
                              )
                            : Effect.succeed(input.categoryId),
                          (categoryId) =>
                            Effect.map(
                              // Update shopping list item
                              safeDbOperation(() => {
                                const updateData: Partial<
                                  typeof shoppingListItems.$inferInsert
                                > = {
                                  name: validName,
                                  categoryId: categoryId,
                                  completed: input.completed,
                                };

                                // Handle completion status changes
                                if (
                                  currentItem &&
                                  currentItem.completed !== input.completed
                                ) {
                                  if (input.completed) {
                                    updateData.completedByGroupMemberId =
                                      groupMemberRes.id;
                                    updateData.completedAt = new Date();
                                  } else {
                                    updateData.completedByGroupMemberId = null;
                                    updateData.completedAt = null;
                                  }
                                }

                                return ctx.db
                                  .update(shoppingListItems)
                                  .set(updateData)
                                  .where(eq(shoppingListItems.id, input.id))
                                  .returning({ id: shoppingListItems.id });
                              }, "update shopping list item"),
                              (result) => {
                                if (!result[0]) {
                                  throw new Error(
                                    "Failed to update shopping list item",
                                  );
                                }
                                return result[0].id;
                              },
                            ),
                        ),
                    ),
                ),
            ),
        ),
      );
    }),

  deleteShoppingListItem: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Find shopping list item with group membership verification
          DbUtils.findOneOrFail(
            () =>
              ctx.db.query.shoppingListItems.findFirst({
                where: eq(shoppingListItems.id, input.id),
                with: {
                  shoppingList: {
                    with: {
                      group: {
                        columns: {
                          id: true,
                        },
                        with: {
                          groupMembers: {
                            where: eq(groupMembers.userId, ctx.session.user.id),
                          },
                        },
                      },
                    },
                  },
                },
              }),
            "shopping list item",
          ),
          (shoppingListItem) =>
            Effect.flatMap(
              // Verify user is member of the group
              DbUtils.ensureGroupMember(
                ctx.session.user.id,
                shoppingListItem.shoppingList.group.groupMembers,
                "You are not a member of this group",
              ),
              () =>
                // Delete shopping list item
                Effect.map(
                  safeDbOperation(
                    () =>
                      ctx.db
                        .delete(shoppingListItems)
                        .where(eq(shoppingListItems.id, input.id))
                        .returning({ id: shoppingListItems.id }),
                    "delete shopping list item",
                  ),
                  (result) => {
                    if (!result[0]) {
                      throw new Error("Failed to delete shopping list item");
                    }
                    return result[0].id;
                  },
                ),
            ),
        ),
      );
    }),

  updateLastUsed: protectedProcedure
    .input(
      z.object({
        groupId: z.number().nullable(),
        shoppingListId: z.number().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return withErrorHandlingAsResult(
        Effect.map(
          // Update user's last used preferences
          safeDbOperation(() => {
            const updateData: Record<string, number | string | null> = {};
            if (input.groupId !== null) {
              updateData.lastGroupUsed = input.groupId;
              // Reset lastShoppingListUsed if only groupId is provided
              if (input.shoppingListId === null) {
                updateData.lastShoppingListUsed = null;
              }
            }
            if (input.shoppingListId !== null) {
              updateData.lastShoppingListUsed = input.shoppingListId;
            }
            if (input.groupId === null && input.shoppingListId === null) {
              updateData.lastGroupUsed = null;
              updateData.lastShoppingListUsed = null;
            }

            return ctx.db
              .update(users)
              .set(updateData)
              .where(eq(users.id, ctx.session.user.id))
              .returning({ id: users.id });
          }, "update last used preferences"),
          (result) => {
            if (!result[0]) {
              throw new Error("Failed to update last used values");
            }
            return result[0].id;
          },
        ),
      );
    }),

  categorizeItem: protectedProcedure
    .input(
      z.object({
        itemName: z.string(),
      }),
    )
    .output(getApiResultZod(z.enum(categoryIds)))
    .mutation(async ({ input }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.itemName, "Item name"),
          (validItemName) =>
            // Categorize item using AI with fallback
            AIUtils.categorizeItemSafely(validItemName, getItemCategory),
        ),
      );
    }),
});

const getItemCategory = async (itemName: string): Promise<CategoryId> => {
  let category: CategoryId = "other";
  try {
    const response = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: z.object({
        category: z.enum(categoryIds),
      }),
      prompt: `Tell me the most appropriate category for this item: ${itemName}`,
    });

    category = response.object.category;
  } catch (error) {
    console.error("Error categorizing item:", error);
  }
  return category;
};
