"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type {
  ChatModel,
  UIMessageWithMetadata,
} from "@flatsby/validators/chat";
import type { FormEvent } from "react";
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
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";

import { ChatModelSelector, getModelDisplayName } from "./chat-model-selector";
import { useTRPCChat } from "./use-trpc-chat";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: UIMessageWithMetadata[];
  initialModel?: ChatModel;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  initialModel,
}: ChatInterfaceProps) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    error,
    regenerateMessage,
    selectedModel,
    handleModelChange,
  } = useTRPCChat({
    conversationId,
    initialMessages,
    initialModel,
  });

  const isStreaming = status === "streaming";
  const isSubmitting = status === "submitted";
  const isLoading = isStreaming || isSubmitting;

  // Handle form submission - PromptInput calls this with message and event
  const onFormSubmit = (
    _message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => {
    if (!input.trim() || isLoading) return;
    // Pass the form event to our handleSubmit
    handleSubmit(event);
  };

  // Helper to get text content from a message
  const getMessageContent = (msg: UIMessageWithMetadata): string => {
    return msg.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages Area */}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything and I'll help you out"
              icon={<MessageSquareIcon className="size-8" />}
            />
          ) : (
            messages.map((message, index) => {
              const content = getMessageContent(message);
              const messageModel = message.metadata?.model;
              const messageCost = message.metadata?.cost;
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <>
                        {content ? (
                          <MessageResponse>{content}</MessageResponse>
                        ) : isLoading && index === messages.length - 1 ? (
                          <Loader size={20} />
                        ) : null}
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
                        {messageCost != null && `$${messageCost.toFixed(6)}`}
                      </span>
                    )}
                    {/* Actions for assistant messages */}
                    {message.role === "assistant" && content && !isLoading && (
                      <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageAction
                          tooltip="Regenerate"
                          onClick={() => regenerateMessage(message.id)}
                        >
                          <RefreshCwIcon className="size-4" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </MessageToolbar>
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Error Display */}
      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive mx-4 mb-2 rounded-lg border p-3 text-sm">
          {error.message}
        </div>
      )}

      {/* Input Area */}
      <div className="shrink-0 border-t p-4">
        <PromptInput onSubmit={onFormSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <PromptInputFooter>
            <ChatModelSelector
              currentModel={selectedModel ?? null}
              onModelChange={handleModelChange}
              disabled={isLoading}
            />
            <PromptInputSubmit
              status={status}
              disabled={!input.trim() || isLoading}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
