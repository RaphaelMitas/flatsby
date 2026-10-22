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
import { useLocale, useTranslations } from "use-intl";

import { removeShoppingListItemFromCache } from "@flatsby/api/shoppingListItemsCache";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions, useSwipePressGuard } from "../SwipeActions";
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
  const t = useTranslations();
  const locale = useLocale();
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

  const itemsQueryKey = trpc.shoppingList.getShoppingListItems.infiniteQueryKey(
    {
      groupId,
      shoppingListId,
      limit: PAGE_SIZE.shoppingListItems,
      categoryId: selectedCategory ?? undefined,
    },
  );

  const deleteShoppingListItemMutation = useMutation(
    trpc.shoppingList.deleteShoppingListItem.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: itemsQueryKey });
        const previousItems = queryClient.getQueryData(itemsQueryKey);
        queryClient.setQueryData(itemsQueryKey, (old) =>
          removeShoppingListItemFromCache(old, id),
        );
        return { queryKey: itemsQueryKey, previousItems };
      },
      onError: (_err, _variables, context) => {
        if (context) {
          queryClient.setQueryData(context.queryKey, context.previousItems);
        }
      },
      onSuccess: (data, _variables, context) => {
        if (!data.success) {
          queryClient.setQueryData(context.queryKey, context.previousItems);
        }
      },
      onSettled: () => {
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

  const { onSwipeableOpenStartDrag, pressHandlers } = useSwipePressGuard();
  const { renderLeftActions, renderRightActions } = useSwipeActions({
    leftAction: {
      text: t("common.edit"),
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: t("common.delete"),
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
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpenStartDrag={onSwipeableOpenStartDrag}
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
          accessible={e2eAccessibilityOverride()}
          disabled={item.isPending}
          {...pressHandlers(() => setShowDetails(true))}
        >
          <ShoppingItemDisplay
            name={item.name}
            completed={item.completed}
            categoryId={item.categoryId}
            onCheckedChange={handleCheckboxToggle}
            disabled={item.isPending}
            checkboxTestID={`shopping-list-item-checkbox-${item.name}`}
            testID={`shopping-list-item-${item.name}`}
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
                    ? t("shoppingList.item.doneBy", {
                        name:
                          completedByMember?.user.name ??
                          t("shoppingList.item.unknownMember"),
                        date:
                          item.completedAt?.toLocaleDateString(locale) ?? "",
                      })
                    : t("shoppingList.item.addedBy", {
                        name:
                          createdByMember?.user.name ??
                          t("shoppingList.item.unknownMember"),
                        date: item.createdAt.toLocaleDateString(locale),
                      })}
                </Text>
              </View>

              <View className="items-center justify-center">
                <Text className={cn("text-xs font-medium", categoryData.color)}>
                  {t(categoryData.name)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-muted mt-4 rounded p-3"
              onPress={() => setShowDetails(false)}
            >
              <Text className="text-muted-foreground text-center text-sm">
                {t("common.close")}
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
        title={t("shoppingList.item.deleteTitle")}
        description={t("shoppingList.item.deleteDescription", {
          name: item.name,
        })}
      />
    </>
  );
};

export default ShoppingListItem;
