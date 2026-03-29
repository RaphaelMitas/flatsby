import { View } from "react-native";

import { AIConsentGate } from "~/components/chat/AIConsentGate";
import { ChatSplitView } from "~/components/chat/ChatSplitView";

const ChatIndex = () => {
  return (
    <View style={{ flex: 1 }}>
      <AIConsentGate>
        <ChatSplitView />
      </AIConsentGate>
    </View>
  );
};

export default ChatIndex;
