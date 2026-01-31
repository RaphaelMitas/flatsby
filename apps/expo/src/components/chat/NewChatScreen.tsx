import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import type { ChatModel } from "@flatsby/validators/models";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CHAT_MODELS } from "@flatsby/validators/models";

import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { ChatFooter } from "./ChatFooter";

interface NewChatScreenProps {
  onSuccess?: (conversationId: string, initialMessage: string) => void;
}

export const NewChatScreen = ({ onSuccess }: NewChatScreenProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedModel, setSelectedModel] = useState<ChatModel>(
    CHAT_MODELS[0].id,
  );

  const [toolPreferences, setToolPreferences] = useState<ToolPreferences>({
    toolsEnabled: true,
  });

  const updateToolPreferences = useCallback(
    (newPrefs: Partial<ToolPreferences>) => {
      setToolPreferences((prev) => ({ ...prev, ...newPrefs }));
    },
    [],
  );

  const createConversation = useMutation(
    trpc.chat.createConversation.mutationOptions({}),
  );

  const isLoading = createConversation.isPending;

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || createConversation.isPending) return;
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
    [createConversation, queryClient, router, selectedModel, onSuccess],
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
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          toolPreferences={toolPreferences}
          onToolPreferencesChange={updateToolPreferences}
          status={isLoading ? "submitted" : "ready"}
          error={createConversation.error?.message}
        />
      </View>
    </BottomSheetPickerProvider>
  );

  if (onSuccess) {
    return content;
  }

  return <SafeAreaView>{content}</SafeAreaView>;
};
