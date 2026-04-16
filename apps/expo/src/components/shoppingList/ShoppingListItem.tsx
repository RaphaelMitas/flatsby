import type { ShoppingListInfiniteData } from "@flatsby/api";
import type { CategoryId } from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemType } from "@flatsby/validators/shopping-list";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";
import { ShoppingItemDisplay } from "./ShoppingItemDisplay";
import { getCategoryData } from "./ShoppingListCategory";
import { useUpdateShoppingListItemMutation } from "./ShoppingListUtils";
import { useInvalidateShoppingList } from "./useInvalidateShoppingList";

export interface ShoppingListItemProps {
  groupId: number;
  shoppingListId: number;
  item: ShoppingListItemType;
  groupMembers: {
    id: number;
    user: {
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
  selectedCategory: CategoryId | null;
}

const ShoppingListItem = ({
  groupId,
  shoppingListId,
  item,
  groupMembers,
  selectedCategory,
}: ShoppingListItemProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const categoryData = getCategoryData({ categoryId: item.categoryId });

  const { invalidateAll } = useInvalidateShoppingList({
    groupId,
    shoppingListId,
  });

  const updateShoppingListItemMutation = useUpdateShoppingListItemMutation({
    groupId,
    shoppingListId,
    selectedCategory,
  });

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

  const deleteShoppingListItemMutation = useMutation(
    trpc.shoppingList.deleteShoppingListItem.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingListItems.queryOptions({
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

            const updatedPages = old.pages.map((page) => {
              if (page.success === false) {
                return page;
              }
              return {
                ...page,
                data: {
                  ...page.data,
                  items: page.data.items.filter((item) => item.id !== id),
                },
              };
            });

            return {
              ...old,
              pages: updatedPages,
            };
          },
        );
        return { previousItems };
      },
      onError: (err, variables, context) => {
        onMutateShoppingListItemError(context?.previousItems);
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onMutateShoppingListItemError(context.previousItems);
          return;
        }

        invalidateAll();
      },
    }),
  );

  const createdByMember = groupMembers.find(
    (m) => m.id === item.createdByGroupMemberId,
  );
  const completedByMember = groupMembers.find(
    (m) => m.id === item.completedByGroupMemberId,
  );

  const handleCheckboxToggle = () => {
    updateShoppingListItemMutation.mutate({
      ...item,
      completed: !item.completed,
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: "/shoppingList/edit-item",
      params: {
        itemId: item.id.toString(),
        name: item.name,
        categoryId: item.categoryId,
        completed: item.completed.toString(),
      },
    });
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteShoppingListItemMutation.mutate({ id: item.id });
  };

  const { renderLeftActions, renderRightActions } = useSwipeActions({
    leftAction: {
      text: "Edit",
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: "Delete",
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

  const swipeableRef = useRef<SwipeableMethods>(null);

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!item.isPending}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.RIGHT) {
            swipeableRef.current?.close();
            handleEdit();
          } else {
            swipeableRef.current?.close();
            setShowDeleteModal(true);
          }
        }}
      >
        <Pressable
          disabled={item.isPending}
          onPress={() => setShowDetails(true)}
        >
          <ShoppingItemDisplay
            name={item.name}
            completed={item.completed}
            categoryId={item.categoryId}
            onCheckedChange={handleCheckboxToggle}
            disabled={item.isPending}
          />
        </Pressable>
      </ReanimatedSwipeable>

      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowDetails(false)}
        >
          <View className="bg-background mx-4 w-full max-w-sm rounded-lg p-6 shadow-lg">
            <View className="flex-row justify-between gap-4">
              <View className="flex-1">
                <Text className="text-foreground text-sm font-medium">
                  {item.name}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {item.completed
                    ? `Done by ${completedByMember?.user.name ?? "unknown"} · ${
                        item.completedAt?.toLocaleDateString() ?? ""
                      }`
                    : `Added by ${createdByMember?.user.name ?? "unknown"} · ${item.createdAt.toLocaleDateString()}`}
                </Text>
              </View>

              <View className="items-center justify-center">
                <Text className={cn("text-xs font-medium", categoryData.color)}>
                  {categoryData.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-muted mt-4 rounded p-3"
              onPress={() => setShowDetails(false)}
            >
              <Text className="text-muted-foreground text-center text-sm">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={item.name}
        title="Delete Item"
        description={`Are you sure you want to delete "${item.name}"?`}
        needsConfirmationInput={false}
      />
    </>
  );
};

export default ShoppingListItem;
