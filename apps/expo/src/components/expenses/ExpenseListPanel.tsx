import type { ExpenseWithSplitsAndMembers } from "@flatsby/api";
import type { Href } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { isLeftUnconverted } from "@flatsby/validators/expenses/conversion";
import { withMonthHeaders } from "@flatsby/validators/expenses/formatting";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { SafeAreaView } from "~/lib/ui/safe-area";
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
  const locale = useLocale();
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

  if (!groupData.success) {
    return null;
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
        <PullToRefresh onRefresh={refetch} parentPaddingX={16}>
          {(refreshProps) => (
            <FlashList
              {...refreshProps}
              data={withMonthHeaders(allExpenses, locale)}
              keyExtractor={(item) => item.key}
              getItemType={(item) => item.type}
              renderItem={({ item }) =>
                item.type === "month" ? (
                  <Text className="text-muted-foreground px-1 pt-4 pb-2 text-sm font-semibold">
                    {item.label}
                  </Text>
                ) : (
                  <ExpenseCard
                    expense={item.expense}
                    groupId={selectedGroupId ?? -1}
                    meId={groupData.data.thisGroupMember.id}
                    first={item.first}
                    last={item.last}
                    isSelected={
                      isLargeScreen && item.expense.id.toString() === expenseId
                    }
                    onSelect={() =>
                      item.expense.id.toString() === expenseId
                        ? router.dismissTo(
                            `/(tabs)/expenses/${item.expense.id}`,
                          )
                        : open(`/(tabs)/expenses/${item.expense.id}`)
                    }
                    onEdit={() => handleEdit(item.expense)}
                    isNotConverted={isLeftUnconverted(
                      item.expense,
                      groupData.data,
                    )}
                  />
                )
              }
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
