import { AIConsentGate } from "~/components/chat/AIConsentGate";
import { NewChatScreen } from "~/components/chat/NewChatScreen";

const NewChat = () => {
  return (
    <AIConsentGate>
      <NewChatScreen />
    </AIConsentGate>
  );
};

export default NewChat;
