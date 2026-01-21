import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireAuth,
  requireGroupMember,
  requireGroupAdmin,
  getGroupMembership,
  getGroupMembersWithUsers,
  countGroupAdmins,
  validateNotEmpty,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "./helpers";

/**
 * Get all groups for the current user
 */
export const getUserGroups = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    // Get all group memberships for the user
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get group details with member counts
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        const memberCount = (
          await ctx.db
            .query("groupMembers")
            .withIndex("by_group", (q) => q.eq("groupId", group._id))
            .collect()
        ).length;

        return {
          id: group._id,
          name: group.name,
          createdAt: group._creationTime,
          profilePicture: group.profilePicture,
          memberCount,
        };
      })
    );

    return groups.filter((g) => g !== null);
  },
});

/**
 * Get a single group with full details
 */
export const getGroup = query({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupMember(ctx, args.groupId, user._id);

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new NotFoundError("group");
    }

    const membersWithUsers = await getGroupMembersWithUsers(ctx, args.groupId);

    return {
      ...group,
      id: group._id,
      createdAt: group._creationTime,
      groupMembers: membersWithUsers,
    };
  },
});

/**
 * Create a new group
 */
export const createGroup = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    const validName = validateNotEmpty(args.name, "Group name");

    // Create the group
    const groupId = await ctx.db.insert("groups", {
      name: validName,
    });

    // Add the user as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: "admin",
      joinedOn: Date.now(),
    });

    return { groupId };
  },
});

/**
 * Add a member to a group by email
 */
export const addGroupMember = mutation({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
    memberEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupAdmin(ctx, args.groupId, user._id);

    // Find user by email
    const userToAdd = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.memberEmail))
      .first();

    if (!userToAdd) {
      throw new NotFoundError("user");
    }

    // Check if already a member
    const existingMembership = await getGroupMembership(
      ctx,
      args.groupId,
      userToAdd._id
    );
    if (existingMembership) {
      throw new ConflictError("This user is already a member of the group");
    }

    // Add the member
    const memberId = await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: userToAdd._id,
      role: "member",
      joinedOn: Date.now(),
    });

    return { memberId };
  },
});

/**
 * Remove a member from a group
 */
export const removeGroupMember = mutation({
  args: {
    sessionToken: v.string(),
    memberId: v.id("groupMembers"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    // Get the target member
    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) {
      throw new NotFoundError("group member");
    }

    // Get current user's membership
    const currentUserMembership = await getGroupMembership(
      ctx,
      targetMember.groupId,
      user._id
    );
    if (!currentUserMembership) {
      throw new ForbiddenError("You are not a member of this group");
    }

    // Check authorization: admin can remove anyone, members can only remove themselves
    const isAdmin = currentUserMembership.role === "admin";
    const isSelf = currentUserMembership._id === args.memberId;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenError(
        "Only group admins can remove other members. You can only remove yourself."
      );
    }

    // If removing an admin (including self), ensure it's not the last admin
    if (targetMember.role === "admin") {
      const adminCount = await countGroupAdmins(ctx, targetMember.groupId);
      if (adminCount <= 1) {
        throw new ForbiddenError(
          "Cannot remove the last admin. Promote another member to admin first."
        );
      }
    }

    // Clean up shopping list item references
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_group", (q) => q.eq("groupId", targetMember.groupId))
      .collect();

    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("shoppingListItems")
        .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", list._id))
        .collect();

      for (const item of items) {
        const updates: Record<string, unknown> = {};
        if (item.completedByGroupMemberId === args.memberId) {
          updates.completedByGroupMemberId = undefined;
        }
        if (item.createdByGroupMemberId === args.memberId) {
          updates.createdByGroupMemberId = undefined;
        }
        if (Object.keys(updates).length > 0) {
          await ctx.db.patch(item._id, updates);
        }
      }
    }

    // Remove the member
    await ctx.db.delete(args.memberId);

    return { success: true };
  },
});

/**
 * Update a member's role
 */
export const updateMemberRole = mutation({
  args: {
    sessionToken: v.string(),
    memberId: v.id("groupMembers"),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);

    // Get the target member
    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) {
      throw new NotFoundError("group member");
    }

    // Ensure current user is admin
    await requireGroupAdmin(ctx, targetMember.groupId, user._id);

    // If demoting an admin, ensure it's not the last admin
    if (targetMember.role === "admin" && args.newRole === "member") {
      const adminCount = await countGroupAdmins(ctx, targetMember.groupId);
      if (adminCount <= 1) {
        throw new ForbiddenError(
          "Cannot demote the last admin. Promote another member first."
        );
      }
    }

    // Update the role
    await ctx.db.patch(args.memberId, { role: args.newRole });

    return { memberId: args.memberId };
  },
});

