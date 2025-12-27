import { Suspense } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { router, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { ExpenseCard } from "./ExpenseCard";

export function ExpensesDashboard() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return (
      <View className="bg-background flex-1 items-center justify-center gap-4 p-4">
        <Icon name="receipt" size={48} color="muted-foreground" />
        <Text className="text-muted-foreground text-center text-lg font-semibold">
          Select a group to view its expenses
        </Text>
        <Button
          title="Manage Groups"
          variant="primary"
          size="lg"
          icon="arrow-left-right"
          onPress={() => router.push("/(tabs)/groups")}
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
            Loading expenses...
          </Text>
        </View>
      }
    >
      <ExpensesDashboardInner />
    </Suspense>
  );
}

function ExpensesDashboardInner() {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();

  // Get group data
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId ?? -1 }),
  );

  // Get expenses with infinite scroll
  const {
    data: expensesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery(
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId: selectedGroupId ?? -1, limit: 20 },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  if (!groupData.success) {
    return handleApiError({
      router,
      error: groupData.error,
    });
  }

  const allExpenses =
    expensesData?.pages
      .flatMap((page) => (page.success === true ? page.data.items : []))
      .filter(
        (expense, index, self) =>
          index === self.findIndex((e) => e.id === expense.id),
      ) ?? [];

  const hasExpenses = allExpenses.length > 0;

  const handleEdit = (expenseId: number) => {
    router.push({
      pathname: "/(tabs)/expenses/[expenseId]/edit",
      params: { expenseId: expenseId.toString() },
    });
  };

  return (
    <>
      <View className="flex h-full w-full flex-col p-4">
        {/* Header */}
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">Expenses</Text>
          <Button
            title="Settings"
            variant="outline"
            size="md"
            icon="settings"
            onPress={() => router.push(`/(tabs)/shoppingLists/edit-group`)}
          />
        </View>

        {/* Expenses List */}
        {!hasExpenses ? (
          <View className="flex flex-1 flex-col items-center justify-center gap-4">
            <Icon name="receipt" size={64} color="muted-foreground" />
            <Text className="text-foreground text-lg font-semibold">
              No expenses yet
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Start tracking expenses by adding your first one
            </Text>
            <Button
              title="Add Expense"
              variant="primary"
              size="lg"
              icon="plus"
              onPress={() => router.push("/(tabs)/expenses/create")}
            />
          </View>
        ) : (
          <View className="flex-1">
            <FlashList
              data={allExpenses}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
              }
              ItemSeparatorComponent={() => <View className="h-3" />}
              renderItem={({ item }) => (
                <ExpenseCard
                  expense={item}
                  groupId={selectedGroupId ?? -1}
                  onEdit={() => handleEdit(item.id)}
                />
              )}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  void fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View className="py-4">
                    <ActivityIndicator size="small" />
                  </View>
                ) : null
              }
            />
          </View>
        )}

        {/* FAB Button */}
        {hasExpenses && (
          <Button
            title="Create Expense"
            variant="primary"
            size="lg"
            icon="plus"
            onPress={() => router.push("/(tabs)/expenses/create")}
            className="h-14 w-14"
          />
        )}
      </View>
    </>
  );
}
