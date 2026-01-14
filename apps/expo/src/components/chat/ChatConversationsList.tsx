import { useCallback } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { Skeleton } from "~/lib/ui/skeleton";
import { trpc } from "~/utils/api";

interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationListItem = ({ item }: { item: ConversationItem }) => {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/chat/${item.id}`)}
      className="border-border bg-card active:bg-muted flex-row items-center border-b px-4 py-3"
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

const EmptyState = () => {
  const router = useRouter();

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
      <Button
        title="New Chat"
        icon="plus"
        onPress={() => router.push("/chat/new")}
      />
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

export const ChatConversationsList = () => {
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
      <SafeAreaView>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-foreground text-xl font-bold">Chats</Text>
        </View>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-foreground text-xl font-bold">Chats</Text>
        <Link href="/chat/new" asChild>
          <Pressable className="bg-primary h-9 w-9 items-center justify-center rounded-full">
            <Icon name="plus" size={18} color="primary-foreground" />
          </Pressable>
        </Link>
      </View>

      {conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <FlashList
          data={conversations}
          renderItem={({ item }) => <ConversationListItem item={item} />}
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
      )}
    </SafeAreaView>
  );
};
