import type { ChatModel } from "@flatsby/validators/chat";
import type { UIMessage } from "ai";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { chatModelSchema, messageRoleSchema } from "@flatsby/validators/chat";

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

  let conversation;
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

  const initialMessages: UIMessage<{
    model?: ChatModel;
    cost?: number;
  }>[] = filteredMessages.map((m) => ({
    id: m.id,
    role: messageRoleSchema.parse(m.role),
    parts: [{ type: "text", text: m.content }],
    metadata: {
      model: chatModelSchema.safeParse(m.model).data,
      cost: m.cost ?? undefined,
    },
  }));

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
