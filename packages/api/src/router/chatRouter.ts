import crypto from "node:crypto";
import type { PersistedToolCall } from "@flatsby/validators/chat/tools";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, desc, eq, isNull, lt } from "@flatsby/db";
import { chatMessages, conversations, users } from "@flatsby/db/schema";
import {
  CHAT_MESSAGE_LIMIT,
  conversationWithMessagesSchema,
  createConversationInputSchema,
  DEFAULT_TOOL_PREFERENCES,
  getConversationInputSchema,
  getUserConversationsInputSchema,
  messageRoleSchema,
  messageStatusSchema,
  sendInputSchema,
  toolPreferencesSchema,
} from "@flatsby/validators/chat/messages";
import {
  persistedToolCallOutputUpdateSchema,
  persistedToolCallSchema,
  withUpdatedOutput,
} from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import {
  chatModelSchema,
  modelSupportsTools,
} from "@flatsby/validators/models";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { Database } from "../types";
import { checkCredits, trackAIUsage } from "../utils/autumn";
import { buildToolsSystemPrompt, createChatTools } from "../utils/chat-tools";
import { buildContextMessages } from "../utils/context-builder";
import {
  generateConversationTitle,
  getDefaultModel,
  streamChatCompletion,
  streamChatWithTools,
} from "../utils/model-provider";

// Batched write interval in milliseconds
const FLUSH_INTERVAL = 300;

// Schema for validating gateway metadata from AI providers
const gatewayMetadataSchema = z
  .object({
    cost: z.string().optional(),
    generationId: z.string().optional(),
  })
  .optional();

interface FinalizeStreamParams {
  db: Database;
  assistantMessageId: string;
  conversationId: string;
  buffer: string;
  model: string;
  providerMetadata: PromiseLike<Record<string, unknown> | undefined>;
  completedToolCalls?: PersistedToolCall[];
}

/**
 * Finalizes the stream by persisting the assistant message and updating the conversation.
 * Used by both tools and non-tools paths.
 */
