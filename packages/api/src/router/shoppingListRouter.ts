import type { CategoryId } from "@flatsby/validators/categories";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { Effect } from "effect";
import { z } from "zod/v4";

import { and, eq, inArray, ne } from "@flatsby/db";
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
  isCategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import {
  createShoppingListItemFormSchema,
  editShoppingListItemFormSchema,
  shoppingListFormSchema,
  shoppingListItemSchema,
} from "@flatsby/validators/shopping-list";

import {
  Errors,
  fail,
  getApiResultZod,
  withErrorHandlingAsResult,
} from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  AIUtils,
  DbUtils,
  GroupUtils,
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
    .input(shoppingListFormSchema.extend({ groupId: z.number() }))
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
      shoppingListFormSchema.pick({ name: true }).extend({
        shoppingListId: z.number(),
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
          items: z.array(shoppingListItemSchema),
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
      createShoppingListItemFormSchema.extend({
        groupId: z.number(),
        shoppingListId: z.number(),
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
      editShoppingListItemFormSchema.extend({
        id: z.number(),
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
  try {
    const response = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: z.object({
        category: z.enum(categoryIds),
      }),
      prompt: `Tell me the most appropriate category for this item: ${itemName}`,
    });

    return response.object.category;
  } catch (error) {
    console.error("Error categorizing item:", error);
  }
  return "other";
};
