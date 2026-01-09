import type { RouterOutputs } from "@flatsby/api";
import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { messageRoleSchema } from "@flatsby/validators/chat/messages";
import { chatModelSchema } from "@flatsby/validators/models";

import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";
import { ChatHeader } from "../_components/chat-header";
import { ChatInterface } from "../_components/chat-interface";

interface ChatConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    message?: string;
  }>;
}

export default async function ChatConversationPage({
  params,
  searchParams,
}: ChatConversationPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { conversationId } = await params;
  const { message: initialMessage } = await searchParams;

  let conversation: RouterOutputs["chat"]["getConversation"];
  try {
    conversation = await caller.chat.getConversation({ conversationId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  // Convert DB messages to UIMessage format with parts
  // Include complete messages and streaming messages (in case of recovery)
  const filteredMessages = conversation.messages
    .filter((m) => m.status === "complete" || m.status === "streaming")
    .filter((m) => messageRoleSchema.safeParse(m.role).success);

  const initialMessages: ChatUIMessage[] = filteredMessages.map((m) => {
    const parts: ChatUIMessage["parts"] = [{ type: "text", text: m.content }];

    // Restore tool calls if present
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        // Narrowing by name discriminant for proper type inference
        if (tc.name === "getShoppingLists") {
          parts.push({
            type: "tool-getShoppingLists",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "addToShoppingList") {
          parts.push({
            type: "tool-addToShoppingList",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getShoppingListItems") {
          parts.push({
            type: "tool-getShoppingListItems",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "markItemComplete") {
          parts.push({
            type: "tool-markItemComplete",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "removeItem") {
          parts.push({
            type: "tool-removeItem",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getGroupMembers") {
          parts.push({
            type: "tool-getGroupMembers",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getDebts") {
          parts.push({
            type: "tool-getDebts",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "addExpense") {
          parts.push({
            type: "tool-addExpense",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else {
          // tc.name === "getExpenses" (exhaustive)
          parts.push({
            type: "tool-getExpenses",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        }
      }
    }

    return {
      id: m.id,
      role: messageRoleSchema.parse(m.role),
      parts,
      metadata: {
        model: chatModelSchema.safeParse(m.model).data,
        cost: m.cost ?? undefined,
        dbMessageId: m.id, // Store DB message ID for tool call updates
      },
    };
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader title={conversation.title ?? "New Chat"} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ChatInterface
          conversationId={conversationId}
          initialMessages={initialMessages}
          initialModel={chatModelSchema.safeParse(conversation.model).data}
          initialInput={initialMessage}
        />
      </div>
    </div>
  );
}
