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
import { useLocale, useTranslations } from "use-intl";

import {
  expenseSearchView,
  useExpenseFilters,
} from "@flatsby/api/hooks/useExpenseFilters";
import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { withMonthHeaders } from "@flatsby/validators/expenses/formatting";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useRefreshControl } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { ErrorMessage } from "~/lib/ui/error-message";
import { Fab } from "~/lib/ui/fab";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { Skeleton } from "~/lib/ui/skeleton";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useMediaQuery } from "../splitview/useMediaQuery";
import { ExpenseCard } from "./ExpenseCard";
import { ExpenseDebtCard } from "./ExpenseDebtCard";
import { ExpenseFilterBar } from "./ExpenseFilterBar";
import { useInvalidateExpenses } from "./useInvalidateExpenses";

const UNPERSISTED_GC_TIME = 5 * 60 * 1000;

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
  const locale = useLocale();
  const { selectedGroupId } = useShoppingStore();
  const groupId = selectedGroupId ?? -1;
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
    gcTime: UNPERSISTED_GC_TIME,
  });
  const search = expenseSearchView(base, filtered, filters);
  const { invalidateDebtSummary } = useInvalidateExpenses(groupId);
  const refreshControl = useRefreshControl(() =>
    Promise.all([search.refetch(), invalidateDebtSummary()]),
  );

  if (!groupData.success) {
    return <ErrorMessage message={groupData.error.message} />;
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

  const debtCard = (
    <Suspense fallback={<Skeleton className="mb-2 h-24 rounded-lg" />}>
      <ExpenseDebtCard
        groupId={groupId}
        onPress={() => openScreen("/(tabs)/expenses/debts")}
      />
    </Suspense>
  );

  return (
    <View className="flex-1 px-4">
      {!searchFocused && (
        <View className="mb-6 flex-row flex-wrap items-center justify-between gap-2">
          <Text
            testID="expense-heading"
            className="text-foreground text-3xl font-bold"
          >
            {t("navigation.expenses")}
          </Text>
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
        <View className="flex-1">
          {debtCard}
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
        </View>
      ) : (
        <FlashList
          refreshControl={refreshControl}
          contentContainerClassName="pb-28"
          data={withMonthHeaders(search.rows, locale)}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          getItemType={(item) => item.type}
          ListHeaderComponent={filters.isActive ? null : debtCard}
          renderItem={({ item }) =>
            item.type === "month" ? (
              <Text
                accessibilityRole="header"
                className="text-muted-foreground px-1 pt-4 pb-2 text-sm font-semibold"
              >
                {item.label}
              </Text>
            ) : (
              <ExpenseCard
                expense={item.expense}
                groupId={groupId}
                meId={groupData.data.thisGroupMember.id}
                first={item.first}
                last={item.last}
                isSelected={
                  isLargeScreen && item.expense.id.toString() === expenseId
                }
                onSelect={() =>
                  item.expense.id.toString() === expenseId
                    ? router.dismissTo(`/(tabs)/expenses/${item.expense.id}`)
                    : open(`/(tabs)/expenses/${item.expense.id}`)
                }
                onEdit={() => handleEdit(item.expense)}
                isNotConverted={isLeftUnconverted(item.expense, groupData.data)}
              />
            )
          }
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
      {hasExpenses && !isLargeScreen && !searchFocused && (
        <Fab
          testID="expense-add-button"
          accessibilityLabel={t("expenses.addExpense")}
          onPress={createExpense}
        />
      )}
    </View>
  );
}
