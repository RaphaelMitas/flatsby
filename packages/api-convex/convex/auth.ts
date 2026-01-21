import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { autumn } from "autumn-js/better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import authConfig from "./auth.config";

// Environment variables (set in Convex dashboard):
// - SITE_URL: Your site URL (e.g., http://localhost:3000)
// - BETTER_AUTH_SECRET: Secret for encryption
// - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: Google OAuth
// - APPLE_SERVICE_ID, APPLE_CLIENT_SECRET, APPLE_BUNDLE_ID: Apple OAuth

const siteUrl = process.env.SITE_URL!;

// The component client has methods needed for integrating Convex with Better Auth
export const authComponent = createClient<DataModel>(components.betterAuth);

/**
 * Create the Better Auth instance with all plugins
 */
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),

    // OAuth providers
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${siteUrl}/api/auth/callback/google`,
      },
      apple: {
        clientId: process.env.APPLE_SERVICE_ID!,
        clientSecret: process.env.APPLE_CLIENT_SECRET!,
        redirectURI: `${siteUrl}/api/auth/callback/apple`,
        appBundleIdentifier: process.env.APPLE_BUNDLE_ID,
      },
    },

    // Trusted origins for mobile apps
    trustedOrigins: ["flatsby://", "exp://"],

    plugins: [
      // Convex plugin is required for Convex compatibility
      convex({ authConfig }),
      // Expo plugin for React Native support
      expo(),
      // Autumn plugin for billing/credits
      autumn(),
    ],
  });
};

/**
 * Get the currently authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

/**
 * Get current user with additional app data (groups, preferences)
 */
export const getCurrentUserWithData = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Get user's additional data from our users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    if (!user) {
      return { ...authUser, groups: [], preferences: null };
    }

    // Get user's group memberships
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m) => {
        const group = await ctx.db.get(m.groupId);
        return group ? { id: group._id, name: group.name, role: m.role } : null;
      })
    );

    // Get last used preferences
    const lastGroup = user.lastGroupUsed
      ? await ctx.db.get(user.lastGroupUsed)
      : null;
    const lastShoppingList = user.lastShoppingListUsed
      ? await ctx.db.get(user.lastShoppingListUsed)
      : null;

    return {
      ...authUser,
      convexUserId: user._id,
      groups: groups.filter((g) => g !== null),
      preferences: {
        lastGroupUsed: lastGroup
          ? { id: lastGroup._id, name: lastGroup.name }
          : null,
        lastShoppingListUsed: lastShoppingList
          ? { id: lastShoppingList._id, name: lastShoppingList.name }
          : null,
        lastChatModelUsed: user.lastChatModelUsed,
        lastShoppingListToolsEnabled: user.lastShoppingListToolsEnabled,
        lastExpenseToolsEnabled: user.lastExpenseToolsEnabled,
      },
    };
  },
});

/**
 * Check credits via Autumn
 */
export const checkCredits = mutation({
  args: {},
  handler: async (ctx) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    try {
      const result = await auth.api.check({
        body: { featureId: "credits" },
        headers,
      });

      return {
        allowed: result?.allowed ?? false,
        balance: result?.balance ?? null,
        usage: result?.usage ?? null,
      };
    } catch (error) {
      console.error("Error checking credits:", error);
      return { allowed: false, balance: null, usage: null };
    }
  },
});

/**
 * Track AI usage via Autumn
 */
export const trackUsage = mutation({
  args: {
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.credits <= 0) {
      return { success: true };
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    try {
      await auth.api.track({
        body: { featureId: "credits", value: args.credits },
        headers,
      });
      return { success: true };
    } catch (error) {
      console.error("Error tracking usage:", error);
      return { success: false };
    }
  },
});

/**
 * Sync Better Auth user to app users table
 * Called after successful authentication to ensure user exists in our app tables
 */
export const syncAuthUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Check if user exists in our users table
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    if (existingUser) {
      // Update name/image if changed
      await ctx.db.patch(existingUser._id, {
        name: authUser.name,
        image: authUser.image ?? undefined,
        emailVerified: authUser.emailVerified,
      });
      return existingUser._id;
    }

    // Create new user in our app tables
    return await ctx.db.insert("users", {
      email: authUser.email,
      name: authUser.name,
      image: authUser.image ?? undefined,
      emailVerified: authUser.emailVerified,
    });
  },
});
