import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  requireAuth,
  validateNotEmpty,
} from "./helpers";

/**
 * Get current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified,
    };
  },
});

/**
 * Get current user with their groups and last used preferences
 */
export const getCurrentUserWithGroups = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    // Get user's group memberships
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get group details
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        return group
          ? {
              id: group._id,
              name: group.name,
              profilePicture: group.profilePicture,
            }
          : null;
      })
    );

    // Get last used group and shopping list
    const lastGroupUsed = user.lastGroupUsed
      ? await ctx.db.get(user.lastGroupUsed)
      : null;

    const lastShoppingListUsed = user.lastShoppingListUsed
      ? await ctx.db.get(user.lastShoppingListUsed)
      : null;

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user._creationTime,
        lastChatModelUsed: user.lastChatModelUsed,
        lastShoppingListToolsEnabled: user.lastShoppingListToolsEnabled,
        lastExpenseToolsEnabled: user.lastExpenseToolsEnabled,
        lastGroupUsed: lastGroupUsed
          ? {
              id: lastGroupUsed._id,
              name: lastGroupUsed.name,
              profilePicture: lastGroupUsed.profilePicture,
              createdAt: lastGroupUsed._creationTime,
            }
          : null,
        lastShoppingListUsed: lastShoppingListUsed
          ? {
              id: lastShoppingListUsed._id,
              name: lastShoppingListUsed.name,
              groupId: lastShoppingListUsed.groupId,
              icon: lastShoppingListUsed.icon,
              description: lastShoppingListUsed.description,
              createdAt: lastShoppingListUsed._creationTime,
            }
          : null,
      },
      groups: groups.filter((g) => g !== null),
    };
  },
});

/**
 * Update user's display name
 */
export const updateUserName = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const validName = validateNotEmpty(args.name, "Name");

    await ctx.db.patch(user._id, { name: validName });

    return { userId: user._id };
  },
});

/**
 * Update user's last used chat model
 */
export const updateLastChatModel = mutation({
  args: {
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    await ctx.db.patch(user._id, { lastChatModelUsed: args.model });

    return { userId: user._id };
  },
});

/**
 * Update user's tool preferences
 */
export const updateToolPreferences = mutation({
  args: {
    shoppingListToolsEnabled: v.optional(v.boolean()),
    expenseToolsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const updates: Record<string, boolean> = {};
    if (args.shoppingListToolsEnabled !== undefined) {
      updates.lastShoppingListToolsEnabled = args.shoppingListToolsEnabled;
    }
    if (args.expenseToolsEnabled !== undefined) {
      updates.lastExpenseToolsEnabled = args.expenseToolsEnabled;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return { userId: user._id };
  },
});

/**
 * Delete user account and all related data
 * Note: This also needs to clean up Better Auth data through authComponent
 */
export const deleteUser = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    // Get all user's group memberships
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const membership of memberships) {
      const groupId = membership.groupId;
      const isAdmin = membership.role === "admin";

      // Get other members of the group
      const otherMembers = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();

      const otherMembersFiltered = otherMembers.filter(
        (m) => m.userId !== user._id
      );
      const otherAdmins = otherMembersFiltered.filter(
        (m) => m.role === "admin"
      );

      // Get shopping lists for this group
      const shoppingLists = await ctx.db
        .query("shoppingLists")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect();

      if (otherMembersFiltered.length > 0) {
        // Clean up shopping list item references
        for (const list of shoppingLists) {
          const items = await ctx.db
            .query("shoppingListItems")
            .withIndex("by_shopping_list", (q) =>
              q.eq("shoppingListId", list._id)
            )
            .collect();

          for (const item of items) {
            const updates: Record<string, unknown> = {};
            if (item.createdByGroupMemberId === membership._id) {
              updates.createdByGroupMemberId = undefined;
            }
            if (item.completedByGroupMemberId === membership._id) {
              updates.completedByGroupMemberId = undefined;
            }
            if (Object.keys(updates).length > 0) {
              await ctx.db.patch(item._id, updates);
            }
          }
        }

        if (isAdmin && otherAdmins.length === 0 && otherMembersFiltered.length > 0) {
          // Promote the oldest member to admin
          const sortedMembers = otherMembersFiltered.sort(
            (a, b) => a.joinedOn - b.joinedOn
          );
          const newAdmin = sortedMembers[0];
          if (newAdmin) {
            await ctx.db.patch(newAdmin._id, { role: "admin" });
          }
        }

        // Remove the membership
        await ctx.db.delete(membership._id);
      } else {
        // User is the last member - delete the entire group

        // Delete shopping list items
        for (const list of shoppingLists) {
          const items = await ctx.db
            .query("shoppingListItems")
            .withIndex("by_shopping_list", (q) =>
              q.eq("shoppingListId", list._id)
            )
            .collect();

          for (const item of items) {
            await ctx.db.delete(item._id);
          }

          await ctx.db.delete(list._id);
        }

        // Delete expenses and splits
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .collect();

        for (const expense of expenses) {
          const splits = await ctx.db
            .query("expenseSplits")
            .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
            .collect();

          for (const split of splits) {
            await ctx.db.delete(split._id);
          }

          await ctx.db.delete(expense._id);
        }

        // Delete group membership
        await ctx.db.delete(membership._id);

        // Delete the group
        await ctx.db.delete(groupId);
      }
    }

    // Delete conversations and messages
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const conv of conversations) {
      const messages = await ctx.db
        .query("chatMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .collect();

      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      await ctx.db.delete(conv._id);
    }

    // Delete the user from our app's users table
    // Note: Better Auth data cleanup happens through authComponent
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
