import type { UIMessage } from "ai";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";
import { ChatInterface } from "../_components/chat-interface";

interface ChatConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

// Valid roles for UIMessage
const validRoles = ["user", "assistant", "system"] as const;
type ValidRole = (typeof validRoles)[number];

function isValidRole(role: string): role is ValidRole {
  return validRoles.includes(role as ValidRole);
}

export default async function ChatConversationPage({
  params,
}: ChatConversationPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const { conversationId } = await params;

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
  const initialMessages: UIMessage[] = conversation.messages
    .filter((m) => m.status === "complete" || m.status === "streaming")
    .filter((m) => isValidRole(m.role))
    .map((m) => ({
      id: m.id,
      role: m.role as ValidRole, // Safe after isValidRole filter
      parts: [{ type: "text" as const, text: m.content }],
    }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-2">
        <h1 className="text-sm font-medium">{conversation.title ?? "New Chat"}</h1>
      </div>
      <div className="min-h-0 flex-1">
        <ChatInterface
          conversationId={conversationId}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
