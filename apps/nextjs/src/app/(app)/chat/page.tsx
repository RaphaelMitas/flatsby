import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSession } from "~/auth/server";
import { getCurrentUserWithGroups } from "~/trpc/server";
import { ChatHeader } from "./_components/chat-header";
import { NewChatInterface } from "./_components/new-chat-interface";

export default async function ChatPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const t = await getTranslations("navigation");
  const user = await getCurrentUserWithGroups();
  const defaultModel = user.success
    ? user.data.user?.lastChatModelUsed
    : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ChatHeader title={t("newChat")} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <NewChatInterface defaultModel={defaultModel} />
      </div>
    </div>
  );
}
