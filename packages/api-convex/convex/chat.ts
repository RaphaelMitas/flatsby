import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  requireAuth,
  NotFoundError,
  ForbiddenError,
} from "./helpers";

// Tool call validator for mutations
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

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const model = args.model ?? user.lastChatModelUsed ?? "google/gemini-2.0-flash";

    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title,
      model,
    });

    // Update user's last used model
    if (args.model) {
      await ctx.db.patch(user._id, { lastChatModelUsed: args.model });
    }

    return { conversationId };
  },
});

/**
 * Get a conversation with all messages
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    // Get all messages for this conversation
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return {
      ...conversation,
      id: conversation._id,
      createdAt: conversation._creationTime,
      messages: messages.map((m) => ({
        ...m,
        id: m._id,
        createdAt: m._creationTime,
      })),
    };
  },
});

/**
 * Get paginated list of user's conversations
 */
export const getUserConversations = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);

    // Get conversations that are not deleted
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Filter out deleted conversations and paginate
    const activeConversations = conversations.filter((c) => !c.deletedAt);
    const paginatedConversations = activeConversations.slice(0, limit + 1);

    const hasMore = paginatedConversations.length > limit;
    const items = hasMore
      ? paginatedConversations.slice(0, limit)
      : paginatedConversations;
    const nextCursor = hasMore ? items[items.length - 1]?._id : undefined;

    return {
      items: items.map((c) => ({
        id: c._id,
        title: c.title,
        model: c.model,
        createdAt: c._creationTime,
        updatedAt: c._creationTime, // Convex doesn't have updatedAt by default
      })),
      nextCursor,
    };
  },
});

/**
 * Update conversation's model
 */
export const updateConversationModel = mutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    await ctx.db.patch(args.conversationId, { model: args.model });

    // Update user's last used model
    await ctx.db.patch(user._id, { lastChatModelUsed: args.model });

    return { conversationId: args.conversationId };
  },
});

/**
 * Soft delete a conversation
 */
export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    // Soft delete
    await ctx.db.patch(args.conversationId, { deletedAt: Date.now() });

    return { success: true };
  },
});

/**
 * Add a message to a conversation
 */
export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      )
    ),
    model: v.optional(v.string()),
    toolCalls: v.optional(v.array(toolCallValidator)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    const messageId = await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      status: args.status ?? "complete",
      model: args.model,
      toolCalls: args.toolCalls,
    });

    return messageId;
  },
});

/**
 * Update a message (for streaming updates)
 */
export const updateMessage = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error")
      )
    ),
    generationId: v.optional(v.string()),
    cost: v.optional(v.number()),
    toolCalls: v.optional(v.array(toolCallValidator)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new NotFoundError("message");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this message");
    }

    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.status !== undefined) updates.status = args.status;
    if (args.generationId !== undefined) updates.generationId = args.generationId;
    if (args.cost !== undefined) updates.cost = args.cost;
    if (args.toolCalls !== undefined) updates.toolCalls = args.toolCalls;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.messageId, updates);
    }

    return args.messageId;
  },
});

/**
 * Update tool call output/status
 */
export const updateToolCallOutput = mutation({
  args: {
    messageId: v.id("chatMessages"),
    toolCallId: v.string(),
    result: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new NotFoundError("message");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this message");
    }

    if (!message.toolCalls) {
      throw new NotFoundError("tool calls");
    }

    // Update the specific tool call
    const updatedToolCalls = message.toolCalls.map((tc) => {
      if (tc.id === args.toolCallId) {
        return {
          ...tc,
          result: args.result ?? tc.result,
          status: args.status,
        };
      }
      return tc;
    });

    await ctx.db.patch(args.messageId, { toolCalls: updatedToolCalls });

    return args.messageId;
  },
});

/**
 * Update conversation title
 */
export const updateConversationTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    await ctx.db.patch(args.conversationId, { title: args.title });

    return { conversationId: args.conversationId };
  },
});

/**
 * Delete messages from a conversation (for regeneration)
 */
export const deleteMessagesAfter = mutation({
  args: {
    conversationId: v.id("conversations"),
    afterMessageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new NotFoundError("conversation");
    }

    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    const afterMessage = await ctx.db.get(args.afterMessageId);
    if (!afterMessage) {
      throw new NotFoundError("message");
    }

    // Get all messages after this one
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const messagesToDelete = messages.filter(
      (m) => m._creationTime > afterMessage._creationTime
    );

    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id);
    }

    return { deletedCount: messagesToDelete.length };
  },
});
