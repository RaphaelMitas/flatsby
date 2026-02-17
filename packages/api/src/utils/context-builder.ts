import type {
  AssistantModelMessage,
  ModelMessage,
  ToolModelMessage,
} from "ai";
import type { PersistedToolCall } from "@flatsby/validators/chat/tools";

import { desc, eq } from "@flatsby/db";
import { chatMessages, conversations } from "@flatsby/db/schema";
import { messageRoleSchema } from "@flatsby/validators/chat/messages";
import { persistedToolCallSchema } from "@flatsby/validators/chat/tools";
import superjson from "superjson";

import type { Database } from "../types";

/**
 * Validates and filters tool calls from the database.
 * Old tool calls from previous schema versions are silently dropped.
 */
function filterValidToolCalls(
  toolCalls: PersistedToolCall[],
): PersistedToolCall[] {
  return toolCalls.filter(
    (tc) => persistedToolCallSchema.safeParse(tc).success,
  );
}

/**
 * Builds context messages for an AI model from a conversation.
 * Uses AI SDK's CoreMessage format with proper tool call/result structure
 * to prevent models from misinterpreting truncated tool outputs.
 */
export async function buildContextMessages(
  db: Database,
  conversationId: string,
): Promise<ModelMessage[]> {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: {
      systemPrompt: true,
    },
  });

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: [desc(chatMessages.createdAt)],
    columns: {
      role: true,
      content: true,
      status: true,
      toolCalls: true,
    },
  });

  const completedMessages = messages
    .filter((m) => m.status === "complete")
    .reverse();

  const contextMessages: ModelMessage[] = [];

  if (conversation?.systemPrompt) {
    contextMessages.push({
      role: "system",
      content: conversation.systemPrompt,
    });
  }

  for (const m of completedMessages) {
    const role = messageRoleSchema.safeParse(m.role).data ?? "user";
    const validToolCalls =
      m.role === "assistant" && m.toolCalls?.length
        ? filterValidToolCalls(m.toolCalls)
        : [];

    if (role === "assistant" && validToolCalls.length > 0) {
      // Assistant message with tool calls - use proper AI SDK structure
      const assistantMessage: AssistantModelMessage = {
        role: "assistant",
        content: [
          ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
          ...validToolCalls.map((tc) => ({
            type: "tool-call" as const,
            toolCallId: tc.id,
            toolName: tc.name,
            input: tc.input,
          })),
        ],
      };
      contextMessages.push(assistantMessage);

      // Tool results as separate messages - full output, no truncation
      // Use SuperJSON to properly serialize Date objects and other non-JSON types
      const toolMessage: ToolModelMessage = {
        role: "tool",
        content: validToolCalls.map((tc) => ({
          type: "tool-result" as const,
          toolCallId: tc.id,
          toolName: tc.name,
          output: {
            type: "text" as const,
            value: superjson.stringify(tc.output),
          },
        })),
      };
      contextMessages.push(toolMessage);
    } else {
      // Regular user/assistant/system messages
      contextMessages.push({
        role,
        content: m.content,
      });
    }
  }

  return contextMessages;
}