/**
 * Change group name
 */
export const changeGroupName = mutation({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupAdmin(ctx, args.groupId, user._id);

    const validName = validateNotEmpty(args.name, "Group name");

    await ctx.db.patch(args.groupId, { name: validName });

    return { groupId: args.groupId };
  },
});

/**
 * Delete a group and all related data
 */
export const deleteGroup = mutation({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupAdmin(ctx, args.groupId, user._id);

    // Get all shopping lists for this group
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Delete all shopping list items
    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("shoppingListItems")
        .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", list._id))
        .collect();

      for (const item of items) {
        await ctx.db.delete(item._id);
      }

      // Delete the shopping list
      await ctx.db.delete(list._id);
    }

    // Delete all expenses and splits
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
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

    // Clear lastGroupUsed references from users
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of members) {
      const memberUser = await ctx.db.get(member.userId);
      if (memberUser && memberUser.lastGroupUsed === args.groupId) {
        await ctx.db.patch(member.userId, {
          lastGroupUsed: undefined,
          lastShoppingListUsed: undefined,
        });
      }
    }

    // Delete group members
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);

    return { groupId: args.groupId };
  },
});

/**
 * Get recent activity for a group
 */
export const getRecentActivity = query({
  args: {
    sessionToken: v.string(),
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx, args.sessionToken);
    await requireGroupMember(ctx, args.groupId, user._id);

    const limit = args.limit ?? 10;

    // Get recent expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(limit);

    const expenseActivities = await Promise.all(
      expenses.map(async (expense) => {
        const createdBy = await ctx.db.get(expense.createdByGroupMemberId);
        const createdByUser = createdBy
          ? await ctx.db.get(createdBy.userId)
          : null;

        return {
          type: "expense" as const,
          id: `expense-${expense._id}`,
          timestamp: expense._creationTime,
          user: createdByUser
            ? {
                email: createdByUser.email,
                name: createdByUser.name,
                image: createdByUser.image,
              }
            : null,
          data: {
            expenseId: expense._id,
            amountInCents: expense.amountInCents,
            currency: expense.currency,
            description: expense.description,
          },
        };
      })
    );

    // Get shopping lists and recent items
    const shoppingLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const shoppingActivities: Array<{
      type: "shopping_item_created" | "shopping_item_completed";
      id: string;
      timestamp: number;
      user: { email: string; name: string; image?: string } | null;
      data: {
        itemId: Id<"shoppingListItems">;
        itemName: string;
        shoppingListName: string;
      };
    }> = [];

    for (const list of shoppingLists) {
      const items = await ctx.db
        .query("shoppingListItems")
        .withIndex("by_shopping_list", (q) => q.eq("shoppingListId", list._id))
        .order("desc")
        .take(limit * 2);

      for (const item of items) {
        // Add created activity
        if (item.createdByGroupMemberId) {
          const createdBy = await ctx.db.get(item.createdByGroupMemberId);
          const createdByUser = createdBy
            ? await ctx.db.get(createdBy.userId)
            : null;

          shoppingActivities.push({
            type: "shopping_item_created",
            id: `shopping-item-created-${item._id}`,
            timestamp: item._creationTime,
            user: createdByUser
              ? {
                  email: createdByUser.email,
                  name: createdByUser.name,
                  image: createdByUser.image,
                }
              : null,
            data: {
              itemId: item._id,
              itemName: item.name,
              shoppingListName: list.name,
            },
          });
        }

        // Add completed activity
        if (item.completed && item.completedAt && item.completedByGroupMemberId) {
          const completedBy = await ctx.db.get(item.completedByGroupMemberId);
          const completedByUser = completedBy
            ? await ctx.db.get(completedBy.userId)
            : null;

          shoppingActivities.push({
            type: "shopping_item_completed",
            id: `shopping-item-completed-${item._id}`,
            timestamp: item.completedAt,
            user: completedByUser
              ? {
                  email: completedByUser.email,
                  name: completedByUser.name,
                  image: completedByUser.image,
                }
              : null,
            data: {
              itemId: item._id,
              itemName: item.name,
              shoppingListName: list.name,
            },
          });
        }
      }
    }

    // Combine and sort all activities
    const allActivities = [...expenseActivities, ...shoppingActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return allActivities;
  },
});
