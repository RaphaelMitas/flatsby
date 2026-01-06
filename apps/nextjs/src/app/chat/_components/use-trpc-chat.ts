"use client";

import type {
  ChatModel,
  UIMessageWithMetadata,
} from "@flatsby/validators/chat";
import { useCallback, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";

import { useTRPC } from "~/trpc/react";

export interface UseTRPCChatOptions {
  conversationId: string;
  initialMessages?: UIMessageWithMetadata[];
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

  // AI SDK v5: Input state must be managed externally
  const [input, setInput] = useState("");

  // Model state - tracks the currently selected model
  const [selectedModel, setSelectedModel] = useState<ChatModel | undefined>(
    initialModel,
  );
  const modelRef = useRef<ChatModel | undefined>(selectedModel);

  const handleModelChange = useCallback((model: ChatModel) => {
    modelRef.current = model;
    setSelectedModel(model);
  }, []);

  const sendMutation = useMutation(trpc.chat.send.mutationOptions());

  // Uses ref so transport doesn't need to be recreated when model changes
  const transport = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return createTRPCChatTransport({
      sendMutation: async (mutationInput) => {
        return await sendMutation.mutateAsync(mutationInput);
      },
      getModel: () => modelRef.current,
    });
  }, [sendMutation]);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleFinish = useCallback(() => {
    // Invalidate conversation data
    void queryClient.invalidateQueries(
      trpc.chat.getConversation.queryOptions({ conversationId }),
    );
    // Invalidate conversations list (for title updates in sidebar)
    void queryClient.invalidateQueries({
      queryKey: trpc.chat.getUserConversations.queryKey(),
    });
    onFinish?.();
  }, [
    queryClient,
    trpc.chat.getConversation,
    trpc.chat.getUserConversations,
    conversationId,
    onFinish,
  ]);

  // Use the AI SDK's useChat hook with our custom transport
  const chat = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: handleFinish,
  });

  // Helper to regenerate a message
  const regenerateMessage = useCallback(
    (messageId: string) => {
      void chat.regenerate({ messageId });
    },
    [chat],
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim()) return;

      // AI SDK v5: use sendMessage with a message object
      void chat.sendMessage({
        role: "user",
        parts: [{ type: "text", text: input }],
      });
      setInput("");
    },
    [chat, input],
  );

  return {
    ...chat,
    input,
    setInput,
    handleSubmit,
    regenerateMessage,
    selectedModel,
    handleModelChange,
    invalidateConversation: () =>
      queryClient.invalidateQueries(
        trpc.chat.getConversation.queryOptions({ conversationId }),
      ),
  };
}
