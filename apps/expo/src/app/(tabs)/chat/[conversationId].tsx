import { useLocalSearchParams } from "expo-router";

import { AIConsentGate } from "~/components/chat/AIConsentGate";
import { ChatScreen } from "~/components/chat/ChatScreen";

const ConversationChat = () => {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  if (!conversationId) {
    return null;
  }

  return (
    <AIConsentGate>
      <ChatScreen conversationId={conversationId} />
    </AIConsentGate>
  );
};

export default ConversationChat;
