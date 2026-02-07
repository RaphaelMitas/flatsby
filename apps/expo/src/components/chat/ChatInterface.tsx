import type { ChatUIMessage } from "@flatsby/validators/chat/tools";
import type { ChatModel } from "@flatsby/validators/models";
import type { ComponentRef } from "react";
import type { LayoutChangeEvent, NativeScrollEvent } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import {
  CHAT_FEATURES,
  CHAT_MESSAGE_LIMIT,
} from "@flatsby/validators/chat/messages";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { useShoppingStore } from "~/utils/shopping-store";
import { useExpoChat } from "~/utils/use-expo-chat";
import { ChatFooter } from "./ChatFooter";
import { ChatMessage } from "./ChatMessage";

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages?: ChatUIMessage[];
  initialModel?: ChatModel;
  initialMessage?: string;
}

const EmptyState = () => (
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
);

export const ChatInterface = ({
  conversationId,
  initialMessages = [],
  initialModel,
  initialMessage,
}: ChatInterfaceProps) => {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();
  const hasAutoSent = useRef(false);

  const flashListRef =
    useRef<ComponentRef<typeof FlashList<ChatUIMessage>>>(null);
  const contentHeight = useRef(0);
  const scrollViewHeight = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const hasInitialScrolled = useRef(false);

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerateMessage,
    selectedModel,
    handleModelChange,
    toolPreferences,
    updateToolPreferences,
    handleUIResponse,
    invalidateConversation,
  } = useExpoChat({
    conversationId,
    initialMessages,
    initialModel,
    groupId: selectedGroupId ?? undefined,
  });

  const [refreshing, setRefreshing] = useState(false);

  const isStreaming = status === "streaming";
  const isSubmitting = status === "submitted";
  const isLoading = isStreaming || isSubmitting;
  const isAtMessageLimit = messages.length >= CHAT_MESSAGE_LIMIT;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await invalidateConversation();
    setRefreshing(false);
  }, [invalidateConversation]);

  const handleScroll = useCallback(
    (event: { nativeEvent: NativeScrollEvent }) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      setIsAtBottom(distanceFromBottom < 100);
    },
    [],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    scrollViewHeight.current = event.nativeEvent.layout.height;
  }, []);

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;

      // Initial scroll to bottom when first rendered
      if (!hasInitialScrolled.current) {
        flashListRef.current?.scrollToEnd({ animated: true });
        hasInitialScrolled.current = true;
        return;
      }

      // Auto-scroll during streaming when user is at bottom
      if (isStreaming && isAtBottom && flashListRef.current) {
        const offset = Math.max(0, height - scrollViewHeight.current);
        flashListRef.current.scrollToOffset({ offset, animated: false });
      }
    },
    [isStreaming, isAtBottom],
  );

  const scrollToBottom = useCallback(() => {
    if (flashListRef.current) {
      const offset = Math.max(
        0,
        contentHeight.current - scrollViewHeight.current,
      );
      flashListRef.current.scrollToOffset({ offset, animated: true });
    }
  }, []);

  useEffect(() => {
    if (initialMessage && !hasAutoSent.current) {
      sendMessage(initialMessage);
      hasAutoSent.current = true;
    }
  }, [initialMessage, sendMessage]);

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (!isLoading) {
        regenerateMessage(messageId);
      }
    },
    [isLoading, regenerateMessage],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatUIMessage }) => (
      <ChatMessage
        message={item}
        isLoading={isLoading}
        onRegenerate={
          CHAT_FEATURES.regenerateEnabled && item.role === "assistant"
            ? handleRegenerate
            : undefined
        }
        onUIResponse={handleUIResponse}
      />
    ),
    [isLoading, handleRegenerate, handleUIResponse],
  );

  return (
    <BottomSheetPickerProvider>
      <View className="flex-1">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="flex-1">
            <FlashList
              ref={flashListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerClassName="p-4"
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              onLayout={handleLayout}
              onContentSizeChange={handleContentSizeChange}
              scrollEventThrottle={16}
              renderScrollComponent={(props) => <AppScrollView {...props} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
            />
            {/* Scroll to bottom button */}
            {!isAtBottom && messages.length > 0 && (
              <View className="absolute bottom-2 left-1/2 translate-x-[-50%]">
                <Button
                  className="rounded-full p-3"
                  variant="outline"
                  size="icon"
                  icon="arrow-down"
                  onPress={scrollToBottom}
                />
              </View>
            )}
          </View>
        )}

        {isAtMessageLimit && (
          <View className="border-border flex-row items-center justify-center gap-3 border-t py-3">
            <Text className="text-muted-foreground text-sm">
              Message limit reached ({CHAT_MESSAGE_LIMIT})
            </Text>
            <Button
              title="New Chat"
              size="sm"
              onPress={() => router.push("/chat/new")}
            />
          </View>
        )}

        <ChatFooter
          sendMessage={sendMessage}
          selectedModel={selectedModel ?? null}
          onModelChange={handleModelChange}
          toolPreferences={toolPreferences}
          onToolPreferencesChange={updateToolPreferences}
          status={status}
          disabled={isAtMessageLimit}
          error={error?.message}
        />
      </View>
    </BottomSheetPickerProvider>
  );
};
