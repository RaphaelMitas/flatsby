import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";

import { useMediaQuery } from "../splitview/useMediaQuery";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { ExpenseCard } from "./ExpenseCard";

interface ExpenseListPanelProps {
  selectedExpenseId: number | null;
  onSelectExpense: (expenseId: number) => void;
  onCreateExpense: () => void;
}

export function ExpenseListPanel({
  selectedExpenseId,
  onSelectExpense,
  onCreateExpense,
}: ExpenseListPanelProps) {
  const router = useRouter();
  const { selectedGroupId } = useShoppingStore();
  const isLargeScreen = useMediaQuery("lg");

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId ?? -1 }),
  );

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

  const handleEdit = (expense: ExpenseWithSplitsAndMembers) => {
    if (expense.splitMethod === "settlement") {
      router.push({
        pathname: "/(tabs)/expenses/settle",
        params: { expenseId: expense.id.toString() },
      });
    } else {
      router.push({
        pathname: "/(tabs)/expenses/[expenseId]/edit",
        params: { expenseId: expense.id.toString() },
      });
    }
  };

  return (
    <View className="flex-1 px-4">
      <View className="mb-6 flex-row items-center justify-between">
        <Text className="text-foreground text-3xl font-bold">Expenses</Text>
        <View className="flex-row items-center gap-2">
          <Button
            title="Debt Overview"
            size="md"
            icon="arrow-right"
            onPress={() => router.push(`/(tabs)/expenses/debts`)}
          />
          {isLargeScreen && (
            <Button
              title="Add"
              size="md"
              icon="plus"
              onPress={onCreateExpense}
            />
          )}
        </View>
      </View>

      {!hasExpenses ? (
        <View className="flex flex-1 flex-col items-center justify-center gap-4">
          <Icon name="wallet" size={64} color="muted-foreground" />
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
            onPress={onCreateExpense}
          />
        </View>
      ) : (
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
              isSelected={item.id === selectedExpenseId}
              onSelect={() => onSelectExpense(item.id)}
              onEdit={() => handleEdit(item)}
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
      )}
      {hasExpenses && !isLargeScreen && (
        <View className="absolute right-4 bottom-4">
          <Button size="icon" icon="plus" onPress={onCreateExpense} />
        </View>
      )}
    </View>
  );
}
