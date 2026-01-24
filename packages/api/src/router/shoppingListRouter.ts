import type { Auth } from "@flatsby/auth";
import type { CategoryId } from "@flatsby/validators/categories";
import { generateObject } from "ai";
import { Effect } from "effect";
import { z } from "zod/v4";

import { and, count, eq } from "@flatsby/db";
import {
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import {
  categoryCountsSchema,
  categoryIdSchema,
  isCategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import {
  createShoppingListItemFormSchema,
  editShoppingListItemFormSchema,
  shoppingListFormSchema,
  shoppingListItemSchema,
} from "@flatsby/validators/shopping-list";

import { fail, getApiResultZod, withErrorHandlingAsResult } from "../errors";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  AIUtils,
  DbUtils,
  GroupUtils,
  safeDbOperation,
  ValidationUtils,
} from "../utils";
import { checkCredits, trackAIUsage } from "../utils/autumn";

export const shoppingList = createTRPCRouter({
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
              // Get shopping list with active group members
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
                            where: (members, { eq }) =>
                              eq(members.isActive, true),
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
                            where: and(
                              eq(groupMembers.userId, ctx.session.user.id),
                              eq(groupMembers.isActive, true),
                            ),
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

  getCategoryCounts: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        shoppingListId: z.number(),
      }),
    )
    .output(getApiResultZod(categoryCountsSchema))
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
                // Get category counts for unchecked items
                Effect.map(
                  safeDbOperation(
                    () =>
                      ctx.db
                        .select({
                          categoryId: shoppingListItems.categoryId,
                          count: count(shoppingListItems.id),
                        })
                        .from(shoppingListItems)
                        .where(
                          and(
                            eq(
                              shoppingListItems.shoppingListId,
                              input.shoppingListId,
                            ),
                            eq(shoppingListItems.completed, false),
                          ),
                        )
                        .groupBy(shoppingListItems.categoryId),
                    "get category counts",
                  ),
                  (results) => {
                    const counts: Record<string, number> = {};
                    let total = 0;

                    for (const row of results) {
                      counts[row.categoryId] = row.count;
                      total += row.count;
                    }

                    return { counts, total };
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
                            createItemCategorizer({
                              authApi: ctx.authApi,
                              headers: ctx.headers,
                            }),
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
                                where: and(
                                  eq(groupMembers.userId, ctx.session.user.id),
                                  eq(groupMembers.isActive, true),
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
                                createItemCategorizer({
                                  authApi: ctx.authApi,
                                  headers: ctx.headers,
                                }),
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
                            where: and(
                              eq(groupMembers.userId, ctx.session.user.id),
                              eq(groupMembers.isActive, true),
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
    .output(getApiResultZod(categoryIdSchema))
    .mutation(async ({ input, ctx }) => {
      return withErrorHandlingAsResult(
        Effect.flatMap(
          // Validate input name
          ValidationUtils.notEmpty(input.itemName, "Item name"),
          (validItemName) =>
            // Categorize item using AI with fallback
            AIUtils.categorizeItemSafely(
              validItemName,
              createItemCategorizer({
                authApi: ctx.authApi,
                headers: ctx.headers,
              }),
            ),
        ),
      );
    }),
});

interface CategorizeContext {
  authApi: Auth["api"];
  headers: Headers;
}

const createItemCategorizer = (ctx: CategorizeContext) => {
  return async (itemName: string): Promise<CategoryId> => {
    const { allowed } = await checkCredits({
      authApi: ctx.authApi,
      headers: ctx.headers,
    });
    if (!allowed) {
      return "other"; // Fallback if no credits
    }

    try {
      const response = await generateObject({
        model: "google/gemini-2.0-flash",
        schema: z.object({
          category: categoryIdSchema,
        }),
        prompt: `Tell me the most appropriate category for this item: ${itemName}`,
      });

      // Track credits after successful AI call
      const metadata = response.providerMetadata;
      const cost = (metadata?.gateway as { cost?: string } | undefined)?.cost;
      await trackAIUsage({
        authApi: ctx.authApi,
        headers: ctx.headers,
        cost: cost,
      });

      return response.object.category;
    } catch (error) {
      console.error("Error categorizing item:", error);
    }
    return "other";
  };
};
