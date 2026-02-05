"use client";

import type {
  ChatUIMessage,
  PersistedToolCallOutputUpdate,
  SelectorOption,
  ShowUIInput,
} from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/chat";
import { withUpdatedOutput } from "@flatsby/validators/chat/tools";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useToolPreferences } from "./useToolPreferences";

export interface UseTRPCChatOptions {
  conversationId: string;
  initialMessages?: ChatUIMessage[];
  initialModel?: ChatModel;
  onFinish?: () => void;
}

/**
 * Custom hook that integrates AI SDK's useChat with tRPC streaming mutations.
 *
 * This provides the best of both worlds:
 * - useChat's built-in message state management and streaming UI
 * - tRPC's type safety and server-side persistence
 */
export function useTRPCChat({
  conversationId,
  initialMessages = [],
  initialModel,
  onFinish,
}: UseTRPCChatOptions) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { currentGroup } = useGroupContext();

  const [selectedModel, setSelectedModel] = useState<ChatModel | undefined>(
    initialModel,
  );

  const handleModelChange = useCallback((model: ChatModel) => {
    setSelectedModel(model);
  }, []);

  const { updateToolPreferences, toolPreferences } = useToolPreferences();

  const sendMutation = useMutation(trpc.chat.send.mutationOptions());
  const updateToolCallOutputMutation = useMutation(
    trpc.chat.updateToolCallOutput.mutationOptions(),
  );
  const modelRef = useRef(selectedModel);
  const toolPreferencesRef = useRef(toolPreferences);
  const groupIdRef = useRef(currentGroup?.id);

  useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    toolPreferencesRef.current = toolPreferences;
  }, [toolPreferences]);

  useEffect(() => {
    groupIdRef.current = currentGroup?.id;
  }, [currentGroup?.id]);

  const transport = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return createTRPCChatTransport({
      sendMutation: async (mutationInput) =>
        await sendMutation.mutateAsync(mutationInput),
      getModel: () => modelRef.current,
      getToolPreferences: () => toolPreferencesRef.current,
      getGroupId: () => groupIdRef.current,
    });
  }, [sendMutation]);

  const handleFinish = () => {
    void queryClient.invalidateQueries(
      trpc.chat.getConversation.queryOptions({ conversationId }),
    );
    void queryClient.invalidateQueries({
      queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
    });
    onFinish?.();
  };

  const { regenerate, setMessages, sendMessage, messages, ...restChat } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: handleFinish,
  });

  const regenerateMessage = useCallback(
    (messageId: string) => {
      void regenerate({ messageId });
    },
    [regenerate],
  );

  const updateToolCallOutput = useCallback(
    (
      messageId: string,
      toolCallId: string,
      outputUpdate: PersistedToolCallOutputUpdate,
    ) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg): ChatUIMessage => {
          if (msg.id !== messageId) return msg;
          return {
            ...msg,
            parts: msg.parts.map((part) => {
              if (
                "toolCallId" in part &&
                part.toolCallId === toolCallId &&
                "state" in part &&
                part.state === "output-available" &&
                "output" in part &&
                part.type !== "dynamic-tool"
              ) {
                return withUpdatedOutput(part, outputUpdate);
              }
              return part;
            }),
          };
        }),
      );
    },
    [setMessages],
  );

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      void sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    },
    [sendMessage],
  );

  /**
   * Handle user response from interactive UI components (selector, quiz, confirmation).
   * Updates local state, persists to DB, and auto-sends a message to continue the conversation.
   */
  const handleUIResponse = useCallback(
    (
      componentId: string,
      response: { selectedIds?: string[]; confirmed?: boolean },
    ) => {
      // Find the message and tool call with this componentId
      let foundMessageId: string | undefined;
      let foundToolCallId: string | undefined;
      let foundDbMessageId: string | undefined;
      let foundInput: ShowUIInput | undefined;

      for (const msg of messages) {
        for (const part of msg.parts) {
          if (
            part.type === "tool-showUI" &&
            part.state === "output-available" &&
            part.output.componentId === componentId
          ) {
            foundMessageId = msg.id;
            foundToolCallId = part.toolCallId;
            foundDbMessageId = msg.metadata?.dbMessageId;
            foundInput = part.input;
            break;
          }
        }
        if (foundMessageId) break;
      }

      if (!foundMessageId || !foundToolCallId || !foundInput) {
        console.error("[Chat] Could not find UI component:", componentId);
        return;
      }

      // Build the output update
      const outputUpdate: PersistedToolCallOutputUpdate = {
        awaitingInput: false,
        userResponse: response,
      };

      // Update local state immediately
      updateToolCallOutput(foundMessageId, foundToolCallId, outputUpdate);

      // Persist to database if we have the DB message ID
      if (foundDbMessageId) {
        void updateToolCallOutputMutation.mutateAsync({
          messageId: foundDbMessageId,
          toolCallId: foundToolCallId,
          outputUpdate,
        });
      }

      // Build auto-continue message based on the response
      let autoMessage: string;

      if (response.confirmed !== undefined) {
        // Confirmation response
        autoMessage = response.confirmed ? "[Confirmed]" : "[Cancelled]";
      } else if (response.selectedIds && response.selectedIds.length > 0) {
        // Selector/quiz response - find the labels
        const options: SelectorOption[] =
          foundInput.config.options ?? foundInput.config.choices ?? [];
        const selectedLabels = response.selectedIds
          .map((id) => options.find((o) => o.id === id)?.label)
          .filter(Boolean);

        if (selectedLabels.length === 1) {
          autoMessage = `[Selected: ${selectedLabels[0]}]`;
        } else {
          autoMessage = `[Selected: ${selectedLabels.join(", ")}]`;
        }
      } else {
        return; // No valid response
      }

      // Send the auto-continue message
      handleSendMessage(autoMessage);
    },
    [
      messages,
      updateToolCallOutput,
      updateToolCallOutputMutation,
      handleSendMessage,
    ],
  );

  return {
    ...restChat,
    messages,
    sendMessage: handleSendMessage,
    regenerateMessage,
    selectedModel,
    handleModelChange,
    toolPreferences,
    updateToolPreferences,
    updateToolCallOutput,
    handleUIResponse,
    invalidateConversation: () =>
      queryClient.invalidateQueries(
        trpc.chat.getConversation.queryOptions({ conversationId }),
      ),
  };
}
