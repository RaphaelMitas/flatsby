import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemType } from "@flatsby/validators/shopping-list";
import type { FlashListRef } from "@shopify/flash-list";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { resultMutation } from "@flatsby/api/resultMutation";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { trpc } from "~/utils/api";
import { CategoryFilterPills } from "./CategoryFilter/CategoryFilterPills";
import { CategoryFilterSidebar } from "./CategoryFilter/CategoryFilterSidebar";
import ShoppingListItem from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import {
  groupShoppingList,
  shoppingListItemsOptions,
} from "./ShoppingListUtils";
import { useInvalidateShoppingList } from "./useInvalidateShoppingList";

interface ShoppingListProps {
  groupId: number;
  shoppingListId: number;
}

type ListItem =
  | { type: "header"; title: string; id: string }
  | { type: "item"; item: ShoppingListItemType; id: string }
  | { type: "loading"; id: string }
  | { type: "empty"; id: string }
  | { type: "end"; id: string };

const ShoppingList = ({ groupId, shoppingListId }: ShoppingListProps) => {
  const t = useTranslations("shoppingList");
  const queryClient = useQueryClient();
  const listRef = useRef<FlashListRef<ListItem>>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(
    null,
  );
  const { invalidateAll } = useInvalidateShoppingList({
    groupId,
    shoppingListId,
  });

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({ groupId, shoppingListId }),
  );

  const {
    data: categoryCountsData,
    refetch: refetchCategoryCounts,
    isRefetching: isRefetchingCategoryCounts,
  } = useQuery(
    trpc.shoppingList.getCategoryCounts.queryOptions({
      groupId,
      shoppingListId,
    }),
  );

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchItems,
    isRefetching: isRefetchingItems,
  } = useInfiniteQuery({
    ...shoppingListItemsOptions(
      groupId,
      shoppingListId,
      selectedCategory ?? undefined,
    ),
    placeholderData: keepPreviousData,
  });

  const handleRefresh = useCallback(
    () => Promise.all([refetchItems(), refetchCategoryCounts()]),
    [refetchItems, refetchCategoryCounts],
  );

  const isRefreshing = isRefetchingItems || isRefetchingCategoryCounts;

  const { shoppingList, currentMember } =
    shoppingListData.success === true
      ? shoppingListData.data
      : { shoppingList: null, currentMember: null };
  const allItems =
    itemsData?.pages
      .flatMap((page) => (page.success === true ? page.data.items : []))
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      ) ?? [];

  const { uncheckedSections, checkedSections } = groupShoppingList(allItems);

  const categoryCounts =
    categoryCountsData?.success === true ? categoryCountsData.data.counts : {};
  const categoryTotal =
    categoryCountsData?.success === true
      ? categoryCountsData.data.total
      : undefined;

  // Item ids carry no checked/unchecked prefix, so ticking a row reorders it
  // instead of remounting it and killing the tick animation.
  const flashListData = useMemo((): ListItem[] => {
    const data: ListItem[] = [];

    uncheckedSections.forEach((section) => {
      data.push({
        type: "header",
        title: t(`sections.${section.key}`),
        id: `unchecked-header-${section.key}`,
      });
      section.items.forEach((item) => {
        data.push({ type: "item", item, id: `item-${item.id}` });
      });
    });

    if (checkedSections.length > 0) {
      data.push({
        type: "header",
        title: t("purchasedItems"),
        id: "purchased-items-header",
      });

      checkedSections.forEach((section, index) => {
        data.push({
          type: "header",
          title: t(`sections.${section.key}`),
          id: `checked-header-${index}-${section.key}`,
        });
        section.items.forEach((item) => {
          data.push({ type: "item", item, id: `item-${item.id}` });
        });
      });
    }

    if (isFetchingNextPage) {
      data.push({ type: "loading", id: "loading-indicator" });
    }

    if (allItems.length === 0) {
      data.push({ type: "empty", id: "empty-state" });
    } else if (!hasNextPage) {
      data.push({ type: "end", id: "end-of-list" });
    }

    return data;
  }, [
    t,
    uncheckedSections,
    checkedSections,
    isFetchingNextPage,
    hasNextPage,
    allItems.length,
  ]);

  const createShoppingListItemMutation = useMutation(
    trpc.shoppingList.createShoppingListItem.mutationOptions(
      resultMutation({
        onMutate: async ({ name, categoryId }) => {
          await queryClient.cancelQueries({
            queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
              groupId,
              shoppingListId,
              limit: PAGE_SIZE.shoppingListItems,
              categoryId: selectedCategory ?? undefined,
            }),
          });

          const previousItems = queryClient.getQueryData(
            trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
              groupId,
              shoppingListId,
              limit: PAGE_SIZE.shoppingListItems,
              categoryId: selectedCategory ?? undefined,
            }),
          );

          queryClient.setQueryData(
            trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
              groupId,
              shoppingListId,
              limit: PAGE_SIZE.shoppingListItems,
              categoryId: selectedCategory ?? undefined,
            }),
            (old) => {
              if (!old) return old;

              const updatedPages = old.pages.map((page, index) => {
                if (page.success === false) return page;

                const newItem = {
                  id: Date.now(),
                  name,
                  categoryId,
                  createdAt: new Date(),
                  completed: false,
                  createdByGroupMemberId: currentMember?.id ?? null,
                  completedByGroupMemberId: null,
                  completedAt: null,
                  createdByGroupMember: currentMember,
                  completedByGroupMember: null,
                  isPending: true,
                };

                return {
                  ...page,
                  data: {
                    ...page.data,
                    items:
                      index === 0
                        ? [newItem, ...page.data.items]
                        : page.data.items,
                  },
                };
              });

              return { ...old, pages: updatedPages };
            },
          );
          return { previousItems };
        },
        rollback: ({ previousItems }) =>
          queryClient.setQueryData(
            trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
              groupId,
              shoppingListId,
              limit: PAGE_SIZE.shoppingListItems,
              categoryId: selectedCategory ?? undefined,
            }),
            previousItems,
          ),
        onSuccess: () => invalidateAll(),
      }),
    ),
  );

  const handleSubmit = (values: {
    name: string;
    categoryId: CategoryIdWithAiAutoSelect;
  }) => {
    createShoppingListItemMutation.mutate({
      name: values.name,
      categoryId: values.categoryId,
      groupId,
      shoppingListId,
    });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case "header":
        return (
          <View className="mt-6 mb-3 px-4">
            <Text className="text-muted-foreground text-center text-sm">
              {item.title}
            </Text>
          </View>
        );

      case "item": {
        return (
          <View className="mb-2 px-4">
            <ShoppingListItem
              groupId={groupId}
              shoppingListId={shoppingListId}
              item={item.item}
              groupMembers={shoppingList?.group.groupMembers ?? []}
              selectedCategory={selectedCategory}
            />
          </View>
        );
      }

      case "loading":
        return (
          <View className="py-4">
            <Text className="text-muted-foreground text-center">
              {t("loadingMoreItems")}
            </Text>
          </View>
        );

      case "empty":
        return (
          <View className="px-4 py-8">
            <Text className="text-muted-foreground text-center">
              {t("emptyList")}
            </Text>
          </View>
        );

      case "end":
        return (
          <View className="py-4">
            <Text className="text-muted-foreground text-center text-sm">
              {t("noMoreItems")}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const getItemType = (item: ListItem) => {
    return item.type;
  };

  return (
    <>
      {shoppingList && (
        <View className="p-4">
          <Text
            testID="shopping-list-title"
            className="text-foreground text-center text-xl font-semibold"
          >
            {shoppingList.name}
          </Text>
        </View>
      )}
      <BottomSheetPickerProvider>
        <View className="flex-1 flex-col md:flex-row">
          {/* Sidebar - hidden on mobile, shown on md+ */}
          <View className="hidden md:flex">
            <CategoryFilterSidebar
              counts={categoryCounts}
              total={categoryTotal}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </View>

          <View className="flex-1">
            {/* Pills - shown on mobile, hidden on md+ */}
            <View className="flex md:hidden">
              <CategoryFilterPills
                counts={categoryCounts}
                total={categoryTotal}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            </View>

            <PullToRefresh refreshing={isRefreshing} onRefresh={handleRefresh}>
              {(refreshProps) => (
                <FlashList
                  {...refreshProps}
                  ref={(list) => {
                    listRef.current = list;
                    refreshProps.ref?.(list);
                  }}
                  // Keeping the old top row in place would push a freshly added item above the viewport.
                  maintainVisibleContentPosition={{ disabled: true }}
                  className="flex-1"
                  data={flashListData}
                  renderItem={renderItem}
                  getItemType={getItemType}
                  keyExtractor={(item) => item.id}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.5}
                  keyboardDismissMode="on-drag"
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </PullToRefresh>
            <AppKeyboardStickyView>
              <ShoppingListItemAddForm
                onSubmit={handleSubmit}
                groupId={groupId}
              />
            </AppKeyboardStickyView>
          </View>
        </View>
      </BottomSheetPickerProvider>
    </>
  );
};

export default ShoppingList;
