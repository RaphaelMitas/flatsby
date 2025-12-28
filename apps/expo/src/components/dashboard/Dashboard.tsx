import { Suspense } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

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
  const { selectedGroupId, selectedGroupName, selectedShoppingListName } =
    useShoppingStore();

  // All hooks must be called unconditionally
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  if (!selectedGroupId) {
    return null;
  }

  if (!userWithGroups.success) {
    return handleApiError({ router, error: userWithGroups.error });
  }

  return (
    <ScrollView className="flex-1">
      <View className="flex flex-col gap-6 p-2">
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">
            {selectedGroupName}
          </Text>
          <Button
            title="Change Group"
            variant="outline"
            size="md"
            icon="arrow-left-right"
            onPress={() => router.push("/(tabs)/groups")}
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
              title="Manage Shopping Lists"
              variant={selectedShoppingListName ? "outline" : "primary"}
              icon="shopping-cart"
              onPress={() => router.push("/(tabs)/shoppingLists")}
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
    </ScrollView>
  );
}
