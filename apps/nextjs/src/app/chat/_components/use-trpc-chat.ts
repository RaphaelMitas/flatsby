"use client";

import type {
  ChatUIMessage,
  PersistedToolCallOutputUpdate,
} from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useToolPreferences } from "./useToolPreferences";

type OutputAvailableToolPart = Extract<
  ChatUIMessage["parts"][number],
  { state: "output-available"; toolCallId: string; output: object }
>;

function withUpdatedOutput<T extends OutputAvailableToolPart>(
  part: T,
  update: PersistedToolCallOutputUpdate,
): T {
  return {
    ...part,
    output: { ...part.output, ...update },
  };
}

// const DEFAULT_SETTINGS: ToolPreferences = {
//   shoppingListToolsEnabled: true,
//   expenseToolsEnabled: true,
// };

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

  const transport = useMemo(() => {
    return createTRPCChatTransport({
      sendMutation: async (mutationInput) => {
        return await sendMutation.mutateAsync({
          ...mutationInput,
          groupId: currentGroup?.id,
        });
      },
      getModel: () => selectedModel,
      getToolPreferences: () => toolPreferences,
      getGroupId: () => currentGroup?.id,
    });
  }, [sendMutation, selectedModel, toolPreferences, currentGroup?.id]);

  const handleFinish = () => {
    void queryClient.invalidateQueries(
      trpc.chat.getConversation.queryOptions({ conversationId }),
    );
    void queryClient.invalidateQueries({
      queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
    });
    onFinish?.();
  };

  const { regenerate, setMessages, sendMessage, ...restChat } = useChat({
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

  return {
    ...restChat,
    sendMessage: handleSendMessage,
    regenerateMessage,
    selectedModel,
    handleModelChange,
    toolPreferences,
    updateToolPreferences,
    updateToolCallOutput,
    invalidateConversation: () =>
      queryClient.invalidateQueries(
        trpc.chat.getConversation.queryOptions({ conversationId }),
      ),
  };
}
