import crypto from "node:crypto";
import type { PersistedToolCall } from "@flatsby/validators/chat";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, desc, eq, isNull, lt } from "@flatsby/db";
import { chatMessages, conversations, users } from "@flatsby/db/schema";
import {
  addToShoppingListInputSchema,
  addToShoppingListResultSchema,
  conversationWithMessagesSchema,
  createConversationInputSchema,
  getConversationInputSchema,
  getShoppingListsInputSchema,
  getShoppingListsResultSchema,
  getUserConversationsInputSchema,
  messageRoleSchema,
  messageStatusSchema,
  sendInputSchema,
} from "@flatsby/validators/chat";
import { chatModelSchema } from "@flatsby/validators/models";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { checkCredits, trackAIUsage } from "../utils/autumn";
import {
  createShoppingListTools,
  SHOPPING_LIST_SYSTEM_PROMPT,
} from "../utils/chat-tools";
import { buildContextMessages } from "../utils/context-builder";
import {
  generateConversationTitle,
  getDefaultModel,
  streamChatCompletion,
  streamChatWithTools,
} from "../utils/model-provider";

// Batched write interval in milliseconds
const FLUSH_INTERVAL = 300;

export const chatRouter = createTRPCRouter({
  /**
   * Get a conversation with all its messages
   */
  getConversation: protectedProcedure
    .input(getConversationInputSchema)
    .output(conversationWithMessagesSchema)
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, ctx.session.user.id),
          isNull(conversations.deletedAt),
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

      return {
        ...conversation,
        messages: conversation.messages.map((m) => ({
          ...m,
          role: messageRoleSchema.parse(m.role),
          status: messageStatusSchema.parse(m.status),
        })),
      };
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
          isNull(conversations.deletedAt),
          input.cursor
            ? lt(conversations.updatedAt, new Date(input.cursor))
            : undefined,
        ),
        orderBy: [desc(conversations.updatedAt)],
        limit: input.limit + 1, // Fetch one extra to check for next page
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.updatedAt.toISOString();
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Create a new conversation
   * Uses user's last model preference if available
   */
  createConversation: protectedProcedure
    .input(createConversationInputSchema)
    .mutation(async ({ ctx, input }) => {
      let modelToUse: string | undefined = input.model;
      if (!modelToUse) {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, ctx.session.user.id),
          columns: { lastChatModelUsed: true },
        });
        modelToUse = user?.lastChatModelUsed ?? getDefaultModel();
      }

      const [conversation] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.session.user.id,
          title: input.title,
          model: modelToUse,
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
   * Update conversation model and save as user's preference
   */
  updateConversationModel: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        model: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      await ctx.db
        .update(conversations)
        .set({ model: input.model })
        .where(eq(conversations.id, input.conversationId));

      await ctx.db
        .update(users)
        .set({ lastChatModelUsed: input.model })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  /**
   * Soft delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, ctx.session.user.id),
          isNull(conversations.deletedAt),
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await ctx.db
        .update(conversations)
        .set({ deletedAt: new Date() })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  /**
   * Combined streaming mutation that:
   * 1. Inserts user message (if submit trigger)
   * 2. Creates/resets assistant placeholder
   * 3. Builds context
   * 4. Streams response with batched persistence
   * 5. Yields UI message chunks
   * 6. Updates conversation model and user preference if model changed
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

    // Check credits before AI generation (applies to all triggers)
    const { allowed } = await checkCredits({
      authApi: ctx.authApi,
      headers: ctx.headers,
    });

    if (!allowed) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "You've run out of credits. Please upgrade your plan to continue.",
      });
    }

    // Use provided model or fall back to conversation's model
    const modelToUse = input.model ?? conversation.model ?? getDefaultModel();

    // Update conversation model if changed
    if (input.model && input.model !== conversation.model) {
      await ctx.db
        .update(conversations)
        .set({ model: input.model })
        .where(eq(conversations.id, input.conversationId));

      // Save as user's last used model preference
      await ctx.db
        .update(users)
        .set({ lastChatModelUsed: input.model })
        .where(eq(users.id, ctx.session.user.id));
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

      // Create assistant placeholder with generated ID
      const [assistantMessage] = await ctx.db
        .insert(chatMessages)
        .values({
          id: crypto.randomUUID(),
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

      // Auto-generate title on first message if conversation has no title
      if (!conversation.title) {
        // Run title generation in background (don't await)
        void generateConversationTitle(input.message.content)
          .then(async (title) => {
            await ctx.db
              .update(conversations)
              .set({ title })
              .where(eq(conversations.id, input.conversationId));
          })
          .catch((error) => {
            console.error("Failed to generate conversation title:", error);
          });
      }
    } else {
      // Regenerate: reset the existing message
      if (!input.messageId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "messageId is required for regeneration",
        });
      }

      // Reset the message content and status
      const updateResult = await ctx.db
        .update(chatMessages)
        .set({
          content: "",
          status: "pending",
        })
        .where(
          and(
            eq(chatMessages.id, input.messageId),
            eq(chatMessages.conversationId, input.conversationId),
          ),
        )
        .returning({ id: chatMessages.id });

      if (updateResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found in this conversation",
        });
      }

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
    let streamCompleted = false;

    // Check if shopping list tools should be enabled
    const toolsEnabled = input.settings?.shoppingListToolEnabled ?? false;

    try {
      // Update status to streaming
      await ctx.db
        .update(chatMessages)
        .set({ status: "streaming" })
        .where(eq(chatMessages.id, assistantMessageId));

      if (toolsEnabled) {
        // Use streaming with tools
        const tools = createShoppingListTools(ctx);
        const systemPrompt = conversation.systemPrompt
          ? `${conversation.systemPrompt}\n\n${SHOPPING_LIST_SYSTEM_PROMPT}`
          : SHOPPING_LIST_SYSTEM_PROMPT;

        const streamResult = streamChatWithTools(contextMessages, {
          model: modelToUse,
          systemPrompt,
          tools,
          maxSteps: 5,
        });

        // Track pending tool calls until we receive their results
        const pendingToolCalls = new Map<
          string,
          { name: string; input: unknown }
        >();
        const completedToolCalls: PersistedToolCall[] = [];

        for await (const chunk of streamResult.fullStream) {
          console.log("[DEBUG] Stream chunk:", chunk.type, chunk);
          if (chunk.type === "text-delta") {
            buffer += chunk.text;

            // Batch writes every FLUSH_INTERVAL ms
            if (Date.now() - lastFlush > FLUSH_INTERVAL) {
              await ctx.db
                .update(chatMessages)
                .set({ content: buffer })
                .where(eq(chatMessages.id, assistantMessageId));
              lastFlush = Date.now();
            }

            yield {
              type: "text-delta" as const,
              textDelta: chunk.text,
            };
          } else if (chunk.type === "tool-call") {
            // Store pending tool call for later completion
            pendingToolCalls.set(chunk.toolCallId, {
              name: chunk.toolName,
              input: chunk.input,
            });

            yield {
              type: "tool-call" as const,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: chunk.input as Record<string, unknown>,
            };
          } else if (chunk.type === "tool-result") {
            // Complete the tool call with its output using safeParse
            const pending = pendingToolCalls.get(chunk.toolCallId);
            console.log("[DEBUG] tool-result pending:", pending);
            if (pending) {
              if (pending.name === "getShoppingLists") {
                const inputResult = getShoppingListsInputSchema.safeParse(
                  pending.input,
                );
                const outputResult = getShoppingListsResultSchema.safeParse(
                  chunk.output,
                );
                console.log("[DEBUG] getShoppingLists parse:", {
                  inputSuccess: inputResult.success,
                  inputError: !inputResult.success && inputResult.error,
                  outputSuccess: outputResult.success,
                  outputError: !outputResult.success && outputResult.error,
                });
                if (inputResult.success && outputResult.success) {
                  completedToolCalls.push({
                    id: chunk.toolCallId,
                    name: "getShoppingLists",
                    input: inputResult.data,
                    output: outputResult.data,
                  });
                }
              } else if (pending.name === "addToShoppingList") {
                const inputResult = addToShoppingListInputSchema.safeParse(
                  pending.input,
                );
                const outputResult = addToShoppingListResultSchema.safeParse(
                  chunk.output,
                );
                console.log("[DEBUG] addToShoppingList parse:", {
                  inputSuccess: inputResult.success,
                  inputError: !inputResult.success && inputResult.error,
                  outputSuccess: outputResult.success,
                  outputError: !outputResult.success && outputResult.error,
                });
                if (inputResult.success && outputResult.success) {
                  completedToolCalls.push({
                    id: chunk.toolCallId,
                    name: "addToShoppingList",
                    input: inputResult.data,
                    output: outputResult.data,
                  });
                }
              }
              pendingToolCalls.delete(chunk.toolCallId);
            }

            yield {
              type: "tool-result" as const,
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              result: chunk.output as unknown,
            };
          }
        }

        streamCompleted = true;

        // Extract cost and generation info from provider metadata
        const metadata = await streamResult.providerMetadata;
        const gateway = metadata?.gateway as
          | {
              cost?: string;
              generationId?: string;
            }
          | undefined;

        // Final write with complete status and tool calls
        console.log("[DEBUG] Persisting tool calls:", completedToolCalls);
        await ctx.db
          .update(chatMessages)
          .set({
            content: buffer,
            status: "complete",
            model: streamResult.model,
            cost: gateway?.cost ? parseFloat(gateway.cost) : null,
            generationId: gateway?.generationId ?? null,
            toolCalls:
              completedToolCalls.length > 0 ? completedToolCalls : null,
          })
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
          messageId: assistantMessageId,
          model: chatModelSchema.safeParse(streamResult.model).data,
          cost: gateway?.cost ? parseFloat(gateway.cost) : null,
        };

        // Track credits
        await trackAIUsage({
          authApi: ctx.authApi,
          headers: ctx.headers,
          cost: gateway?.cost,
        });
      } else {
        // Standard streaming without tools
        const streamResult = streamChatCompletion(contextMessages, {
          model: modelToUse,
        });

        for await (const chunk of streamResult.textStream) {
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

        streamCompleted = true;

        // Extract cost and generation info from provider metadata
        const metadata = await streamResult.providerMetadata;
        const gateway = metadata?.gateway as
          | {
              cost?: string;
              generationId?: string;
            }
          | undefined;

        // Final write with complete status, cost, model, and generationId
        await ctx.db
          .update(chatMessages)
          .set({
            content: buffer,
            status: "complete",
            model: streamResult.model,
            cost: gateway?.cost ? parseFloat(gateway.cost) : null,
            generationId: gateway?.generationId ?? null,
          })
          .where(eq(chatMessages.id, assistantMessageId));

        // Update conversation updatedAt timestamp
        await ctx.db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, input.conversationId));

        // Yield finish event with cost/model for immediate UI update
        yield {
          type: "finish" as const,
          content: buffer,
          status: "complete" as const,
          messageId: assistantMessageId,
          model: chatModelSchema.safeParse(streamResult.model).data,
          cost: gateway?.cost ? parseFloat(gateway.cost) : null,
        };

        // Track credits after successful completion (applies to all triggers)
        await trackAIUsage({
          authApi: ctx.authApi,
          headers: ctx.headers,
          cost: gateway?.cost,
        });
      }
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
    } finally {
      // Ensure we save content even if client disconnects mid-stream
      if (!streamCompleted && buffer.length > 0) {
        await ctx.db
          .update(chatMessages)
          .set({ content: buffer, status: "complete" })
          .where(eq(chatMessages.id, assistantMessageId));
      }
    }
  }),
});
