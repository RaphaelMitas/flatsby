import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import { useCallback } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useChatStore } from "~/utils/chat-store";
import { useShoppingStore } from "~/utils/shopping-store";
import { ChatFooter } from "./ChatFooter";

interface NewChatScreenProps {
  onSuccess?: (conversationId: string, initialMessage: string) => void;
}

export const NewChatScreen = ({ onSuccess }: NewChatScreenProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId } = useShoppingStore();
  const {
    selectedModel,
    setSelectedModel,
    toolsEnabled,
    setToolsEnabled,
    isLoading: isLoadingStore,
  } = useChatStore();

  const updateToolPreferences = useCallback(
    (newPrefs: Partial<ToolPreferences>) => {
      if (typeof newPrefs.toolsEnabled === "boolean") {
        setToolsEnabled(newPrefs.toolsEnabled);
      }
    },
    [setToolsEnabled],
  );

  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({}),
  );

  const isLoading = createConversation.isPending;

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || createConversation.isPending || isLoadingStore)
        return;
      createConversation.mutate(
        { model: selectedModel },
        {
          onSuccess: (conversation) => {
            void queryClient.invalidateQueries({
              queryKey: trpc.chat.getUserConversations.infiniteQueryKey(),
            });
            if (onSuccess) {
              onSuccess(conversation.id, text);
            } else {
              router.replace(
                `/chat/${conversation.id}?message=${encodeURIComponent(text)}` as const,
              );
            }
          },
        },
      );
    },
    [
      createConversation,
      queryClient,
      router,
      selectedModel,
      onSuccess,
      isLoadingStore,
    ],
  );

  const content = (
    <BottomSheetPickerProvider>
      <View className="flex-1">
        <View className="flex-1 items-center justify-center p-8">
          <View className="bg-muted mb-4 h-16 w-16 items-center justify-center rounded-full">
            <Icon name="message-square" size={32} color="muted-foreground" />
          </View>
          <Text className="text-foreground mb-2 text-xl font-semibold">
            Start a conversation
          </Text>
          <Text className="text-muted-foreground text-center">
            Ask me anything and I'll help you out
          </Text>
        </View>

        <ChatFooter
          sendMessage={sendMessage}
          selectedModel={isLoadingStore ? null : selectedModel}
          onModelChange={setSelectedModel}
          toolPreferences={{ toolsEnabled }}
          onToolPreferencesChange={updateToolPreferences}
          status={isLoading ? "submitted" : "ready"}
          error={createConversation.error?.message}
          hasGroup={!!selectedGroupId}
        />
      </View>
    </BottomSheetPickerProvider>
  );

  if (onSuccess) {
    return content;
  }

  return <SafeAreaView>{content}</SafeAreaView>;
};
