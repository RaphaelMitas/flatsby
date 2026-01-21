import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";

// Error types for consistent error handling
export class NotFoundError extends ConvexError<{ type: "NotFound"; resource: string }> {
  constructor(resource: string) {
    super({ type: "NotFound", resource });
  }
}

export class ForbiddenError extends ConvexError<{ type: "Forbidden"; message: string }> {
  constructor(message: string) {
    super({ type: "Forbidden", message });
  }
}

export class UnauthorizedError extends ConvexError<{ type: "Unauthorized" }> {
  constructor() {
    super({ type: "Unauthorized" });
  }
}

export class ValidationError extends ConvexError<{ type: "Validation"; field: string; message: string }> {
  constructor(field: string, message: string) {
    super({ type: "Validation", field, message });
  }
}

export class ConflictError extends ConvexError<{ type: "Conflict"; message: string }> {
  constructor(message: string) {
    super({ type: "Conflict", message });
  }
}

/**
 * Get authenticated user using Better Auth
 * Returns the auth user and the corresponding app user from our users table
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<{ authUser: NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>; user: Doc<"users"> }> {
  const authUser = await authComponent.getAuthUser(ctx);

  if (!authUser) {
    throw new UnauthorizedError();
  }

  // Get the user from our app's users table
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", authUser.email))
    .first();

  if (!user) {
    throw new UnauthorizedError();
  }

  return { authUser, user };
}

/**
 * Get group membership for a user
 * Returns null if user is not a member
 */
export async function getGroupMembership(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">
): Promise<Doc<"groupMembers"> | null> {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId)
    )
    .first();
}

/**
 * Require group membership - throws if user is not a member
 */
export async function requireGroupMember(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">
): Promise<Doc<"groupMembers">> {
  const membership = await getGroupMembership(ctx, groupId, userId);
  if (!membership) {
    throw new ForbiddenError("You are not a member of this group");
  }
  return membership;
}

/**
 * Require admin role in group - throws if user is not an admin
 */
export async function requireGroupAdmin(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">
): Promise<Doc<"groupMembers">> {
  const membership = await requireGroupMember(ctx, groupId, userId);
  if (membership.role !== "admin") {
    throw new ForbiddenError("You need admin privileges for this action");
  }
  return membership;
}

/**
 * Count admins in a group
 */
export async function countGroupAdmins(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">
): Promise<number> {
  const members = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  return members.filter((m) => m.role === "admin").length;
}

/**
 * Get all members of a group with user info
 */
export async function getGroupMembersWithUsers(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">
) {
  const members = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();

  return await Promise.all(
    members.map(async (member) => {
      const user = await ctx.db.get(member.userId);
      return {
        ...member,
        user: user
          ? {
              id: user._id,
              email: user.email,
              name: user.name,
              image: user.image,
            }
          : null,
      };
    })
  );
}

/**
 * Validate that a string is not empty
 */
export function validateNotEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(fieldName, `${fieldName} cannot be empty`);
  }
  return trimmed;
}
