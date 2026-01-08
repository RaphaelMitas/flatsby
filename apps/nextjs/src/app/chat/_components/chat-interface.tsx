"use client";

import type { PromptInputMessage } from "@flatsby/ui/ai-elements";
import type {
  ChatUIMessage,
  ShoppingListInfo,
} from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { costToCredits, formatCredits } from "@flatsby/validators/billing";

import { ChatFooter } from "./chat-footer";
import { getModelDisplayName } from "./chat-model-selector";
import { ShoppingListSelector } from "./shopping-list-selector";
import { ShoppingListToolCard } from "./shopping-list-tool-card";
import { useTRPCChat } from "./use-trpc-chat";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: ChatUIMessage[];
  initialModel?: ChatModel;
  initialInput?: string;
}

export function ChatInterface({
  conversationId,
  initialMessages = [],
  initialModel,
  initialInput,
}: ChatInterfaceProps) {
  const router = useRouter();
  const hasAutoSent = useRef(false);
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
    settings,
    updateSettings,
  } = useTRPCChat({
    conversationId,
    initialMessages,
    initialModel,
  });

  // Auto-send initial input if provided (from new chat redirect)
  useEffect(() => {
    if (initialInput && !hasAutoSent.current) {
      hasAutoSent.current = true;
      // Remove the message from URL to prevent re-sending on refresh
      router.replace(`/chat/${conversationId}`, { scroll: false });
      // Pass message directly to handleSubmit to avoid state timing issues
      handleSubmit(undefined, initialInput);
    }
  }, [initialInput, conversationId, router, handleSubmit]);

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

  // Handle shopping list selection - sends a message to the AI
  const handleShoppingListSelect = useCallback(
    (list: ShoppingListInfo) => {
      if (isLoading) return;
      handleSubmit(undefined, `Add to the "${list.name}" list`);
    },
    [handleSubmit, isLoading],
  );

  // Helper to get text content from a message
  const getMessageContent = (msg: ChatUIMessage): string => {
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

              // Extract pending/running tool calls (to show indicators)
              const pendingToolCalls = message.parts.filter(
                (part) =>
                  (part.type === "tool-getShoppingLists" ||
                    part.type === "tool-addToShoppingList") &&
                  part.state === "input-available",
              );

              // Extract tool results for shopping list
              // AI SDK combines tool name into type like "tool-addToShoppingList"
              const addToListResults = message.parts.filter(
                (part) =>
                  part.type === "tool-addToShoppingList" &&
                  part.state === "output-available",
              );
              // Extract getShoppingLists results for clickable selection
              const getListsResults = message.parts.filter(
                (part) =>
                  part.type === "tool-getShoppingLists" &&
                  part.state === "output-available",
              );
              // Only show selector if this is the last message (not already responded)
              const isLastMessage = index === messages.length - 1;
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <>
                        {/* Show tool call indicators */}
                        {pendingToolCalls.map((part) => {
                          return (
                            <Tool key={part.toolCallId} className="my-1">
                              <ToolHeader type={part.type} state={part.state} />
                            </Tool>
                          );
                        })}
                        {content ? (
                          <MessageResponse>{content}</MessageResponse>
                        ) : isLoading && index === messages.length - 1 ? (
                          <Loader size={20} />
                        ) : null}
                        {addToListResults.map((part) => {
                          return (
                            <ShoppingListToolCard
                              key={part.toolCallId}
                              result={part.output}
                            />
                          );
                        })}
                        {getListsResults.map((part) => {
                          if (!part.output.userShouldSelect) return null;
                          return (
                            <ShoppingListSelector
                              key={part.toolCallId}
                              lists={part.output.lists}
                              onSelect={handleShoppingListSelect}
                              disabled={isLoading || !isLastMessage}
                            />
                          );
                        })}
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

      <ChatFooter
        input={input}
        onInputChange={setInput}
        onSubmit={onFormSubmit}
        selectedModel={selectedModel ?? null}
        onModelChange={handleModelChange}
        settings={settings}
        onSettingsChange={updateSettings}
        status={status}
        error={error?.message}
      />
    </div>
  );
}
