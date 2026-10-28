import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import ShoppingListDashboardElement from "./ShoppingListDashboardElement";

export function ShoppingListsDashboard() {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 p-4">
        <Text className="text-muted-foreground text-center text-lg font-semibold">
          {t("shoppingList.selectGroupToViewLists")}
        </Text>
        <Button
          title={t("navigation.manageGroups")}
          variant="primary"
          size="lg"
          icon="arrow-left-right"
          onPress={() => router.push("/")}
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
            {t("shoppingList.loadingLists")}
          </Text>
        </View>
      }
    >
      <ShoppingListsDashboardInner />
    </Suspense>
  );
}

function ShoppingListsDashboardInner() {
  const t = useTranslations();
  const router = useRouter();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();

  const { data: shoppingLists, refetch } = useSuspenseQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({
      groupId: selectedGroupId ?? -1,
    }),
  );

  if (!shoppingLists.success) {
    return null;
  }

  return (
    <SafeAreaView edges={[]}>
      <View className="flex-1 flex-col gap-6 p-4">
        {/* Header */}
        <View className="flex flex-row items-center justify-between">
          <Text
            testID="shopping-lists-group-name"
            className="text-foreground flex-1 text-3xl font-bold"
            numberOfLines={1}
          >
            {selectedGroupName}
          </Text>
          <Button
            testID="shopping-lists-group-settings"
            title={t("navigation.groupSettings")}
            variant="outline"
            size="md"
            icon="settings"
            onPress={() =>
              router.navigate("/(tabs)/settings/group-settings", {
                withAnchor: true,
              })
            }
          />
        </View>

        {/* Create New List Button */}
        <Button
          testID="shopping-list-create-button"
          title={t("shoppingList.createShoppingList")}
          variant="primary"
          size="lg"
          icon="plus"
          onPress={() =>
            router.push(
              `/(tabs)/home/shopping-lists/create?groupId=${selectedGroupId}`,
            )
          }
        />

        {/* Shopping Lists */}
        {shoppingLists.data.length === 0 ? (
          <View className="flex flex-col items-center justify-center gap-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("shoppingList.noListsYet")}
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {t("shoppingList.noListsHint")}
            </Text>
          </View>
        ) : (
          <PullToRefresh onRefresh={refetch} parentPaddingX={16}>
            {(refreshProps) => (
              <FlashList
                {...refreshProps}
                data={shoppingLists.data}
                ItemSeparatorComponent={() => <View className="h-4" />}
                renderItem={({ item }) => (
                  <ShoppingListDashboardElement
                    shoppingList={item}
                    groupId={selectedGroupId ?? -1}
                  />
                )}
              />
            )}
          </PullToRefresh>
        )}
      </View>
    </SafeAreaView>
  );
}
