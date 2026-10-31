import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { ExpenseListFilter } from "@flatsby/validators/expenses/list-filter";
import type { Href } from "expo-router";
import { Suspense, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import {
  keepPreviousData,
  useInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  expenseSearchView,
  useExpenseFilters,
} from "@flatsby/api/hooks/useExpenseFilters";
import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useMediaQuery } from "../splitview/useMediaQuery";
import { ExpenseCard } from "./ExpenseCard";
import { ExpenseFilterBar } from "./ExpenseFilterBar";

const FILTERED_GC_TIME = 5 * 60 * 1000;

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
  const open = (href: Href) =>
    inPane ? router.replace(href) : router.push(href);
  // dismissTo returns to a named screen that is already open, keeping its draft
  const openScreen = (href: Href) =>
    inPane ? router.dismissTo(href) : router.push(href);
  const createExpense = () => openScreen("/(tabs)/expenses/create");

  const groupId = selectedGroupId ?? -1;
  const [searchFocused, setSearchFocused] = useState(false);
  const filters = useExpenseFilters(groupId);

  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const listOptions = (filter: ExpenseListFilter) =>
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId, limit: PAGE_SIZE.expenses, ...filter },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    );
  const base = useInfiniteQuery(listOptions({}));
  const filtered = useInfiniteQuery({
    ...listOptions(filters.query),
    enabled: filters.isQueryActive,
    placeholderData: keepPreviousData,
    // Keeps every search term out of the week-long persisted cache
    gcTime: FILTERED_GC_TIME,
  });
  const search = expenseSearchView(base, filtered, filters);

  if (!groupData.success) {
    return null;
  }

  const hasExpenses = search.rows.length > 0;
  const showFilters = hasExpenses || filters.isActive;

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
      {!searchFocused && (
        <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
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
      )}

      {showFilters && (
        <ExpenseFilterBar
          groupId={groupId}
          filters={filters}
          members={groupData.data.groupMembers}
          meId={groupData.data.thisGroupMember.id}
          onFocusChange={setSearchFocused}
        />
      )}
      {(search.offline || search.failed) && (
        <View className="bg-muted mb-2 rounded-lg px-3 py-2">
          <Text className="text-muted-foreground text-sm">
            {t(
              search.offline
                ? "expenses.filter.offline"
                : "expenses.filter.loadFailed",
            )}
          </Text>
        </View>
      )}

      {!hasExpenses && search.searching ? (
        <View className="flex-1 items-center justify-center gap-3 pb-16">
          <ActivityIndicator />
          <Text className="text-muted-foreground text-sm">
            {t("expenses.filter.searchingOlder")}
          </Text>
        </View>
      ) : !hasExpenses && filters.isActive ? (
        <View
          testID="expense-search-empty"
          className="flex-1 items-center justify-center gap-3 px-6 pb-16"
        >
          <Icon name="search" size={48} color="muted-foreground" />
          <Text className="text-foreground text-lg font-semibold">
            {t("expenses.filter.noResultsTitle")}
          </Text>
          <Text className="text-muted-foreground text-center text-sm">
            {t("expenses.filter.noResultsHint")}
          </Text>
          <Button
            testID="expense-search-reset"
            title={t("expenses.filter.reset")}
            variant="outline"
            onPress={filters.reset}
          />
        </View>
      ) : !hasExpenses ? (
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
        <PullToRefresh onRefresh={search.refetch} parentPaddingX={16}>
          {(refreshProps) => (
            <FlashList
              {...refreshProps}
              data={search.rows}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
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
              onEndReached={search.loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                search.isFetchingMore ? (
                  <View className="py-4">
                    <ActivityIndicator size="small" />
                  </View>
                ) : search.searching ? (
                  <View className="flex-row items-center justify-center gap-2 py-4">
                    <ActivityIndicator size="small" />
                    <Text className="text-muted-foreground text-sm">
                      {t("expenses.filter.loadingOlder")}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </PullToRefresh>
      )}
      {hasExpenses && !isLargeScreen && !searchFocused && (
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
