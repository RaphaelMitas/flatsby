import { Suspense } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { router, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import ShoppingListDashboardElement from "./ShoppingListDashboardElement";

export function ShoppingListsDashboard() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 p-4">
        <Text className="text-muted-foreground text-center text-lg font-semibold">
          Select a group to view its shopping lists
        </Text>
        <Button
          title="Manage Groups"
          variant="primary"
          size="lg"
          icon="arrow-left-right"
          onPress={() => router.push("/groups")}
        />
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            Loading shopping lists...
          </Text>
        </View>
      }
    >
      <ShoppingListsDashboardInner />
    </Suspense>
  );
}

function ShoppingListsDashboardInner() {
  const router = useRouter();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();

  const {
    data: shoppingLists,
    refetch,
    isRefetching,
  } = useSuspenseQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({
      groupId: selectedGroupId ?? -1,
    }),
  );

  if (!shoppingLists.success) {
    return handleApiError({
      router,
      error: shoppingLists.error,
    });
  }

  return (
    <SafeAreaView>
      <View className="flex h-full w-full flex-col gap-6 p-4">
        {/* Header */}
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">
            {selectedGroupName}
          </Text>
          <Button
            title="Group Settings"
            variant="outline"
            size="md"
            icon="settings"
            onPress={() => router.push(`/shoppingLists/edit-group`)}
          />
        </View>

        {/* Create New List Button */}
        <Button
          title="Create Shopping List"
          variant="primary"
          size="lg"
          icon="plus"
          onPress={() =>
            router.push(`/shoppingLists/create?groupId=${selectedGroupId}`)
          }
        />

        {/* Shopping Lists */}
        {shoppingLists.data.length === 0 ? (
          <View className="flex flex-col items-center justify-center gap-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              No shopping lists yet
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Create your first shopping list to get started
            </Text>
          </View>
        ) : (
          <FlashList
            data={shoppingLists.data}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            ItemSeparatorComponent={() => <View className="h-4" />}
            renderItem={({ item }) => (
              <ShoppingListDashboardElement
                shoppingList={item}
                groupId={selectedGroupId ?? -1}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
