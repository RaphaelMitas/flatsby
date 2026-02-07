import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { costToCredits, formatCredits } from "@flatsby/validators/billing";
import { CHAT_MODELS } from "@flatsby/validators/models";

import Icon from "~/lib/ui/custom/icons/Icon";
import { MarkdownText } from "./MarkdownText";
import { ChatToolResults } from "./tools";

interface ChatMessageProps {
  message: ChatUIMessage;
  isLoading: boolean;
  onRegenerate?: (messageId: string) => void;
  onUIResponse: (
    toolCallId: string,
    response: { selectedIds?: string[]; confirmed?: boolean },
  ) => void;
}

function getMessageContent(msg: ChatUIMessage): string {
  return msg.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
}

function getModelDisplayName(modelId: string | null | undefined): string {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId ?? "";
}

// Check if message has pending tool calls (input-available state)
function hasPendingToolCalls(message: ChatUIMessage): boolean {
  return message.parts.some(
    (part) =>
      "state" in part &&
      (part.state === "input-available" || part.state === "input-streaming"),
  );
}

// Check if message has any completed tool results
function hasToolResults(message: ChatUIMessage): boolean {
  return message.parts.some(
    (part) => "state" in part && part.state === "output-available",
  );
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isLoading,
  onRegenerate,
  onUIResponse,
}: ChatMessageProps) {
  const content = useMemo(() => getMessageContent(message), [message]);
  const isUser = message.role === "user";
  const messageModel = message.metadata?.model;
  const messageCost = message.metadata?.cost;

  const pendingTools = hasPendingToolCalls(message);
  const showToolResults = hasToolResults(message);

  return (
    <View className={`mb-4 ${isUser ? "items-end" : ""}`}>
      <View
        className={
          isUser
            ? "bg-primary max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3"
            : "w-full"
        }
      >
        {/* Pending tools indicator */}
        {pendingTools && !content && (
          <View className="flex-row items-center gap-2">
            <Icon
              name="loader"
              size={16}
              color={isUser ? "primary-foreground" : "muted-foreground"}
            />
            <Text
              className={`text-sm ${
                isUser ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Thinking...
            </Text>
          </View>
        )}

        {/* Loading indicator */}
        {!content && isLoading && !pendingTools ? (
          <View className="flex-row items-center gap-2">
            <Icon
              name="loader"
              size={16}
              color={isUser ? "primary-foreground" : "muted-foreground"}
            />
          </View>
        ) : content ? (
          // Content: Plain text for user, Markdown for assistant
          isUser ? (
            <Text className="text-primary-foreground text-base">{content}</Text>
          ) : (
            <MarkdownText>{content}</MarkdownText>
          )
        ) : null}
      </View>

      {/* Tool results - displayed outside the message bubble */}
      {!isUser && showToolResults && (
        <View className="mt-2 w-full">
          <ChatToolResults
            message={message}
            isLoading={isLoading}
            onUIResponse={onUIResponse}
          />
        </View>
      )}

      {/* Message metadata */}
      {!isUser && content && (
        <View className="mt-1 flex-row items-center gap-2 px-1">
          {messageModel && (
            <Text className="text-muted-foreground text-xs">
              {getModelDisplayName(messageModel)}
            </Text>
          )}
          {messageModel && messageCost != null && (
            <Text className="text-muted-foreground text-xs">·</Text>
          )}
          {messageCost != null && (
            <Text className="text-muted-foreground text-xs">
              {formatCredits(costToCredits(messageCost))} credits
            </Text>
          )}
          {!isLoading && onRegenerate && (
            <Pressable
              onPress={() => onRegenerate(message.id)}
              className="active:bg-muted ml-1 rounded p-1"
            >
              <Icon name="refresh-cw" size={12} color="muted-foreground" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});
