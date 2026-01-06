"use client";

import type { UIMessage } from "ai";
import type { FormEvent } from "react";
import { MessageSquareIcon, RefreshCwIcon } from "lucide-react";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
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
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@flatsby/ui/ai-elements";

import { useTRPCChat } from "./use-trpc-chat";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: UIMessage[];
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    error,
    regenerateMessage,
  } = useTRPCChat({
    conversationId,
    initialMessages,
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
  const getMessageContent = (msg: UIMessage): string => {
    return msg.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" && typeof part.text === "string",
      )
      .map((part) => part.text)
      .join("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <Conversation className="flex-1">
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
      <div className="border-t p-4">
        <PromptInput onSubmit={onFormSubmit}>
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <PromptInputFooter>
            <div /> {/* Spacer for left side */}
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