async function finalizeStream({
  db,
  assistantMessageId,
  conversationId,
  buffer,
  model,
  providerMetadata,
  completedToolCalls,
}: FinalizeStreamParams): Promise<{ cost: number | null; model: ChatModel | undefined }> {
  const metadata = await providerMetadata;
  const gatewayResult = gatewayMetadataSchema.safeParse(metadata?.gateway);
  const gateway = gatewayResult.success ? gatewayResult.data : undefined;

  await db
    .update(chatMessages)
    .set({
      content: buffer,
      status: "complete",
      model,
      cost: gateway?.cost ? parseFloat(gateway.cost) : null,
      generationId: gateway?.generationId ?? null,
      toolCalls: completedToolCalls?.length ? completedToolCalls : null,
    })
    .where(eq(chatMessages.id, assistantMessageId));

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return {
    cost: gateway?.cost ? parseFloat(gateway.cost) : null,
    model: chatModelSchema.safeParse(model).data,
  };
}

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
            limit: CHAT_MESSAGE_LIMIT,
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
        conversationId: z.uuid(),
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
    .input(z.object({ conversationId: z.uuid() }))
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
   * Update user's tool preferences (persisted across sessions)
   */
  updateToolPreferences: protectedProcedure
    .input(toolPreferencesSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          ...(input.shoppingListToolsEnabled !== undefined
            ? { lastShoppingListToolsEnabled: input.shoppingListToolsEnabled }
            : {}),
          ...(input.expenseToolsEnabled !== undefined
            ? { lastExpenseToolsEnabled: input.expenseToolsEnabled }
            : {}),
        })
        .where(eq(users.id, ctx.session.user.id));

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

    const modelToUse = input.model ?? conversation.model ?? getDefaultModel();

    if (input.model && input.model !== conversation.model) {
      await ctx.db
        .update(conversations)
        .set({ model: input.model })
        .where(eq(conversations.id, input.conversationId));

      await ctx.db
        .update(users)
        .set({ lastChatModelUsed: input.model })
        .where(eq(users.id, ctx.session.user.id));
    }

    let assistantMessageId: string;

    if (input.trigger === "submit-message") {
      await ctx.db.insert(chatMessages).values({
        id: input.message.id,
        conversationId: input.conversationId,
        role: "user",
        content: input.message.content,
        status: "complete",
      });

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

      if (!conversation.title) {
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
      if (!input.messageId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "messageId is required for regeneration",
        });
      }

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

    const contextMessages = await buildContextMessages(
      ctx.db,
      input.conversationId,
    );

    if (input.trigger === "submit-message") {
      contextMessages.push({
        role: "user",
        content: input.message.content,
      });
    }

    let buffer = "";
    let lastFlush = Date.now();
    let streamCompleted = false;

    const modelCanUseTools = modelSupportsTools(modelToUse);
    const shoppingListToolsEnabled =
      modelCanUseTools &&
      (typeof input.toolPreferences?.shoppingListToolsEnabled === "boolean"
        ? input.toolPreferences.shoppingListToolsEnabled
        : DEFAULT_TOOL_PREFERENCES.shoppingListToolsEnabled);
    const expenseToolsEnabled =
      modelCanUseTools &&
      (typeof input.toolPreferences?.expenseToolsEnabled === "boolean"
        ? input.toolPreferences.expenseToolsEnabled
        : DEFAULT_TOOL_PREFERENCES.expenseToolsEnabled);
    const anyToolsEnabled = shoppingListToolsEnabled || expenseToolsEnabled;
    const groupId = input.groupId;

    try {
      await ctx.db
        .update(chatMessages)
        .set({ status: "streaming" })
        .where(eq(chatMessages.id, assistantMessageId));

      if (anyToolsEnabled && groupId) {
        const toolOptions = {
          shoppingList: shoppingListToolsEnabled,
          expenses: expenseToolsEnabled,
        };
        const tools = createChatTools(ctx, groupId, toolOptions);
        const toolsSystemPrompt = buildToolsSystemPrompt(toolOptions);
        const systemPrompt = conversation.systemPrompt
          ? `${conversation.systemPrompt}\n\n${toolsSystemPrompt}`
          : toolsSystemPrompt;

        const streamResult = streamChatWithTools(contextMessages, {
          model: modelToUse,
          systemPrompt,
          tools,
          maxSteps: 5,
        });

        const pendingToolCalls = new Map<
          string,
          { name: string; input: unknown }
        >();
        const completedToolCalls: PersistedToolCall[] = [];

        for await (const chunk of streamResult.fullStream) {
          if (ctx.signal?.aborted) {
            break;
          }

          if (chunk.type === "text-delta") {
            buffer += chunk.text;

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
            const pending = pendingToolCalls.get(chunk.toolCallId);
            if (pending) {
              // Validate using the discriminated union schema - handles all tool types
              const toolCallResult = persistedToolCallSchema.safeParse({
                id: chunk.toolCallId,
                name: pending.name,
                input: pending.input,
                output: chunk.output as unknown,
              });

              if (toolCallResult.success) {
                completedToolCalls.push(toolCallResult.data);
              } else {
                console.error("[Chat] Tool validation failed:", {
                  toolName: pending.name,
                  toolCallId: chunk.toolCallId,
                  errors: z.flattenError(toolCallResult.error),
                });
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

        const { cost, model } = await finalizeStream({
          db: ctx.db,
          assistantMessageId,
          conversationId: input.conversationId,
          buffer,
          model: streamResult.model,
          providerMetadata: streamResult.providerMetadata,
          completedToolCalls,
        });

        yield {
          type: "finish" as const,
          content: buffer,
          status: "complete" as const,
          messageId: assistantMessageId,
          model,
          cost,
        };

        await trackAIUsage({
          authApi: ctx.authApi,
          headers: ctx.headers,
          cost: cost?.toString(),
        });
      } else {
        const streamResult = streamChatCompletion(contextMessages, {
          model: modelToUse,
        });

        for await (const chunk of streamResult.textStream) {
          if (ctx.signal?.aborted) {
            break;
          }

          buffer += chunk;

          if (Date.now() - lastFlush > FLUSH_INTERVAL) {
            await ctx.db
              .update(chatMessages)
              .set({ content: buffer })
              .where(eq(chatMessages.id, assistantMessageId));
            lastFlush = Date.now();
          }

          yield {
            type: "text-delta" as const,
            textDelta: chunk,
          };
        }

        streamCompleted = true;

        const { cost, model } = await finalizeStream({
          db: ctx.db,
          assistantMessageId,
          conversationId: input.conversationId,
          buffer,
          model: streamResult.model,
          providerMetadata: streamResult.providerMetadata,
        });

        yield {
          type: "finish" as const,
          content: buffer,
          status: "complete" as const,
          messageId: assistantMessageId,
          model,
          cost,
        };

        await trackAIUsage({
          authApi: ctx.authApi,
          headers: ctx.headers,
          cost: cost?.toString(),
        });
      }
    } catch (error) {
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

  /**
   * Update a tool call's output in the database
   * Used after user confirms/cancels split editor to update persisted state
   */
  updateToolCallOutput: protectedProcedure
    .input(
      z.object({
        messageId: z.uuid(),
        toolCallId: z.string(),
        outputUpdate: persistedToolCallOutputUpdateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const message = await tx.query.chatMessages.findFirst({
          where: eq(chatMessages.id, input.messageId),
          with: {
            conversation: {
              columns: { userId: true },
            },
          },
        });

        if (!message) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Message not found",
          });
        }

        if (message.conversation.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized",
          });
        }

        const toolCalls = message.toolCalls;

        if (!toolCalls) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Message has no tool calls",
          });
        }

        const updatedToolCalls = toolCalls.map((tc) =>
          tc.id === input.toolCallId
            ? withUpdatedOutput(tc, input.outputUpdate)
            : tc,
        );

        await tx
          .update(chatMessages)
          .set({ toolCalls: updatedToolCalls })
          .where(eq(chatMessages.id, input.messageId));

        return { success: true };
      });
    }),
});
