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
}: ChatConversationPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { conversationId } = await params;

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

    // Restore tool calls if present (skip old/invalid tool calls from previous schema)
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        if (tc.name === "searchData") {
          parts.push({
            type: "tool-searchData",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "modifyData") {
          parts.push({
            type: "tool-modifyData",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (tc.name === "showUI") {
          parts.push({
            type: "tool-showUI",
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
        />
      </div>
    </div>
  );
}
