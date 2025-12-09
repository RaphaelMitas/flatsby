import type { ShoppingListInfiniteData } from "@flatsby/api";
import { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { CategoryIdWithAiAutoSelect } from "./ShoppingListCategory";
import type { ShoppingListItem as ShoppingListItemType } from "./ShoppingListUtils";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { trpc } from "~/utils/api";
import ShoppingListItem from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import { groupShoppingList } from "./ShoppingListUtils";

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === "ios") {
      return;
    }

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({ groupId, shoppingListId }),
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
      { groupId, shoppingListId, limit: 20 },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
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
          }),
        );

        const previousItems = queryClient.getQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
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

        void queryClient.invalidateQueries({
          queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        });
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
          <View className="mb-3 mt-6 px-4">
            <Text className="text-center text-sm text-muted-foreground">
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
            />
          </View>
        );
      }

      case "loading":
        return (
          <View className="py-4">
            <Text className="text-center text-muted-foreground">
              Loading more items...
            </Text>
          </View>
        );

      case "empty":
        return (
          <View className="px-4 py-8">
            <Text className="text-center text-muted-foreground">
              No items in this shopping list yet. Add your first item below!
            </Text>
          </View>
        );

      case "end":
        return (
          <View className="py-4">
            <Text className="text-center text-sm text-muted-foreground">
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
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        marginBottom: Platform.OS === "ios" ? undefined : keyboardHeight,
      }}
    >
      {shoppingList && (
        <View className="p-4">
          <Text className="text-center text-xl font-semibold text-foreground">
            {shoppingList.name}
          </Text>
        </View>
      )}
      <BottomSheetPickerProvider>
        <View className="flex-1 bg-background">
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
            estimatedItemSize={60}
          />
          <ShoppingListItemAddForm onSubmit={handleSubmit} />
        </View>
      </BottomSheetPickerProvider>
    </KeyboardAvoidingView>
  );
};

export default ShoppingList;
