import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// For now, we'll use a simple session token-based auth
// This can be replaced with Convex Auth or Better Auth integration later

/**
 * Get the current session from a token
 */
export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      session: {
        id: session._id,
        token: session.token,
        expiresAt: session.expiresAt,
      },
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    };
  },
});

/**
 * Get user by ID - internal helper
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Get user by email
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Create a new session
 */
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});

/**
 * Delete a session (logout)
 */
export const deleteSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Create or update user (for OAuth login)
 */
export const upsertUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        emailVerified: args.emailVerified,
        image: args.image,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      emailVerified: args.emailVerified,
      image: args.image,
    });
  },
});

/**
 * Link OAuth account to user
 */
export const linkAccount = mutation({
  args: {
    userId: v.id("users"),
    providerId: v.string(),
    accountId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if account already exists
    const existingAccount = await ctx.db
      .query("accounts")
      .withIndex("by_provider", (q) =>
        q.eq("providerId", args.providerId).eq("accountId", args.accountId)
      )
      .first();

    if (existingAccount) {
      // Update existing account
      await ctx.db.patch(existingAccount._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        idToken: args.idToken,
        accessTokenExpiresAt: args.accessTokenExpiresAt,
        scope: args.scope,
      });
      return existingAccount._id;
    }

    // Create new account link
    return await ctx.db.insert("accounts", {
      userId: args.userId,
      providerId: args.providerId,
      accountId: args.accountId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      idToken: args.idToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      scope: args.scope,
    });
  },
});
