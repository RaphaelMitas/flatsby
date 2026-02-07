import { AIConsentGate } from "~/components/chat/AIConsentGate";
import { ChatSplitView } from "~/components/chat/ChatSplitView";

const ChatIndex = () => {
  return (
    <AIConsentGate>
      <ChatSplitView />
    </AIConsentGate>
  );
};

export default ChatIndex;
