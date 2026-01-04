import { desc, eq } from "@flatsby/db";
import { chatMessages, conversations } from "@flatsby/db/schema";

import type { Database } from "../types";

// Rough token estimation: ~4 characters per token
const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 8000;

export interface ContextMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Estimates the number of tokens in a string
 * Uses a rough approximation of ~4 characters per token
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Builds context messages for an AI model from a conversation
 * - Fetches all messages for the conversation ordered by createdAt
 * - Includes system prompt from conversation if it exists
 * - Trims oldest messages if exceeding MAX_CONTEXT_TOKENS
 * - Returns array formatted for model provider
 */
export async function buildContextMessages(
  db: Database,
  conversationId: string,
): Promise<ContextMessage[]> {
  // Fetch the conversation with system prompt
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: {
      systemPrompt: true,
    },
  });

  // Fetch all messages for this conversation
  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [desc(chatMessages.createdAt)],
    columns: {
      role: true,
      content: true,
      status: true,
    },
  });

  // Filter to only completed messages (not pending/streaming/error)
  const completedMessages = messages
    .filter((m) => m.status === "complete")
    .reverse(); // Reverse to get chronological order (oldest first)

  const contextMessages: ContextMessage[] = [];
  let totalTokens = 0;

  // Add system prompt first if it exists
  if (conversation?.systemPrompt) {
    const systemTokens = estimateTokens(conversation.systemPrompt);
    contextMessages.push({
      role: "system",
      content: conversation.systemPrompt,
    });
    totalTokens += systemTokens;
  }

  // Calculate tokens for all messages first
  const messagesWithTokens = completedMessages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    tokens: estimateTokens(m.content),
  }));

  // Calculate total tokens for all messages
  const totalMessageTokens = messagesWithTokens.reduce(
    (sum, m) => sum + m.tokens,
    0,
  );

  // If we're under the limit, include all messages
  if (totalTokens + totalMessageTokens <= MAX_CONTEXT_TOKENS) {
    for (const m of messagesWithTokens) {
      contextMessages.push({
        role: m.role,
        content: m.content,
      });
    }
    return contextMessages;
  }

  // Otherwise, trim from the beginning (oldest messages) to fit
  const remainingBudget = MAX_CONTEXT_TOKENS - totalTokens;
  let usedTokens = 0;

  // Start from the end (most recent) and work backwards
  const trimmedMessages: ContextMessage[] = [];
  for (let i = messagesWithTokens.length - 1; i >= 0; i--) {
    const m = messagesWithTokens[i];
    if (!m) continue;
    if (usedTokens + m.tokens <= remainingBudget) {
      trimmedMessages.unshift({
        role: m.role,
        content: m.content,
      });
      usedTokens += m.tokens;
    } else {
      // No more room, stop adding messages
      break;
    }
  }

  // Add trimmed messages to context
  contextMessages.push(...trimmedMessages);

  return contextMessages;
}
