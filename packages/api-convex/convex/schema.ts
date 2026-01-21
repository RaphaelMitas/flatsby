import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Tool call types for chat messages
const toolCallValidator = v.object({
  id: v.string(),
  type: v.literal("function"),
  function: v.object({
    name: v.string(),
    arguments: v.string(),
  }),
  result: v.optional(v.string()),
  status: v.optional(
    v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected"))
  ),
});

export default defineSchema({
  // Auth tables (Better Auth compatible)
  users: defineTable({
    // Better Auth fields
    email: v.string(),
    emailVerified: v.boolean(),
    name: v.string(),
    image: v.optional(v.string()),
    // App-specific fields
    lastGroupUsed: v.optional(v.id("groups")),
    lastShoppingListUsed: v.optional(v.id("shoppingLists")),
    lastChatModelUsed: v.optional(v.string()),
    lastShoppingListToolsEnabled: v.optional(v.boolean()),
    lastExpenseToolsEnabled: v.optional(v.boolean()),
  })
    .index("by_email", ["email"]),

  accounts: defineTable({
    userId: v.id("users"),
    accountId: v.string(),
    providerId: v.string(), // "google" | "apple"
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    password: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_provider", ["providerId", "accountId"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  verificationTokens: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
  })
    .index("by_identifier", ["identifier"]),

  // Group management
  groups: defineTable({
    name: v.string(),
    profilePicture: v.optional(v.string()),
  }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedOn: v.number(), // timestamp
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"]),

  // Shopping lists
  shoppingLists: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_group", ["groupId"]),

  shoppingListItems: defineTable({
    shoppingListId: v.id("shoppingLists"),
    name: v.string(),
    categoryId: v.string(), // default "other"
    createdByGroupMemberId: v.optional(v.id("groupMembers")),
    completed: v.boolean(),
    completedByGroupMemberId: v.optional(v.id("groupMembers")),
    completedAt: v.optional(v.number()),
  })
    .index("by_shopping_list", ["shoppingListId"])
    .index("by_shopping_list_completed", ["shoppingListId", "completed"]),

  // Expenses
  expenses: defineTable({
    groupId: v.id("groups"),
    paidByGroupMemberId: v.id("groupMembers"),
    amountInCents: v.number(),
    currency: v.string(), // ISO currency code
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    expenseDate: v.number(), // timestamp
    createdByGroupMemberId: v.id("groupMembers"),
    splitMethod: v.union(
      v.literal("equal"),
      v.literal("itemized"),
      v.literal("percentage")
    ),
  })
    .index("by_group", ["groupId"])
    .index("by_group_date", ["groupId", "expenseDate"]),

  expenseSplits: defineTable({
    expenseId: v.id("expenses"),
    groupMemberId: v.id("groupMembers"),
    amountInCents: v.number(),
    percentage: v.optional(v.number()), // basis points 0-10000
  })
    .index("by_expense", ["expenseId"])
    .index("by_group_member", ["groupMemberId"]),

  // Chat
  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.string(), // default "google/gemini-2.0-flash"
    systemPrompt: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_not_deleted", ["userId", "deletedAt"]),

  chatMessages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error")
    ),
    generationId: v.optional(v.string()),
    cost: v.optional(v.number()),
    model: v.optional(v.string()),
    toolCalls: v.optional(v.array(toolCallValidator)),
  })
    .index("by_conversation", ["conversationId"]),
});
