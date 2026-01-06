import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { caller } from "~/trpc/server";

export default async function ChatPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Create a new conversation for this session
  // In a production app, you'd likely show a conversation list
  // or load the most recent conversation
  const conversation = await caller.chat.createConversation({
    title: "New Chat",
  });

  // Redirect to the conversation
  redirect(`/chat/${conversation.id}`);
}
