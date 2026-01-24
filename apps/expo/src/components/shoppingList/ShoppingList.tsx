import type { ShoppingListInfiniteData } from "@flatsby/api";
import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemType } from "@flatsby/validators/shopping-list";
import { useMemo, useState } from "react";
import { RefreshControl, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { trpc } from "~/utils/api";
import { CategoryFilterPills, CategoryFilterSidebar } from "./CategoryFilter";
import ShoppingListItem from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import { groupShoppingList } from "./ShoppingListUtils";
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
  const queryClient = useQueryClient();
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

  const { data: categoryCountsData } = useQuery(
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
    refetch,
    isRefetching,
  } = useInfiniteQuery(
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
      {
        groupId,
        shoppingListId,
        limit: 20,
        categoryId: selectedCategory ?? undefined,
      },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
        placeholderData: keepPreviousData,
      },
    ),
  );

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

  // Transform data for FlashList
  const flashListData = useMemo((): ListItem[] => {
    const data: ListItem[] = [];

    // Add unchecked sections
    uncheckedSections.forEach((section) => {
      data.push({
        type: "header",
        title: section.title,
        id: `unchecked-header-${section.title}`,
      });
      section.items.forEach((item) => {
        data.push({ type: "item", item, id: `unchecked-item-${item.id}` });
      });
    });

    // Add checked sections
    if (checkedSections.length > 0) {
      data.push({
        type: "header",
        title: "Purchased Items",
        id: "purchased-items-header",
      });

      checkedSections.forEach((section, index) => {
        data.push({
          type: "header",
          title: section.title,
          id: `checked-header-${index}-${section.title}`,
        });
        section.items.forEach((item) => {
          data.push({ type: "item", item, id: `checked-item-${item.id}` });
        });
      });
    }

    // Add loading indicator
    if (isFetchingNextPage) {
      data.push({ type: "loading", id: "loading-indicator" });
    }

    // Add end of list message or empty state
    if (allItems.length === 0) {
      data.push({ type: "empty", id: "empty-state" });
    } else if (!hasNextPage) {
      data.push({ type: "end", id: "end-of-list" });
    }

    return data;
  }, [
    uncheckedSections,
    checkedSections,
    isFetchingNextPage,
    hasNextPage,
    allItems.length,
  ]);

  const onMutateShoppingListItemError = (
    previousItems: ShoppingListInfiniteData | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: 20,
        categoryId: selectedCategory ?? undefined,
      }),
      previousItems,
    );
  };

  const createShoppingListItemMutation = useMutation(
    trpc.shoppingList.createShoppingListItem.mutationOptions({
      onMutate: async ({ name, categoryId }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
            groupId,
            shoppingListId,
            limit: 20,
            categoryId: selectedCategory ?? undefined,
          }),
        );

        const previousItems = queryClient.getQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
            categoryId: selectedCategory ?? undefined,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
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
      onError: (err, variables, context) => {
        onMutateShoppingListItemError(context?.previousItems);
      },
      onSuccess: (data, variables, context) => {
        if (data.success === false) {
          onMutateShoppingListItemError(context.previousItems);
          return;
        }

        invalidateAll();
      },
    }),
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
              Loading more items...
            </Text>
          </View>
        );

      case "empty":
        return (
          <View className="px-4 py-8">
            <Text className="text-muted-foreground text-center">
              No items in this shopping list yet. Add your first item below!
            </Text>
          </View>
        );

      case "end":
        return (
          <View className="py-4">
            <Text className="text-muted-foreground text-center text-sm">
              No more items to load
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
          <Text className="text-foreground text-center text-xl font-semibold">
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

            <FlashList
              data={flashListData}
              renderItem={renderItem}
              getItemType={getItemType}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              keyboardDismissMode="on-drag"
            />
            <AppKeyboardStickyView>
              <ShoppingListItemAddForm onSubmit={handleSubmit} />
            </AppKeyboardStickyView>
          </View>
        </View>
      </BottomSheetPickerProvider>
    </>
  );
};

export default ShoppingList;
