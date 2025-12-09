import type { ShoppingListInfiniteData } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ShoppingListItem as ShoppingListItemType } from "./ShoppingListUtils";
import { Checkbox } from "~/lib/ui/checkbox";
import { trpc } from "~/utils/api";
import { useSwipeActions } from "../SwipeActions";
import { getCategoryData } from "./ShoppingListCategory";
import { useUpdateShoppingListItemMutation } from "./ShoppingListUtils";

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
}

const ShoppingListItem = ({
  groupId,
  shoppingListId,
  item,
  groupMembers,
}: ShoppingListItemProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const categoryData = getCategoryData(item.categoryId);

  const updateShoppingListItemMutation = useUpdateShoppingListItemMutation({
    groupId,
    shoppingListId,
  });

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

  const deleteShoppingListItemMutation = useMutation(
    trpc.shoppingList.deleteShoppingListItem.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingListItems.queryOptions({
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
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteShoppingListItemMutation.mutate({ id: item.id }),
        },
      ],
    );
  };

  const { renderLeftActions, renderRightActions } = useSwipeActions({
    leftAction: {
      text: "Edit",
      backgroundColor: "info",
      textColor: "info-foreground",
    },
    rightAction: {
      text: "Delete",
      backgroundColor: "destructive",
      textColor: "destructive-foreground",
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (direction === "right") {
            swipeableRef.current?.close();
            handleEdit();
          } else {
            // Show delete action briefly, then close and open modal
            setTimeout(() => {
              swipeableRef.current?.close();
              handleDelete();
            }, 300); // Brief delay to show the red delete action
          }
        }}
      >
        <TouchableOpacity
          disabled={item.isPending}
          onPress={() => setShowDetails(true)}
          className={"flex-row items-center rounded-lg bg-muted"}
          style={{
            opacity: item.isPending ? 0.7 : 1,
          }}
        >
          <Checkbox
            checked={item.completed}
            onCheckedChange={handleCheckboxToggle}
            disabled={item.isPending}
          />

          <View className="flex-1 flex-row justify-between gap-2">
            <View className="flex-1">
              <Text
                className={`text-sm font-medium ${
                  item.completed
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {item.name}
              </Text>
            </View>
            <View className="flex-row items-center justify-center gap-2 px-4">
              {categoryData.icon}
              <Text className={`text-xs font-medium ${categoryData.color}`}>
                {categoryData.name}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
          <View className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <View className="flex-row justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {item.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {item.completed
                    ? `Done by ${completedByMember?.user.name ?? "unknown"} · ${
                        item.completedAt?.toLocaleDateString() ?? ""
                      }`
                    : `Added by ${createdByMember?.user.name ?? "unknown"} · ${item.createdAt.toLocaleDateString()}`}
                </Text>
              </View>

              <View className="items-center justify-center">
                <Text className={`text-xs font-medium ${categoryData.color}`}>
                  {categoryData.name}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="mt-4 rounded bg-muted p-3"
              onPress={() => setShowDetails(false)}
            >
              <Text className="text-center text-sm text-muted-foreground">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default ShoppingListItem;
