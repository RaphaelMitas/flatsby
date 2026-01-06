import { redirect } from "next/navigation";
import { MessageSquareIcon, PlusIcon } from "lucide-react";

import { Button } from "@flatsby/ui/button";

import { getSession } from "~/auth/server";
import { CreateChatDialog } from "./_components/create-chat-dialog";

export default async function ChatPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <MessageSquareIcon className="text-muted-foreground h-8 w-8" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome to Chat</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Start a new conversation or select an existing one from the sidebar.
        </p>
      </div>
      <CreateChatDialog>
        <Button size="lg">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </CreateChatDialog>
    </div>
  );
}
