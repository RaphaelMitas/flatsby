import React from "react";
import { RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "~/lib/ui/button";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import GroupsDashboardElement from "./GroupsDashboardElement";

export function GroupsDashboard() {
  const router = useRouter();

  const {
    data: groups,
    refetch,
    isRefetching,
  } = useSuspenseQuery(trpc.shoppingList.getUserGroups.queryOptions());

  if (!groups.success) {
    return handleApiError({ router, error: groups.error });
  }

  return (
    <View className="h-full w-full">
      <View className="flex h-full w-full flex-col gap-6 p-4">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-foreground">
            Your Groups
          </Text>

          <Button
            title="Create Group"
            variant="primary"
            size="lg"
            icon="plus"
            onPress={() => router.push("/groups/create")}
          />
        </View>

        {groups.data.length === 0 && (
          <View className="flex flex-col items-center justify-center gap-4">
            <Text className="text-center text-lg font-semibold text-foreground">
              No groups yet
            </Text>
            <Button
              title="Create a Group"
              variant="primary"
              size="lg"
              onPress={() => router.push("/groups/create")}
            />
            <Text className="text-center text-sm text-muted-foreground">
              Pull down to refresh if you've been invited
            </Text>
          </View>
        )}
        <FlashList
          data={groups.data}
          estimatedItemSize={80}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ItemSeparatorComponent={() => <View className="h-4" />}
          renderItem={(item) => <GroupsDashboardElement group={item.item} />}
        />
      </View>
    </View>
  );
}
