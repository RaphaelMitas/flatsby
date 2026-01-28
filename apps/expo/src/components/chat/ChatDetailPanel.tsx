import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import Icon from "~/lib/ui/custom/icons/Icon";
import { ChatScreen } from "./ChatScreen";
import { NewChatScreen } from "./NewChatScreen";

type ChatAction = "view" | "create" | null;

interface ChatDetailPanelProps {
  selectedConversationId: string | null;
  action: ChatAction;
  pendingInitialMessage: string | undefined;
  onSelectConversation: (conversationId: string, initialMessage?: string) => void;
}

export function ChatDetailPanel({
  selectedConversationId,
  action,
  pendingInitialMessage,
  onSelectConversation,
}: ChatDetailPanelProps) {
  if (!selectedConversationId && action !== "create") {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Icon name="message-square" size={64} color="muted-foreground" />
        <View className="items-center gap-2">
          <Text className="text-foreground text-lg font-semibold">
            Select a conversation
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            Choose a conversation from the list or start a new chat
          </Text>
        </View>
      </View>
    );
  }

  if (action === "create") {
    return <NewChatScreen onSuccess={onSelectConversation} />;
  }

  if (selectedConversationId) {
    return (
      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">Loading...</Text>
          </View>
        }
      >
        <ChatScreen
          conversationId={selectedConversationId}
          initialMessage={pendingInitialMessage}
        />
      </Suspense>
    );
  }

  return null;
}
