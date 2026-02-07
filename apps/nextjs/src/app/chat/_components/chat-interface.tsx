"use client";

import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquareIcon, RefreshCwIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Loader,
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  Tool,
  ToolHeader,
} from "@flatsby/ui/ai-elements";
import { Button } from "@flatsby/ui/button";
import { costToCredits, formatCredits } from "@flatsby/validators/billing";
import {
  CHAT_FEATURES,
  CHAT_MESSAGE_LIMIT,
} from "@flatsby/validators/chat/messages";

import { ChatFooter } from "./chat-footer";
import { getModelDisplayName } from "./chat-model-selector";
import { ChatToolResults } from "./chat-tool-results";
import { useTRPCChat } from "./use-trpc-chat";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: ChatUIMessage[];
  initialModel?: ChatModel;
}

const getMessageContent = (msg: ChatUIMessage): string => {
  return msg.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
};

interface ChatMessageItemProps {
  message: ChatUIMessage;
  isLoading: boolean;
  onUIResponse: (
    componentId: string,
    response: { selectedIds?: string[]; confirmed?: boolean },
  ) => void;
  onRegenerate: (messageId: string) => void;
}

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isLoading,
  onUIResponse,
  onRegenerate,
}: ChatMessageItemProps) {
  const content = useMemo(() => getMessageContent(message), [message]);
  const messageModel = message.metadata?.model;
  const messageCost = message.metadata?.cost;

  // Memoize onClick to prevent MessageAction re-renders
  const handleRegenerate = useCallback(() => {
    onRegenerate(message.id);
  }, [onRegenerate, message.id]);

  const pendingToolCalls = message.parts.filter(
    (part) =>
      (part.type === "tool-searchData" ||
        part.type === "tool-modifyData" ||
        part.type === "tool-showUI") &&
      part.state === "input-available",
  );

  return (
    <Message key={message.id} from={message.role}>
      <MessageContent>
        {message.role === "assistant" ? (
          <>
            {pendingToolCalls.map((part) => {
              return (
                <Tool key={part.toolCallId} className="my-1">
                  <ToolHeader type={part.type} state={part.state} />
                </Tool>
              );
            })}
            {content ? (
              <MessageResponse>{content}</MessageResponse>
            ) : isLoading ? (
              <Loader size={20} />
            ) : null}
            <ChatToolResults
              message={message}
              isLoading={isLoading}
              onUIResponse={onUIResponse}
            />
          </>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </MessageContent>
      <MessageToolbar>
        {message.role === "assistant" && content && (
          <span className="text-muted-foreground text-xs">
            {messageModel && getModelDisplayName(messageModel)}
            {messageModel && messageCost != null && " · "}
            {messageCost != null &&
              `${formatCredits(costToCredits(messageCost))} credits`}
          </span>
        )}
        {CHAT_FEATURES.regenerateEnabled &&
          message.role === "assistant" &&
          content &&
          !isLoading && (
            <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
              <MessageAction tooltip="Regenerate" onClick={handleRegenerate}>
                <RefreshCwIcon className="size-4" />
              </MessageAction>
            </MessageActions>
          )}
      </MessageToolbar>
    </Message>
  );
});

export function ChatInterface({
  conversationId,
  initialMessages = [],
  initialModel,
}: ChatInterfaceProps) {
  const {
    messages,
    sendMessage,
    status,
    error,
    regenerateMessage,
    selectedModel,
    handleModelChange,
    toolPreferences,
    updateToolPreferences,
    handleUIResponse,
  } = useTRPCChat({
    conversationId,
    initialMessages,
    initialModel,
  });

  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const router = useRouter();
  const hasAutoSent = useRef(false);

  useEffect(() => {
    if (message && !hasAutoSent.current) {
      router.replace(`/chat/${conversationId}`);
      sendMessage(message);
      hasAutoSent.current = true;
    }
  }, [message, sendMessage, conversationId, router]);

  const isStreaming = status === "streaming";
  const isSubmitting = status === "submitted";
  const isLoading = isStreaming || isSubmitting;
  const isAtMessageLimit = messages.length >= CHAT_MESSAGE_LIMIT;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything and I'll help you out"
              icon={<MessageSquareIcon className="size-8" />}
            />
          ) : (
            messages.map((message) => {
              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isLoading={isLoading}
                  onUIResponse={handleUIResponse}
                  onRegenerate={regenerateMessage}
                />
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {isAtMessageLimit && (
        <div className="flex items-center justify-center gap-3 border-t py-3">
          <span className="text-muted-foreground text-sm">
            Message limit reached ({CHAT_MESSAGE_LIMIT})
          </span>
          <Button asChild size="sm">
            <Link href="/chat">Start new chat</Link>
          </Button>
        </div>
      )}

      <ChatFooter
        sendMessage={sendMessage}
        selectedModel={selectedModel ?? null}
        onModelChange={handleModelChange}
        toolPreferences={toolPreferences}
        onToolPreferencesChange={updateToolPreferences}
        status={status}
        disabled={isAtMessageLimit}
        error={error?.message}
      />
    </div>
  );
}
