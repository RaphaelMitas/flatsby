"use client";

import type { UIMessage } from "ai";
import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";

import { useTRPC } from "~/trpc/react";

interface UseTRPCChatOptions {
  conversationId: string;
  initialMessages?: UIMessage[];
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
  onFinish,
}: UseTRPCChatOptions) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // AI SDK v5: Input state must be managed externally
  const [input, setInput] = useState("");

  // Use tanstack-query mutation for the streaming call
  const sendMutation = useMutation(trpc.chat.send.mutationOptions());

  // Create the tRPC transport that converts mutations to ReadableStreams
  const transport = useMemo(() => {
    return createTRPCChatTransport(async (mutationInput) => {
      return await sendMutation.mutateAsync(mutationInput);
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
  }, [queryClient, trpc.chat.getConversation, trpc.chat.getUserConversations, conversationId, onFinish]);

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
    // Expose input management since AI SDK v5 doesn't manage it
    input,
    setInput,
    handleSubmit,
    regenerateMessage,
    // Expose for manual invalidation if needed
    invalidateConversation: () =>
      queryClient.invalidateQueries(
        trpc.chat.getConversation.queryOptions({ conversationId }),
      ),
  };
}
