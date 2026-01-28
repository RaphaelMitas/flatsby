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

    // Restore tool calls if present
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        if (tc.name === "getShoppingLists") {
          parts.push({
            type: "tool-getShoppingLists",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "addToShoppingList") {
          parts.push({
            type: "tool-addToShoppingList",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getShoppingListItems") {
          parts.push({
            type: "tool-getShoppingListItems",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "markItemComplete") {
          parts.push({
            type: "tool-markItemComplete",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "removeItem") {
          parts.push({
            type: "tool-removeItem",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getGroupMembers") {
          parts.push({
            type: "tool-getGroupMembers",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "getDebts") {
          parts.push({
            type: "tool-getDebts",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else if (tc.name === "addExpense") {
          parts.push({
            type: "tool-addExpense",
            toolCallId: tc.id,
            state: "output-available",
            input: tc.input,
            output: tc.output,
          });
        } else {
          // tc.name === "getExpenses"
          parts.push({
            type: "tool-getExpenses",
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
