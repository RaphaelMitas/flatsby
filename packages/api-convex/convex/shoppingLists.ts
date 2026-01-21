import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireAuth,
  requireGroupMember,
  getGroupMembership,
  getGroupMembersWithUsers,
  validateNotEmpty,
  NotFoundError,
  ForbiddenError,
} from "./helpers";

/**
 * Get the name of a shopping list
 */
export const getShoppingListName = query({
  args: {
    groupId: v.id("groups"),
    shoppingListId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireGroupMember(ctx, args.groupId, user._id);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList || shoppingList.groupId !== args.groupId) {
      throw new NotFoundError("shopping list");
    }

    return shoppingList.name;
  },
});

/**
 * Get all shopping lists for a group
 */
export const getShoppingLists = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireGroupMember(ctx, args.groupId, user._id);

    const lists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get unchecked item counts for each list
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const uncheckedItems = await ctx.db
          .query("shoppingListItems")
          .withIndex("by_shopping_list_completed", (q) =>
            q.eq("shoppingListId", list._id).eq("completed", false)
          )
          .collect();

        return {
          id: list._id,
          name: list.name,
          description: list.description,
          icon: list.icon,
          uncheckedItemLength: uncheckedItems.length,
        };
      })
    );

    return listsWithCounts;
  },
});

/**
 * Get a single shopping list with group members
 */
export const getShoppingList = query({
  args: {
    groupId: v.id("groups"),
    shoppingListId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const currentMember = await requireGroupMember(ctx, args.groupId, user._id);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList || shoppingList.groupId !== args.groupId) {
      throw new NotFoundError("shopping list");
    }

    const membersWithUsers = await getGroupMembersWithUsers(ctx, args.groupId);
    const currentMemberUser = await ctx.db.get(user._id);

    return {
      shoppingList: {
        ...shoppingList,
        id: shoppingList._id,
        createdAt: shoppingList._creationTime,
        group: {
          id: args.groupId,
          groupMembers: membersWithUsers.map((m) => ({
            id: m._id,
            user: m.user,
          })),
        },
      },
      currentMember: {
        ...currentMember,
        id: currentMember._id,
        user: currentMemberUser
          ? {
              email: currentMemberUser.email,
              name: currentMemberUser.name,
              image: currentMemberUser.image,
            }
          : null,
      },
    };
  },
});

/**
 * Create a new shopping list
 */
export const createShoppingList = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireGroupMember(ctx, args.groupId, user._id);

    const validName = validateNotEmpty(args.name, "Shopping list name");

    const shoppingListId = await ctx.db.insert("shoppingLists", {
      groupId: args.groupId,
      name: validName,
      icon: args.icon,
      description: args.description,
    });

    return { shoppingListId };
  },
});

/**
 * Delete a shopping list and all its items
 */
export const deleteShoppingList = mutation({
  args: {
    groupId: v.id("groups"),
    shoppingListId: v.id("shoppingLists"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireGroupMember(ctx, args.groupId, user._id);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList || shoppingList.groupId !== args.groupId) {
      throw new NotFoundError("shopping list");
    }

    // Delete all items
    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", args.shoppingListId)
      )
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Clear lastShoppingListUsed references
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.lastShoppingListUsed === args.shoppingListId) {
        await ctx.db.patch(u._id, { lastShoppingListUsed: undefined });
      }
    }

    // Delete the shopping list
    await ctx.db.delete(args.shoppingListId);

    return { success: true };
  },
});

/**
 * Change shopping list name
 */
export const changeShoppingListName = mutation({
  args: {
    shoppingListId: v.id("shoppingLists"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList) {
      throw new NotFoundError("shopping list");
    }

    await requireGroupMember(ctx, shoppingList.groupId, user._id);

    const validName = validateNotEmpty(args.name, "Shopping list name");

    await ctx.db.patch(args.shoppingListId, { name: validName });

    return { shoppingListId: args.shoppingListId };
  },
});

/**
 * Get shopping list items with pagination
 */
