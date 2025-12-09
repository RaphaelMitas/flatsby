import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useRouter } from "expo-router";
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
      <View className="flex-1 items-center justify-center gap-4 bg-background p-4">
        <Text className="text-center text-lg font-semibold text-muted-foreground">
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

  return <ShoppingListsDashboardInner />;
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <SafeAreaView>
          <View className="flex-1 p-4">
            {/* Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-foreground">
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
            <View className="mb-6">
              <Button
                title="Create Shopping List"
                variant="primary"
                size="lg"
                icon="plus"
                onPress={() =>
                  router.push(
                    `/shoppingLists/create?groupId=${selectedGroupId}`,
                  )
                }
              />
            </View>

            {/* Shopping Lists */}
            <View className="gap-4">
              {shoppingLists.data.length === 0 ? (
                <View className="flex items-center justify-center py-8">
                  <Text className="text-center text-lg font-semibold text-foreground">
                    No shopping lists yet
                  </Text>
                  <Text className="mt-2 text-center text-sm text-muted-foreground">
                    Create your first shopping list to get started
                  </Text>
                </View>
              ) : (
                shoppingLists.data.map((list) => (
                  <ShoppingListDashboardElement
                    key={list.id}
                    shoppingList={list}
                    groupId={selectedGroupId ?? -1}
                  />
                ))
              )}
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}
