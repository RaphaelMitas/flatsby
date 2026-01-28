import { useCallback, useState } from "react";
import { useRouter } from "expo-router";

import { SafeAreaView } from "~/lib/ui/safe-area";
import { SplitViewContainer } from "../splitview/SplitViewContainer";
import { useMediaQuery } from "../splitview/useMediaQuery";
import { ChatDetailPanel } from "./ChatDetailPanel";
import { ChatListPanel } from "./ChatListPanel";

type ChatAction = "view" | "create" | null;

export function ChatSplitView() {
  const router = useRouter();
  const isLargeScreen = useMediaQuery("lg");

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [action, setAction] = useState<ChatAction>(null);
  const [pendingInitialMessage, setPendingInitialMessage] = useState<
    string | undefined
  >(undefined);

  const selectConversation = useCallback(
    (conversationId: string, initialMessage?: string) => {
      if (isLargeScreen) {
        setSelectedConversationId(conversationId);
        setAction("view");
        setPendingInitialMessage(initialMessage);
      } else {
        if (initialMessage) {
          router.push(
            `/chat/${conversationId}?message=${encodeURIComponent(initialMessage)}`,
          );
        } else {
          router.push(`/chat/${conversationId}`);
        }
      }
    },
    [isLargeScreen, router],
  );

  const createConversation = useCallback(() => {
    if (isLargeScreen) {
      setSelectedConversationId(null);
      setAction("create");
      setPendingInitialMessage(undefined);
    } else {
      router.push("/chat/new");
    }
  }, [isLargeScreen, router]);

  const hasSelection = selectedConversationId !== null || action === "create";

  const listContent = (
    <ChatListPanel
      selectedConversationId={isLargeScreen ? selectedConversationId : null}
      onSelectConversation={selectConversation}
      onCreateConversation={createConversation}
    />
  );

  const detailContent = (
    <ChatDetailPanel
      selectedConversationId={selectedConversationId}
      action={action}
      pendingInitialMessage={pendingInitialMessage}
      onSelectConversation={selectConversation}
    />
  );

  if (!isLargeScreen) {
    return <SafeAreaView>{listContent}</SafeAreaView>;
  }

  return (
    <SafeAreaView>
      <SplitViewContainer
        listContent={listContent}
        detailContent={detailContent}
        hasSelection={hasSelection}
        listClass="w-[30%]"
        contentClass="w-[70%]"
      />
    </SafeAreaView>
  );
}
