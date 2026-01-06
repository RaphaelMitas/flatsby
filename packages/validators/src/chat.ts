import type { UIMessage as AIUIMessage } from "ai";
import { z } from "zod/v4";

interface MessageMetadata {
  model?: ChatModel;
  cost?: number;
}

export type UIMessageWithMetadata = AIUIMessage<MessageMetadata>;
// Available AI models
export const chatModelSchema = z.enum([
  "google/gemini-2.0-flash",
  "openai/gpt-4o",
]);
export type ChatModel = z.infer<typeof chatModelSchema>;

export const CHAT_MODELS = [
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
  },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai" },
] as const satisfies readonly {
  id: ChatModel;
  name: string;
  provider: string;
}[];

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
// Note: message IDs are strings (nanoid from AI SDK or UUID we generate)
export const chatMessageSchema = z.object({
  id: z.string(),
  conversationId: z.uuid(),
  role: messageRoleSchema,
  content: z.string(),
  status: messageStatusSchema,
  tokenCount: z.number().nullable(),
  createdAt: z.date(),
  // AI generation tracking
  generationId: z.string().nullable(),
  cost: z.number().nullable(),
  model: z.string().nullable(),
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
// AI SDK generates nanoid-style IDs, content is extracted from parts
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
  cursor: z.uuid().optional(),
});
export type GetUserConversationsInput = z.infer<
  typeof getUserConversationsInputSchema
>;

export const sendInputSchema = z.object({
  conversationId: z.uuid(),
  message: uiMessageSchema,
  trigger: sendTriggerSchema,
  // Message ID for regeneration - string to accept both nanoid and UUID
  messageId: z.string().optional(),
  // Model to use for this message (updates conversation model if different)
  model: chatModelSchema.optional(),
});
export type SendInput = z.infer<typeof sendInputSchema>;

// Streaming chunk schema (yielded by the send mutation)
export const streamChunkSchema = z.object({
  type: z.enum(["text-delta", "finish"]),
  textDelta: z.string().optional(),
  content: z.string().optional(),
  status: messageStatusSchema.optional(),
  // Included in finish chunk for immediate UI update
  messageId: z.string().optional(),
  model: z.string().optional(),
  cost: z.number().nullable().optional(),
});
export type StreamChunk = z.infer<typeof streamChunkSchema>;
