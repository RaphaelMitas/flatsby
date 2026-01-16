import { Suspense, useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { GroupsDashboard } from "../groupDashboard/GroupsDashboard";
import { RecentActivity } from "./RecentActivity";
import { UserDebtSummary } from "./UserDebtSummary";

export function Dashboard() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return <GroupsDashboard />;
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            Loading dashboard...
          </Text>
        </View>
      }
    >
      <DashboardWithGroup />
    </Suspense>
  );
}

function DashboardWithGroup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId, selectedGroupName, selectedShoppingListName } =
    useShoppingStore();
  const [refreshing, setRefreshing] = useState(false);

  // All hooks must be called unconditionally
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  if (!selectedGroupId) {
    return null;
  }

  if (!userWithGroups.success) {
    return handleApiError({ router, error: userWithGroups.error });
  }

  return (
    <AppScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="flex flex-col gap-6 p-2">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">
            {selectedGroupName}
          </Text>
          <Button
            title="Group Settings"
            variant="outline"
            size="md"
            icon="settings"
            onPress={() => router.push("/(tabs)/home/group-settings")}
          />
        </View>

        <UserDebtSummary groupId={selectedGroupId} />

        <Card>
          <CardHeader>
            {selectedShoppingListName && (
              <CardDescription>Current Shopping List</CardDescription>
            )}
            <CardTitle>
              {selectedShoppingListName ?? "Shopping Lists"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              title="Select Shopping List"
              variant={selectedShoppingListName ? "outline" : "primary"}
              icon="shopping-cart"
              onPress={() => router.push("/(tabs)/home/shopping-lists")}
            />
            {selectedShoppingListName && (
              <Button
                title="View Shopping List"
                icon="arrow-right"
                onPress={() => router.push("/(tabs)/shoppingList")}
              />
            )}
          </CardContent>
        </Card>

        <RecentActivity />
      </View>
    </AppScrollView>
  );
}
