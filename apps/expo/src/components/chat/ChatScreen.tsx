import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import { useLocalSearchParams } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { messageRoleSchema } from "@flatsby/validators/chat/messages";
import { chatModelSchema } from "@flatsby/validators/models";

import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { ChatInterface } from "./ChatInterface";

interface ChatScreenProps {
  conversationId: string;
  initialMessage?: string;
}

const ChatScreenContent = ({
  conversationId,
  initialMessage: propInitialMessage,
}: ChatScreenProps) => {
  const params = useLocalSearchParams<{ message?: string }>();
  const initialMessage = propInitialMessage ?? params.message;

  const { data: conversation } = useSuspenseQuery(
    trpc.chat.getConversation.queryOptions({ conversationId }),
  );

  // Convert DB messages to UIMessage format with parts
  const filteredMessages = conversation.messages
    .filter((m) => m.status === "complete" || m.status === "streaming")
    .filter((m) => messageRoleSchema.safeParse(m.role).success);

  const initialMessages: ChatUIMessage[] = filteredMessages.map((m) => {
    const parts: ChatUIMessage["parts"] = [{ type: "text", text: m.content }];

    // Restore tool calls if present (skip old/invalid tool calls from previous schema)
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        if (tc.name === "searchData") {
          parts.push({
            type: "tool-searchData",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "modifyData") {
          parts.push({
            type: "tool-modifyData",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (tc.name === "showUI") {
          parts.push({
            type: "tool-showUI",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        }
      }
    }

    return {
      id: m.id,
      role: messageRoleSchema.parse(m.role),
      parts,
      metadata: {
        model: chatModelSchema.safeParse(m.model).data,
        cost: m.cost ?? undefined,
        dbMessageId: m.id,
      },
    };
  });

  return (
    <SafeAreaView>
      <ChatInterface
        conversationId={conversationId}
        initialMessages={initialMessages}
        initialModel={chatModelSchema.safeParse(conversation.model).data}
        initialMessage={initialMessage}
      />
    </SafeAreaView>
  );
};

export const ChatScreen = ({
  conversationId,
  initialMessage,
}: ChatScreenProps) => {
  return (
    <ChatScreenContent
      conversationId={conversationId}
      initialMessage={initialMessage}
    />
  );
};
