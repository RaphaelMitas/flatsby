"use client";

import type { ChatSettings } from "@flatsby/validators/chat/messages";
import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";

const SETTINGS_STORAGE_KEY = "chat-settings";

const DEFAULT_SETTINGS: ChatSettings = {
  toolsEnabled: false,
};

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

  // Settings state - tracks tool configuration (without groupId, which comes from context)
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<ChatSettings>(settings);
  const currentGroupRef = useRef<number | undefined>(currentGroup?.id);

  // Keep currentGroupRef in sync
  useEffect(() => {
    currentGroupRef.current = currentGroup?.id;
  }, [currentGroup?.id]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatSettings;
        // Don't persist groupId - it comes from context
        setSettings({ ...parsed, groupId: undefined });
        settingsRef.current = { ...parsed, groupId: undefined };
      }
    } catch {
      // Ignore parse errors, use defaults
    }
  }, []);

  // Update settings and persist to localStorage
  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      settingsRef.current = updated;
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const sendMutation = useMutation(trpc.chat.send.mutationOptions());

  // Uses ref so transport doesn't need to be recreated when model/settings changes
  const transport = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return createTRPCChatTransport({
      sendMutation: async (mutationInput) => {
        return await sendMutation.mutateAsync(mutationInput);
      },
      getModel: () => modelRef.current,
      getSettings: () => ({
        ...settingsRef.current,
        // Include groupId from context when tools are enabled
        groupId: settingsRef.current.toolsEnabled
          ? currentGroupRef.current
          : undefined,
      }),
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
      queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
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
  // Accepts optional message parameter to override input state (useful for auto-send on mount)
  const handleSubmit = useCallback(
    (e?: React.FormEvent, message?: string) => {
      e?.preventDefault();
      const text = message ?? input;
      if (!text.trim()) return;

      // AI SDK v5: use sendMessage with a message object
      void chat.sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
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
    settings,
    updateSettings,
    invalidateConversation: () =>
      queryClient.invalidateQueries(
        trpc.chat.getConversation.queryOptions({ conversationId }),
      ),
  };
}