export const getShoppingListItems = query({
  args: {
    groupId: v.id("groups"),
    shoppingListId: v.id("shoppingLists"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    await requireGroupMember(ctx, args.groupId, user._id);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList || shoppingList.groupId !== args.groupId) {
      throw new NotFoundError("shopping list");
    }

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cursor = args.cursor ?? 0;

    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_shopping_list", (q) =>
        q.eq("shoppingListId", args.shoppingListId)
      )
      .order("desc")
      .collect();

    // Manual pagination (since Convex doesn't support offset natively)
    const paginatedItems = items.slice(cursor, cursor + limit + 1);

    let nextCursor: number | undefined;
    if (paginatedItems.length > limit) {
      paginatedItems.pop();
      nextCursor = cursor + limit;
    }

    const transformedItems = paginatedItems.map((item) => ({
      id: item._id,
      name: item.name,
      completed: item.completed,
      createdAt: item._creationTime,
      categoryId: item.categoryId || "other",
      completedAt: item.completedAt,
      completedByGroupMemberId: item.completedByGroupMemberId,
      createdByGroupMemberId: item.createdByGroupMemberId,
    }));

    return {
      items: transformedItems,
      nextCursor,
    };
  },
});

/**
 * Create a shopping list item
 */
export const createShoppingListItem = mutation({
  args: {
    groupId: v.id("groups"),
    shoppingListId: v.id("shoppingLists"),
    name: v.string(),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const membership = await requireGroupMember(ctx, args.groupId, user._id);

    const shoppingList = await ctx.db.get(args.shoppingListId);
    if (!shoppingList || shoppingList.groupId !== args.groupId) {
      throw new NotFoundError("shopping list");
    }

    const validName = validateNotEmpty(args.name, "Item name");

    // For now, skip AI categorization in Convex - can be added via action later
    const categoryId = args.categoryId === "ai-auto-select" ? "other" : (args.categoryId ?? "other");

    const itemId = await ctx.db.insert("shoppingListItems", {
      shoppingListId: args.shoppingListId,
      name: validName,
      categoryId,
      completed: false,
      createdByGroupMemberId: membership._id,
    });

    return itemId;
  },
});

/**
 * Update a shopping list item
 */
export const updateShoppingListItem = mutation({
  args: {
    id: v.id("shoppingListItems"),
    name: v.string(),
    categoryId: v.optional(v.string()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new NotFoundError("shopping list item");
    }

    const shoppingList = await ctx.db.get(item.shoppingListId);
    if (!shoppingList) {
      throw new NotFoundError("shopping list");
    }

    const membership = await getGroupMembership(
      ctx,
      shoppingList.groupId,
      user._id
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this group");
    }

    const validName = validateNotEmpty(args.name, "Item name");
    const categoryId = args.categoryId === "ai-auto-select" ? "other" : (args.categoryId ?? item.categoryId);

    const updates: Record<string, unknown> = {
      name: validName,
      categoryId,
      completed: args.completed,
    };

    // Handle completion status changes
    if (item.completed !== args.completed) {
      if (args.completed) {
        updates.completedByGroupMemberId = membership._id;
        updates.completedAt = Date.now();
      } else {
        updates.completedByGroupMemberId = undefined;
        updates.completedAt = undefined;
      }
    }

    await ctx.db.patch(args.id, updates);

    return args.id;
  },
});

/**
 * Delete a shopping list item
 */
export const deleteShoppingListItem = mutation({
  args: {
    id: v.id("shoppingListItems"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new NotFoundError("shopping list item");
    }

    const shoppingList = await ctx.db.get(item.shoppingListId);
    if (!shoppingList) {
      throw new NotFoundError("shopping list");
    }

    await requireGroupMember(ctx, shoppingList.groupId, user._id);

    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Update last used group/shopping list
 */
export const updateLastUsed = mutation({
  args: {
    groupId: v.optional(v.id("groups")),
    shoppingListId: v.optional(v.id("shoppingLists")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const updates: Record<string, Id<"groups"> | Id<"shoppingLists"> | undefined> = {};

    if (args.groupId !== undefined) {
      updates.lastGroupUsed = args.groupId;
      // Reset shopping list if only group is updated
      if (args.shoppingListId === undefined) {
        updates.lastShoppingListUsed = undefined;
      }
    }

    if (args.shoppingListId !== undefined) {
      updates.lastShoppingListUsed = args.shoppingListId;
    }

    // If both are undefined, clear both
    if (args.groupId === undefined && args.shoppingListId === undefined) {
      updates.lastGroupUsed = undefined;
      updates.lastShoppingListUsed = undefined;
    }

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
});
