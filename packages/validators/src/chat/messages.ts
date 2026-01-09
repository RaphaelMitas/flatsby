import { z } from "zod/v4";

import { chatModelSchema } from "../models";
import { persistedToolCallSchema } from "./tools";

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

// Input schemas for tRPC procedures
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
  shoppingListToolsEnabled: z.boolean().default(false),
  expenseToolsEnabled: z.boolean().default(false),
  groupId: z.number().optional(),
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
  // Database message ID (UUID) - needed for tool call updates since AI SDK uses its own IDs
  dbMessageId: z.uuid().optional(),
});
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
