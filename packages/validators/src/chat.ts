import type { UIMessage as AIUIMessage, InferUITools, ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod/v4";

import { categoryIdSchema } from "./categories";
import { groupNameSchema, groupSchema } from "./group";
import { chatModelSchema } from "./models";
import { shoppingListItemSchema, shoppingListSchema } from "./shopping-list";

// Role enum for messages
export const messageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

// Status enum for messages
export const messageStatusSchema = z.enum([
  "pending",
  "streaming",
  "complete",
  "error",
]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

// Trigger enum for send mutations
export const sendTriggerSchema = z.enum([
  "submit-message",
  "regenerate-message",
]);
export type SendTrigger = z.infer<typeof sendTriggerSchema>;

// Reusable item schemas built from shoppingListItemSchema
const toolItemInputSchema = shoppingListItemSchema
  .pick({ name: true })
  .extend({ categoryId: categoryIdSchema.optional() });

const toolAddedItemSchema = shoppingListItemSchema.pick({
  id: true,
  name: true,
  categoryId: true,
});

const toolFailedItemSchema = shoppingListItemSchema
  .pick({ name: true })
  .extend({ reason: z.string() });

export const addedItemSchema = toolAddedItemSchema;
export type AddedItem = z.infer<typeof addedItemSchema>;

// Tool result schemas
export const shoppingListInfoSchema = shoppingListSchema
  .pick({ id: true, name: true })
  .extend({
    groupId: groupSchema.shape.id,
    groupName: groupNameSchema,
    uncheckedItemLength: z.number(),
  });
export type ShoppingListInfo = z.infer<typeof shoppingListInfoSchema>;

export const getShoppingListsResultSchema = z.object({
  lists: z.array(shoppingListInfoSchema),
  userShouldSelect: z.boolean(),
});
export type GetShoppingListsResult = z.infer<
  typeof getShoppingListsResultSchema
>;

export const addToShoppingListResultSchema = z.object({
  success: z.boolean(),
  shoppingListName: shoppingListSchema.shape.name,
  addedItems: z.array(addedItemSchema),
  failedItems: z.array(toolFailedItemSchema).optional(),
});
export type AddToShoppingListResult = z.infer<
  typeof addToShoppingListResultSchema
>;

// Tool input schemas
export const getShoppingListsInputSchema = z.object({
  userShouldSelect: z.boolean(),
});

export const addToShoppingListInputSchema = z.object({
  shoppingListId: z.number(),
  groupId: z.number(),
  items: z.array(toolItemInputSchema),
});

// Persisted tool call schemas (reuse input/output schemas)
const getShoppingListsToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("getShoppingLists"),
  input: getShoppingListsInputSchema,
  output: getShoppingListsResultSchema,
});

const addToShoppingListToolCallSchema = z.object({
  id: z.string(),
  name: z.literal("addToShoppingList"),
  input: addToShoppingListInputSchema,
  output: addToShoppingListResultSchema,
});

const persistedToolCallSchema = z.discriminatedUnion("name", [
  getShoppingListsToolCallSchema,
  addToShoppingListToolCallSchema,
]);

export type PersistedToolCall = z.infer<typeof persistedToolCallSchema>;

// Base message schema (from DB)
export const chatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.uuid(),
  role: messageRoleSchema,
  content: z.string(),
  status: messageStatusSchema,
  createdAt: z.date(),
  generationId: z.string().nullable(),
  cost: z.number().nullable(),
  model: z.string().nullable(),
  toolCalls: z.array(persistedToolCallSchema).nullable(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Conversation schema (from DB)
export const conversationSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  title: z.string().nullable(),
  model: z.string().nullable(),
  systemPrompt: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Conversation = z.infer<typeof conversationSchema>;

// Conversation with messages
export const conversationWithMessagesSchema = conversationSchema.extend({
  messages: z.array(chatMessageSchema),
});
export type ConversationWithMessages = z.infer<
  typeof conversationWithMessagesSchema
>;

// UI Message schema (compatible with AI SDK v5)
export const uiMessageSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.date().optional(),
});
export type UIMessage = z.infer<typeof uiMessageSchema>;

// Input schemas
export const createConversationInputSchema = z.object({
  title: z.string().max(256).optional(),
  model: chatModelSchema.optional(),
  systemPrompt: z.string().max(4000).optional(),
});
export type CreateConversationInput = z.infer<
  typeof createConversationInputSchema
>;

export const getConversationInputSchema = z.object({
  conversationId: z.uuid(),
});
export type GetConversationInput = z.infer<typeof getConversationInputSchema>;

export const getUserConversationsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.iso.datetime().optional(), // updatedAt timestamp for cursor
});
export type GetUserConversationsInput = z.infer<
  typeof getUserConversationsInputSchema
>;

// Chat settings schema for tool configuration
export const chatSettingsSchema = z.object({
  shoppingListToolEnabled: z.boolean().default(false),
});
export type ChatSettings = z.infer<typeof chatSettingsSchema>;

export const sendInputSchema = z.object({
  conversationId: z.uuid(),
  message: uiMessageSchema,
  trigger: sendTriggerSchema,
  messageId: z.string().optional(),
  // Model to use for this message (updates conversation model if different)
  model: chatModelSchema.optional(),
  // Tool settings for this message
  settings: chatSettingsSchema.optional(),
});
export type SendInput = z.infer<typeof sendInputSchema>;

// Streaming chunk schema (yielded by the send mutation)
export const streamChunkSchema = z.object({
  type: z.enum(["text-delta", "finish", "tool-call", "tool-result"]),
  textDelta: z.string().optional(),
  content: z.string().optional(),
  status: messageStatusSchema.optional(),
  // Included in finish chunk for immediate UI update
  messageId: z.string().optional(),
  model: z.string().optional(),
  cost: z.number().nullable().optional(),
  // Tool-specific fields
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  args: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
});
export type StreamChunk = z.infer<typeof streamChunkSchema>;

export const messageMetadataSchema = z.object({
  model: chatModelSchema.optional(),
  cost: z.number().optional(),
});
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// AI SDK tool definitions
export const chatTools = {
  getShoppingLists: tool({
    description: "Get all shopping lists the user has access to",
    inputSchema: getShoppingListsInputSchema,
    outputSchema: getShoppingListsResultSchema,
  }),
  addToShoppingList: tool({
    description: "Add items to a shopping list",
    inputSchema: addToShoppingListInputSchema,
    outputSchema: addToShoppingListResultSchema,
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof chatTools>;

export type ChatUIMessage = AIUIMessage<MessageMetadata, never, ChatTools>;
