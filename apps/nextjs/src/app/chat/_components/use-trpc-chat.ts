"use client";

import type { ChatSettings } from "@flatsby/validators/chat/messages";
import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createTRPCChatTransport } from "@flatsby/ui/chat-transport";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";

const DEFAULT_SETTINGS: ChatSettings = {
  shoppingListToolsEnabled: false,
  expenseToolsEnabled: false,
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
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Query user data to get tool preferences
  const { data: userData } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  // Keep currentGroupRef in sync
  useEffect(() => {
    currentGroupRef.current = currentGroup?.id;
  }, [currentGroup?.id]);

  // Load settings from user preferences
  useEffect(() => {
    if (prefsLoaded || !userData?.success || !userData.data.user) return;

    const user = userData.data.user;
    const loadedSettings: ChatSettings = {
      shoppingListToolsEnabled: user.lastShoppingListToolsEnabled ?? false,
      expenseToolsEnabled: user.lastExpenseToolsEnabled ?? false,
    };
    setSettings(loadedSettings);
    settingsRef.current = loadedSettings;
    setPrefsLoaded(true);
  }, [userData, prefsLoaded]);

  // Mutation to save tool preferences
  const updateToolPrefsMutation = useMutation(
    trpc.chat.updateToolPreferences.mutationOptions(),
  );

  // Update settings and persist to user preferences
  const updateSettings = useCallback(
    (newSettings: Partial<ChatSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        settingsRef.current = updated;

        // Save to user preferences
        updateToolPrefsMutation.mutate({
          shoppingListToolsEnabled: updated.shoppingListToolsEnabled,
          expenseToolsEnabled: updated.expenseToolsEnabled,
        });

        return updated;
      });
    },
    [updateToolPrefsMutation],
  );

  const sendMutation = useMutation(trpc.chat.send.mutationOptions());

  // Uses ref so transport doesn't need to be recreated when model/settings changes
  const transport = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    return createTRPCChatTransport({
      sendMutation: async (mutationInput) => {
        return await sendMutation.mutateAsync(mutationInput);
      },
      getModel: () => modelRef.current,
      getSettings: () => {
        const currentSettings = settingsRef.current;
        const anyToolsEnabled =
          currentSettings.shoppingListToolsEnabled ||
          currentSettings.expenseToolsEnabled;
        return {
          ...currentSettings,
          // Include groupId from context when any tools are enabled
          groupId: anyToolsEnabled ? currentGroupRef.current : undefined,
        };
      },
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
