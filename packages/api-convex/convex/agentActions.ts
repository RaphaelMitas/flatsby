import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { flatsbyAgent, type AgentContext } from "./agent";
import { authComponent } from "./auth";
import { UnauthorizedError, NotFoundError, ForbiddenError } from "./helpers";

/**
 * Internal query to get user by email
 */
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Internal query to get a conversation
 */
export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Internal mutation to create a new conversation
 */
export const createConversationInternal = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title,
      model: args.model,
    });
  },
});

/**
 * Internal mutation to update conversation title
 */
export const updateConversationTitleInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

/**
 * Internal mutation to save a message
 */
export const saveMessageInternal = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error")
    ),
    model: v.optional(v.string()),
    cost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      status: args.status,
      model: args.model,
      cost: args.cost,
    });
  },
});

/**
 * Internal query to get conversation messages
 */
export const getConversationMessagesInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
  },
});

/**
 * Chat with the Flatsby agent
 * This action handles the AI conversation flow
 */
export const chatWithAgent = action({
  args: {
    conversationId: v.optional(v.id("conversations")),
    message: v.string(),
    model: v.optional(v.string()),
    // Context for tools
    groupId: v.optional(v.id("groups")),
    shoppingListId: v.optional(v.id("shoppingLists")),
  },
  handler: async (ctx, args): Promise<{
    conversationId: Id<"conversations">;
    response: string;
    messageId: Id<"chatMessages">;
  }> => {
    // Get authenticated user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new UnauthorizedError();
    }

    // Get user from our table
    const user = await ctx.runQuery(internal.agentActions.getUserByEmail, {
      email: authUser.email,
    });
    if (!user) {
      throw new UnauthorizedError();
    }

    // Get or create conversation
    let conversationId = args.conversationId;
    if (!conversationId) {
      const model = args.model ?? user.lastChatModelUsed ?? "google/gemini-2.0-flash";
      conversationId = await ctx.runMutation(internal.agentActions.createConversationInternal, {
        userId: user._id,
        model,
      });
    } else {
      // Verify conversation belongs to user
      const conversation = await ctx.runQuery(internal.agentActions.getConversationInternal, {
        conversationId,
      });
      if (!conversation) {
        throw new NotFoundError("conversation");
      }
      if (conversation.userId !== user._id) {
        throw new ForbiddenError("You don't have access to this conversation");
      }
    }

    // Save user message
    await ctx.runMutation(internal.agentActions.saveMessageInternal, {
      conversationId,
      role: "user",
      content: args.message,
      status: "complete",
    });

    // Get conversation history for context
    const messages = await ctx.runQuery(internal.agentActions.getConversationMessagesInternal, {
      conversationId,
    });

    // Build context for the agent
    const agentContext: AgentContext = {
      userId: user._id,
      groupId: args.groupId ?? user.lastGroupUsed,
      shoppingListId: args.shoppingListId ?? user.lastShoppingListUsed,
    };

    // Add context to the system prompt
    let contextPrompt = "";
    if (agentContext.shoppingListId) {
      contextPrompt += `\nCurrent shopping list ID: ${agentContext.shoppingListId}`;
    }
    if (agentContext.groupId) {
      contextPrompt += `\nCurrent group ID: ${agentContext.groupId}`;
    }

    // Format messages for the agent
    const formattedMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Add context as system message if we have context
    if (contextPrompt) {
      formattedMessages.unshift({
        role: "system" as const,
        content: `Context for this conversation:${contextPrompt}`,
      });
    }

    // Generate response using the agent
    const { thread } = await flatsbyAgent.run(ctx, {
      userId: user._id,
      messages: formattedMessages,
    });

    // Get the last message from the thread (the agent's response)
    const threadMessages = await thread.getMessages(ctx);
    const lastMessage = threadMessages[threadMessages.length - 1];
    const responseContent = lastMessage?.content ?? "I apologize, but I couldn't generate a response.";

    // Save assistant response
    const messageId = await ctx.runMutation(internal.agentActions.saveMessageInternal, {
      conversationId,
      role: "assistant",
      content: typeof responseContent === "string" ? responseContent : JSON.stringify(responseContent),
      status: "complete",
    });

    // Generate title if this is a new conversation (only 2 messages: user + assistant)
    if (messages.length <= 1) {
      const titlePrompt = `Generate a very short title (3-5 words) for a conversation that starts with: "${args.message.substring(0, 100)}"`;
      try {
        const { thread: titleThread } = await flatsbyAgent.run(ctx, {
          userId: user._id,
          messages: [{ role: "user", content: titlePrompt }],
        });
        const titleMessages = await titleThread.getMessages(ctx);
        const titleResponse = titleMessages[titleMessages.length - 1]?.content;
        if (titleResponse && typeof titleResponse === "string") {
          const title = titleResponse.replace(/["']/g, "").trim().substring(0, 100);
          await ctx.runMutation(internal.agentActions.updateConversationTitleInternal, {
            conversationId,
            title,
          });
        }
      } catch (e) {
        // Title generation is optional, don't fail the whole request
        console.error("Failed to generate title:", e);
      }
    }

    return {
      conversationId,
      response: typeof responseContent === "string" ? responseContent : JSON.stringify(responseContent),
      messageId,
    };
  },
});

/**
 * Stream chat with the agent (for real-time updates)
 */
export const streamChatWithAgent = action({
  args: {
    conversationId: v.id("conversations"),
    message: v.string(),
    groupId: v.optional(v.id("groups")),
    shoppingListId: v.optional(v.id("shoppingLists")),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new UnauthorizedError();
    }

    // Get user from our table
    const user = await ctx.runQuery(internal.agentActions.getUserByEmail, {
      email: authUser.email,
    });
    if (!user) {
      throw new UnauthorizedError();
    }

    // Verify conversation belongs to user
    const conversation = await ctx.runQuery(internal.agentActions.getConversationInternal, {
      conversationId: args.conversationId,
    });
    if (!conversation) {
      throw new NotFoundError("conversation");
    }
    if (conversation.userId !== user._id) {
      throw new ForbiddenError("You don't have access to this conversation");
    }

    // Save user message
    await ctx.runMutation(internal.agentActions.saveMessageInternal, {
      conversationId: args.conversationId,
      role: "user",
      content: args.message,
      status: "complete",
    });

    // Build context
    const agentContext: AgentContext = {
      userId: user._id,
      groupId: args.groupId ?? user.lastGroupUsed,
      shoppingListId: args.shoppingListId ?? user.lastShoppingListUsed,
    };

    // Get conversation history
    const messages = await ctx.runQuery(internal.agentActions.getConversationMessagesInternal, {
      conversationId: args.conversationId,
    });

    // Format messages
    const formattedMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Add context
    let contextPrompt = "";
    if (agentContext.shoppingListId) {
      contextPrompt += `\nCurrent shopping list ID: ${agentContext.shoppingListId}`;
    }
    if (agentContext.groupId) {
      contextPrompt += `\nCurrent group ID: ${agentContext.groupId}`;
    }

    if (contextPrompt) {
      formattedMessages.unshift({
        role: "system" as const,
        content: `Context for this conversation:${contextPrompt}`,
      });
    }

    // Stream response using the agent
    const result = await flatsbyAgent.run(ctx, {
      userId: user._id,
      messages: formattedMessages,
      stream: true,
    });

    // Collect the stream
    let fullResponse = "";
    const stream = result.stream;
    if (stream) {
      for await (const chunk of stream) {
        if (chunk.type === "text-delta") {
          fullResponse += chunk.textDelta;
        }
      }
    } else {
      // Fallback to non-streaming response
      const threadMessages = await result.thread.getMessages(ctx);
      const lastMessage = threadMessages[threadMessages.length - 1];
      fullResponse = typeof lastMessage?.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content ?? "");
    }

    // Save assistant response
    const messageId = await ctx.runMutation(internal.agentActions.saveMessageInternal, {
      conversationId: args.conversationId,
      role: "assistant",
      content: fullResponse,
      status: "complete",
    });

    return {
      conversationId: args.conversationId,
      response: fullResponse,
      messageId,
    };
  },
});
