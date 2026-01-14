import { useLocalSearchParams } from "expo-router";

import { ChatScreen } from "~/components/chat/ChatScreen";

const ConversationChat = () => {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  if (!conversationId) {
    return null;
  }

  return <ChatScreen conversationId={conversationId} />;
};

export default ConversationChat;
