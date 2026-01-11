import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import type {
  ChatUIMessage,
  PersistedToolCallOutputUpdate,
} from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/chat";
import { withUpdatedOutput } from "@flatsby/validators/chat/tools";

import { trpc } from "./api";

export interface UseExpoChatOptions {
  conversationId: string;
  initialMessages?: ChatUIMessage[];
  initialModel?: ChatModel;
  groupId?: number;
  onFinish?: () => void;
}

/**
 * Custom hook that integrates AI SDK's useChat with tRPC streaming mutations for Expo.
 */
export function useExpoChat({
  conversationId,
  initialMessages = [],
  initialModel,
  groupId,
  onFinish,
}: UseExpoChatOptions) {
  const queryClient = useQueryClient();

  const [selectedModel, setSelectedModel] = useState<ChatModel | undefined>(
    initialModel,
  );

  const [toolPreferences, setToolPreferences] = useState<ToolPreferences>({
    shoppingListToolsEnabled: true,
    expenseToolsEnabled: true,
  });

  const handleModelChange = useCallback((model: ChatModel) => {
    setSelectedModel(model);
  }, []);

  const updateToolPreferences = useCallback(
    (newPrefs: Partial<ToolPreferences>) => {
      setToolPreferences((prev) => ({ ...prev, ...newPrefs }));
    },
    [],
  );

  const sendMutation = useMutation(trpc.chat.send.mutationOptions());

  // Use refs to always get the latest values without recreating transport
  const modelRef = useRef(selectedModel);
  const toolPreferencesRef = useRef(toolPreferences);
  const groupIdRef = useRef(groupId);

  useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    toolPreferencesRef.current = toolPreferences;
  }, [toolPreferences]);

  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);

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

  const handleFinish = useCallback(() => {
    void queryClient.invalidateQueries(
      trpc.chat.getConversation.queryOptions({ conversationId }),
    );
    void queryClient.invalidateQueries({
      queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
    });
    onFinish?.();
  }, [queryClient, conversationId, onFinish]);

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
