import { useCallback } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useMediaQuery } from "../splitview/useMediaQuery";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";

interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationListItemProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: () => void;
}

const ConversationListItem = ({
  item,
  isSelected,
  onSelect,
}: ConversationListItemProps) => {
  return (
    <Pressable
      onPress={onSelect}
      className={cn(
        "border-border active:bg-muted flex-row items-center border-b px-4 py-3",
        isSelected ? "bg-muted" : "bg-card",
      )}
    >
      <View className="bg-primary/10 mr-3 h-10 w-10 items-center justify-center rounded-full">
        <Icon name="message-square" size={18} color="primary" />
      </View>
      <View className="flex-1">
        <Text
          className="text-foreground text-base font-medium"
          numberOfLines={1}
        >
          {item.title ?? "New Chat"}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color="muted-foreground" />
    </Pressable>
  );
};

interface EmptyStateProps {
  onCreateConversation: () => void;
}

const EmptyState = ({ onCreateConversation }: EmptyStateProps) => {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="bg-muted mb-4 h-16 w-16 items-center justify-center rounded-full">
        <Icon name="message-square" size={32} color="muted-foreground" />
      </View>
      <Text className="text-foreground mb-2 text-xl font-semibold">
        No conversations yet
      </Text>
      <Text className="text-muted-foreground mb-6 text-center">
        Start a new chat to get help with your shopping lists and expenses
      </Text>
      <Button title="New Chat" icon="plus" onPress={onCreateConversation} />
    </View>
  );
};

const LoadingSkeleton = () => (
  <View className="gap-2 p-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} className="flex-row items-center gap-3 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </View>
      </View>
    ))}
  </View>
);

interface ChatListPanelProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
}

export function ChatListPanel({
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
}: ChatListPanelProps) {
  const isLargeScreen = useMediaQuery("lg");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery(
    trpc.chat.getUserConversations.infiniteQueryOptions(
      { limit: 20 },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  );

  const conversations = data?.pages.flatMap((page) => page.items) ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-foreground text-xl font-bold">Chats</Text>
          {isLargeScreen && (
            <Button
              title="New Chat"
              size="md"
              icon="plus"
              onPress={onCreateConversation}
            />
          )}
        </View>
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-foreground text-xl font-bold">Chats</Text>
        {isLargeScreen && (
          <Button
            title="New Chat"
            size="md"
            icon="plus"
            onPress={onCreateConversation}
          />
        )}
      </View>

      {conversations.length === 0 ? (
        <EmptyState onCreateConversation={onCreateConversation} />
      ) : (
        <View className="flex-1">
          <FlashList
            data={conversations}
            renderItem={({ item }) => (
              <ConversationListItem
                item={item}
                isSelected={item.id === selectedConversationId}
                onSelect={() => onSelectConversation(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="items-center py-4">
                  <Icon name="loader" size={24} color="primary" />
                </View>
              ) : null
            }
          />
          {conversations.length > 0 && !isLargeScreen && (
            <View className="absolute right-4 bottom-4">
              <Button
                size="icon"
                icon="plus"
                onPress={onCreateConversation}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
