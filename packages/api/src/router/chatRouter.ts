import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq, lt } from "@flatsby/db";
import { chatMessages, conversations } from "@flatsby/db/schema";
import {
  createConversationInputSchema,
  getConversationInputSchema,
  getUserConversationsInputSchema,
  sendInputSchema,
} from "@flatsby/validators/chat";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { buildContextMessages } from "../utils/context-builder";
import { getDefaultModel, streamChatCompletion } from "../utils/model-provider";

// Batched write interval in milliseconds
const FLUSH_INTERVAL = 300;

export const chatRouter = createTRPCRouter({
  /**
   * Get a conversation with all its messages
   */
  getConversation: protectedProcedure
    .input(getConversationInputSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, ctx.session.user.id),
        ),
        with: {
          messages: {
            orderBy: [chatMessages.createdAt],
          },
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conversation;
    }),

  /**
   * Get all conversations for the current user (paginated)
   */
  getUserConversations: protectedProcedure
    .input(getUserConversationsInputSchema)
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.conversations.findMany({
        where: and(
          eq(conversations.userId, ctx.session.user.id),
          input.cursor ? lt(conversations.id, input.cursor) : undefined,
        ),
        orderBy: [desc(conversations.updatedAt)],
        limit: input.limit + 1, // Fetch one extra to check for next page
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(createConversationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.session.user.id,
          title: input.title,
          model: input.model ?? getDefaultModel(),
          systemPrompt: input.systemPrompt,
        })
        .returning();

      if (!conversation) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }

      return conversation;
    }),

  /**
   * Combined streaming mutation that:
   * 1. Inserts user message (if submit trigger)
   * 2. Creates/resets assistant placeholder
   * 3. Builds context
   * 4. Streams response with batched persistence
   * 5. Yields UI message chunks
   */
  send: protectedProcedure.input(sendInputSchema).mutation(async function* ({
    ctx,
    input,
  }) {
    // Verify conversation exists and belongs to user
    const conversation = await ctx.db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, input.conversationId),
        eq(conversations.userId, ctx.session.user.id),
      ),
    });

    if (!conversation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    // Handle different triggers
    let assistantMessageId: string;

    if (input.trigger === "submit-message") {
      // Insert user message
      await ctx.db.insert(chatMessages).values({
        id: input.message.id,
        conversationId: input.conversationId,
        role: "user",
        content: input.message.content,
        status: "complete",
      });

      // Create assistant placeholder
      const [assistantMessage] = await ctx.db
        .insert(chatMessages)
        .values({
          conversationId: input.conversationId,
          role: "assistant",
          content: "",
          status: "pending",
        })
        .returning({ id: chatMessages.id });

      if (!assistantMessage) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create assistant message",
        });
      }

      assistantMessageId = assistantMessage.id;
    } else {
      // Regenerate: reset the existing message
      if (!input.messageId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "messageId is required for regeneration",
        });
      }

      // Reset the message content and status
      await ctx.db
        .update(chatMessages)
        .set({
          content: "",
          status: "pending",
        })
        .where(eq(chatMessages.id, input.messageId));

      assistantMessageId = input.messageId;
    }

    // Build context from conversation history
    const contextMessages = await buildContextMessages(
      ctx.db,
      input.conversationId,
    );

    // Add the new user message to context if submitting
    if (input.trigger === "submit-message") {
      contextMessages.push({
        role: "user",
        content: input.message.content,
      });
    }

    // Stream the AI response
    let buffer = "";
    let lastFlush = Date.now();

    try {
      // Update status to streaming
      await ctx.db
        .update(chatMessages)
        .set({ status: "streaming" })
        .where(eq(chatMessages.id, assistantMessageId));

      const stream = streamChatCompletion(contextMessages, {
        model: conversation.model,
      });

      for await (const chunk of stream) {
        buffer += chunk;

        // Batch writes every FLUSH_INTERVAL ms
        if (Date.now() - lastFlush > FLUSH_INTERVAL) {
          await ctx.db
            .update(chatMessages)
            .set({ content: buffer })
            .where(eq(chatMessages.id, assistantMessageId));
          lastFlush = Date.now();
        }

        // Yield chunk to client
        yield {
          type: "text-delta" as const,
          textDelta: chunk,
        };
      }

      // Final write with complete status
      await ctx.db
        .update(chatMessages)
        .set({ content: buffer, status: "complete" })
        .where(eq(chatMessages.id, assistantMessageId));

      // Update conversation updatedAt timestamp
      await ctx.db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, input.conversationId));

      // Yield finish event
      yield {
        type: "finish" as const,
        content: buffer,
        status: "complete" as const,
      };
    } catch (error) {
      // Update message status to error
      await ctx.db
        .update(chatMessages)
        .set({ content: buffer, status: "error" })
        .where(eq(chatMessages.id, assistantMessageId));

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to stream response",
        cause: error,
      });
    }
  }),
});
