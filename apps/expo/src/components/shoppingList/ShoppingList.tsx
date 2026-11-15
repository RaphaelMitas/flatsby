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
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { useRefreshControl } from "~/lib/components/pull-to-refresh";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { shoppingListMutations, trpc } from "~/utils/api";
import { holdWhileMutating, useLivePolling } from "~/utils/live-query";
import { CategoryFilterPills } from "./CategoryFilter/CategoryFilterPills";
import { CategoryFilterSidebar } from "./CategoryFilter/CategoryFilterSidebar";
import ShoppingListItem from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import {
  groupShoppingList,
  shoppingListItemsOptions,
} from "./ShoppingListUtils";

interface ShoppingListProps {
  groupId: number;
  shoppingListId: number;
}

type ListItem =
  | { type: "header"; title: string; id: string }
  | { type: "item"; item: ShoppingListItemType; id: string }
  | { type: "loading"; id: string }
  | { type: "empty"; id: string };

const ShoppingList = ({ groupId, shoppingListId }: ShoppingListProps) => {
  const t = useTranslations("shoppingList");
  const listRef = useRef<FlashListRef<ListItem>>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(
    null,
  );

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({ groupId, shoppingListId }),
  );

  const poll = useLivePolling(
    trpc.shoppingList.pathKey(),
    shoppingListData.success,
  );

  const { data: categoryCountsData, refetch: refetchCategoryCounts } = useQuery(
    {
      ...trpc.shoppingList.getCategoryCounts.queryOptions({
        groupId,
        shoppingListId,
      }),
      staleTime: holdWhileMutating(trpc.shoppingList.pathKey()),
      refetchInterval: poll(30_000),
    },
  );

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchItems,
  } = useInfiniteQuery({
    ...shoppingListItemsOptions(
      groupId,
      shoppingListId,
      selectedCategory ?? undefined,
    ),
    placeholderData: keepPreviousData,
    refetchInterval: poll(5_000),
  });

  const handleRefresh = useCallback(
    () => Promise.all([refetchItems(), refetchCategoryCounts()]),
    [refetchItems, refetchCategoryCounts],
  );
  const refreshControl = useRefreshControl(handleRefresh);

  const shoppingList =
    shoppingListData.success === true
      ? shoppingListData.data.shoppingList
      : null;
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
    }

    return data;
  }, [
    t,
    uncheckedSections,
    checkedSections,
    isFetchingNextPage,
    allItems.length,
  ]);

  const createShoppingListItemMutation = useMutation(
    shoppingListMutations.create,
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
          <View className="mt-6 mb-2 px-5">
            <Text className="text-muted-foreground text-sm font-medium">
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

      default:
        return null;
    }
  };

  const getItemType = (item: ListItem) => {
    return item.type;
  };

  return (
    <BottomSheetPickerProvider>
      <View className="flex-1 flex-col md:flex-row">
        <View className="hidden md:flex">
          <CategoryFilterSidebar
            counts={categoryCounts}
            total={categoryTotal}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>

        <View className="flex-1">
          <View className="flex md:hidden">
            <CategoryFilterPills
              counts={categoryCounts}
              total={categoryTotal}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </View>

          <FlashList
            ref={listRef}
            refreshControl={refreshControl}
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
          <AppKeyboardStickyView>
            <ShoppingListItemAddForm
              onSubmit={handleSubmit}
              groupId={groupId}
            />
          </AppKeyboardStickyView>
        </View>
      </View>
    </BottomSheetPickerProvider>
  );
};

export default ShoppingList;
