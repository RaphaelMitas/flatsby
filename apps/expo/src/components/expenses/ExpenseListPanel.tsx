import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { Href } from "expo-router";
import { Suspense, useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useMediaQuery } from "../splitview/useMediaQuery";
import { ExpenseCard } from "./ExpenseCard";

export function ExpenseListPanel() {
  const t = useTranslations();

  return (
    <SafeAreaView>
      <Suspense
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-muted-foreground mt-4">
              {t("expenses.loadingExpenses")}
            </Text>
          </View>
        }
      >
        <ExpenseList />
      </Suspense>
    </SafeAreaView>
  );
}

function ExpenseList() {
  const router = useRouter();
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const isLargeScreen = useMediaQuery("md");
  const { expenseId } = useGlobalSearchParams<{ expenseId?: string }>();
  const pathname = usePathname();
  const inPane = isLargeScreen && pathname !== "/expenses";
  // Beside the stack, a pick swaps what the pane shows instead of piling up
  const open = (href: Href) =>
    inPane ? router.replace(href) : router.push(href);
  // dismissTo returns to a named screen that is already open, keeping its draft
  const openScreen = (href: Href) =>
    inPane ? router.dismissTo(href) : router.push(href);
  const createExpense = () => openScreen("/(tabs)/expenses/create");

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: selectedGroupId ?? -1 }),
  );

  const {
    data: expensesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery(
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId: selectedGroupId ?? -1, limit: PAGE_SIZE.expenses },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    return refetch().finally(() => setRefreshing(false));
  }, [refetch]);

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
    const id = expense.id.toString();
    const isSettlement = expense.splitMethod === "settlement";
    const path = isSettlement ? "/expenses/settle" : `/expenses/${id}/edit`;
    if (pathname === path && expenseId === id) return;
    open({
      pathname: isSettlement
        ? "/(tabs)/expenses/settle"
        : "/(tabs)/expenses/[expenseId]/edit",
      params: { expenseId: id },
    });
  };

  return (
    <View className="flex-1 px-4">
      <View className="mb-6 flex-row flex-wrap items-center justify-between gap-2">
        <Text
          testID="expense-heading"
          className="text-foreground text-3xl font-bold"
        >
          {t("navigation.expenses")}
        </Text>
        <View className="flex-row items-center gap-2">
          <Button
            testID="expense-debt-overview-button"
            title={t("expenses.debtOverview")}
            size="md"
            icon="arrow-right"
            onPress={() => openScreen("/(tabs)/expenses/debts")}
          />
          {isLargeScreen && (
            <Button
              testID="expense-add-button"
              title={t("expenses.add")}
              size="md"
              icon="plus"
              onPress={createExpense}
            />
          )}
        </View>
      </View>

      {!hasExpenses ? (
        <View className="flex flex-1 flex-col items-center justify-center gap-4">
          <Icon name="wallet" size={64} color="muted-foreground" />
          <Text className="text-foreground text-lg font-semibold">
            {t("expenses.emptyTitle")}
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {t("expenses.emptyHint")}
          </Text>
          <Button
            testID="expense-add-button"
            title={t("expenses.addExpense")}
            variant="primary"
            size="lg"
            icon="plus"
            onPress={createExpense}
          />
        </View>
      ) : (
        <PullToRefresh
          refreshing={refreshing}
          onRefresh={handleRefresh}
          parentPaddingX={16}
        >
          {(refreshProps) => (
            <FlashList
              {...refreshProps}
              data={allExpenses}
              ItemSeparatorComponent={() => <View className="h-3" />}
              renderItem={({ item }) => (
                <ExpenseCard
                  expense={item}
                  groupId={selectedGroupId ?? -1}
                  isSelected={isLargeScreen && item.id.toString() === expenseId}
                  onSelect={() =>
                    item.id.toString() === expenseId
                      ? router.dismissTo(`/(tabs)/expenses/${item.id}`)
                      : open(`/(tabs)/expenses/${item.id}`)
                  }
                  onEdit={() => handleEdit(item)}
                  isNotConverted={isLeftUnconverted(item, groupData.data)}
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
        </PullToRefresh>
      )}
      {hasExpenses && !isLargeScreen && (
        <View className="absolute right-4 bottom-4">
          <Button
            testID="expense-add-button"
            size="icon"
            icon="plus"
            onPress={createExpense}
          />
        </View>
      )}
    </View>
  );
}
