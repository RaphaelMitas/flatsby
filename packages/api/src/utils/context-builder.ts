import type { MessageRole } from "@flatsby/validators/chat/messages";
import type { PersistedToolCall } from "@flatsby/validators/chat/tools";

import { desc, eq } from "@flatsby/db";
import { chatMessages, conversations } from "@flatsby/db/schema";
import { messageRoleSchema } from "@flatsby/validators/chat/messages";
import { persistedToolCallSchema } from "@flatsby/validators/chat/tools";

import type { Database } from "../types";

/**
 * Validates and filters tool calls from the database.
 * Old tool calls from previous schema versions are silently dropped.
 */
function filterValidToolCalls(
  toolCalls: PersistedToolCall[],
): PersistedToolCall[] {
  return toolCalls.filter((tc) => persistedToolCallSchema.safeParse(tc).success);
}

/**
 * Formats tool calls into a compact string summary for context.
 */
function formatToolCallsSummary(toolCalls: PersistedToolCall[]): string {
  if (toolCalls.length === 0) return "";

  const summaries = toolCalls.map((tc) => {
    const outputStr = JSON.stringify(tc.output);
    const truncatedOutput =
      outputStr.length > 500 ? outputStr.slice(0, 500) + "..." : outputStr;
    return `${tc.name}(${JSON.stringify(tc.input)}) → ${truncatedOutput}`;
  });

  return `\n[Tool calls: ${summaries.join("; ")}]`;
}

export interface ContextMessage {
  role: MessageRole;
  content: string;
}

/**
 * Builds context messages for an AI model from a conversation.
 * With 50 message limit and 400K+ context windows, no trimming needed.
 */
export async function buildContextMessages(
  db: Database,
  conversationId: string,
): Promise<ContextMessage[]> {
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

  const contextMessages: ContextMessage[] = [];

  if (conversation?.systemPrompt) {
    contextMessages.push({
      role: "system",
      content: conversation.systemPrompt,
    });
  }

  for (const m of completedMessages) {
    const validToolCalls =
      m.role === "assistant" && m.toolCalls?.length
        ? filterValidToolCalls(m.toolCalls)
        : [];
    const toolSummary =
      validToolCalls.length > 0
        ? formatToolCallsSummary(validToolCalls)
        : "";

    contextMessages.push({
      role: messageRoleSchema.safeParse(m.role).data ?? "user",
      content: m.content + toolSummary,
    });
  }

  return contextMessages;
}
