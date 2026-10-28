"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import "react-swipeable-list/dist/styles.css";

import type {
  CategoryId,
  CategoryIdWithAiAutoSelect,
} from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemData } from "@flatsby/validators/shopping-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash } from "lucide-react";
import {
  LeadingActions,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";

import { restoreSnapshot, resultMutation } from "@flatsby/api/resultMutation";
import {
  removeShoppingListItemFromCache,
  updateShoppingListItemInCache,
} from "@flatsby/api/shoppingListItemsCache";
import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { Checkbox } from "@flatsby/ui/checkbox";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@flatsby/ui/popover";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useTRPC } from "~/trpc/react";
import { ShoppingListItemEditForm } from "./ShoppingListItemEditForm";
import { useShoppingListInvalidation } from "./useShoppingListInvalidation";

export interface ShoppingListItemProps {
  groupId: number;
  shoppingListId: number;
  item: ShoppingListItemData;
  groupMembers: { id: number; user: { name: string } }[];
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
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const categoryData = getCategoryData(item.categoryId);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { invalidateAll } = useShoppingListInvalidation(
    groupId,
    shoppingListId,
  );

  const itemsQueryKey = trpc.shoppingList.getShoppingListItems.infiniteQueryKey(
    {
      groupId,
      shoppingListId,
      limit: PAGE_SIZE.shoppingListItems,
      categoryId: selectedCategory ?? undefined,
    },
  );

  const updateShoppingListItemMutation = useMutation(
    trpc.shoppingList.updateShoppingListItem.mutationOptions(
      resultMutation({
        onMutate: async (variables) => {
          await queryClient.cancelQueries({ queryKey: itemsQueryKey });
          const previousItems = queryClient.getQueryData(itemsQueryKey);
          queryClient.setQueryData(itemsQueryKey, (old) =>
            updateShoppingListItemInCache(old, variables),
          );
          return [{ queryKey: itemsQueryKey, previous: previousItems }];
        },
        rollback: restoreSnapshot(queryClient),
        onSettled: () => {
          invalidateAll();
        },
      }),
    ),
  );

  const deleteShoppingListItemMutation = useMutation(
    trpc.shoppingList.deleteShoppingListItem.mutationOptions(
      resultMutation({
        onMutate: async ({ id }) => {
          await queryClient.cancelQueries({ queryKey: itemsQueryKey });
          const previousItems = queryClient.getQueryData(itemsQueryKey);
          queryClient.setQueryData(itemsQueryKey, (old) =>
            removeShoppingListItemFromCache(old, id),
          );
          return [{ queryKey: itemsQueryKey, previous: previousItems }];
        },
        rollback: restoreSnapshot(queryClient),
        onSettled: () => {
          invalidateAll();
        },
      }),
    ),
  );

  const createdByMember = groupMembers.find(
    (m) => m.id === item.createdByGroupMemberId,
  );
  const completedByMember = groupMembers.find(
    (m) => m.id === item.completedByGroupMemberId,
  );

  const handleCheckboxChange = (completed: boolean) => {
    updateShoppingListItemMutation.mutate({
      ...item,
      completed,
    });
  };

  const handleEditItem = ({
    name,
    categoryId,
  }: {
    name: string;
    categoryId: CategoryIdWithAiAutoSelect;
  }) => {
    updateShoppingListItemMutation.mutate({
      ...item,
      name,
      categoryId,
    });
    setShowEditForm(false);
  };

  const editActions = () => (
    <LeadingActions>
      <SwipeAction onClick={() => setShowEditForm(true)}>
        <div className="bg-info text-info-foreground flex items-center rounded-lg p-4">
          {t("common.edit")}
        </div>
      </SwipeAction>
    </LeadingActions>
  );

  const handleDeleteItem = () => {
    deleteShoppingListItemMutation.mutate({
      id: item.id,
    });
  };

  const deleteActions = () => (
    <TrailingActions>
      <SwipeAction destructive={true} onClick={handleDeleteItem}>
        <div className="bg-error text-error-foreground flex items-center rounded-lg p-4">
          {t("common.delete")}
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  return (
    <SwipeableList>
      <SwipeableListItem
        leadingActions={!showEditForm && !item.isPending ? editActions() : null}
        trailingActions={
          !showEditForm && !item.isPending ? deleteActions() : null
        }
      >
        <div
          id={`list-item-${item.id}`}
          data-testid={`shopping-list-item-${item.id}`}
          key={item.id}
          className={cn(
            "group bg-muted flex w-full items-center rounded-lg pr-4",
            !item.isPending &&
              "md:hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {showEditForm ? (
            <ShoppingListItemEditForm
              initialValues={{
                name: item.name,
                categoryId: item.categoryId,
                completed: item.completed,
              }}
              onSubmit={handleEditItem}
              onCancel={() => setShowEditForm(false)}
            />
          ) : (
            <>
              <div className="-m-2 flex items-center justify-center p-6">
                <Checkbox
                  checked={item.completed}
                  disabled={item.isPending}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked === true)
                  }
                  // The ::before is the real 64px hit target, so pressing the
                  // padding still presses the control and animates it.
                  // Dimming while pending would land on top of that animation.
                  className="md:group-hover:bg-primary-foreground md:group-hover:text-primary cursor-pointer before:absolute before:-inset-y-6 before:-right-4 before:-left-6 before:content-[''] disabled:cursor-not-allowed disabled:opacity-100"
                />
              </div>
              <Popover>
                <PopoverTrigger className="flex flex-1 justify-between gap-2 truncate p-3 pl-0">
                  <div
                    className={cn(
                      "md:group-hover:text-primary-foreground flex-1 truncate text-left text-sm font-medium",
                      item.completed && "text-muted-foreground line-through",
                    )}
                  >
                    {item.name}
                  </div>
                  <div
                    className={cn(
                      "line-clamp-2 flex items-center gap-2 text-xs",
                      categoryData.colorClasses.base,
                      categoryData.colorClasses.hover,
                    )}
                  >
                    <categoryData.icon size={20} />
                    <span>{t(categoryData.name)}</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="mx-4 w-[calc(100vw-2rem)] max-w-prose sm:w-fit"
                >
                  <PopoverClose className="w-full">
                    <div className="flex justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-left text-sm font-medium">
                          {item.name}
                        </div>
                        <div className="text-muted-foreground line-clamp-2 flex gap-2 text-xs">
                          {item.completed
                            ? t("shoppingList.item.doneBy", {
                                name:
                                  completedByMember?.user.name ??
                                  t("shoppingList.item.unknownMember"),
                                date:
                                  item.completedAt?.toLocaleDateString(
                                    locale,
                                  ) ?? "",
                              })
                            : t("shoppingList.item.addedBy", {
                                name:
                                  createdByMember?.user.name ??
                                  t("shoppingList.item.unknownMember"),
                                date: item.createdAt.toLocaleDateString(locale),
                              })}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 text-xs text-nowrap",
                          categoryData.colorClasses.base,
                          categoryData.colorClasses.hover,
                        )}
                      >
                        <categoryData.icon size={20} />
                        <span>{t(categoryData.name)}</span>
                      </div>
                    </div>
                  </PopoverClose>
                </PopoverContent>
              </Popover>
              <div className="ml-2 hidden gap-2 md:flex">
                <Pencil
                  data-testid={
                    item.isPending
                      ? undefined
                      : `shopping-list-item-edit-${item.id}`
                  }
                  size={24}
                  className={cn(
                    "md:group-hover:text-primary-foreground md:group-hover:hover:text-info min-w-max",
                    item.isPending ? "opacity-50" : "cursor-pointer",
                  )}
                  onClick={
                    item.isPending ? undefined : () => setShowEditForm(true)
                  }
                />
                <Trash
                  data-testid={
                    item.isPending
                      ? undefined
                      : `shopping-list-item-delete-${item.id}`
                  }
                  size={24}
                  className={cn(
                    "md:group-hover:text-primary-foreground md:group-hover:hover:text-error min-w-max",
                    item.isPending ? "opacity-50" : "cursor-pointer",
                  )}
                  onClick={item.isPending ? undefined : handleDeleteItem}
                />
              </div>
            </>
          )}
        </div>
      </SwipeableListItem>
    </SwipeableList>
  );
};

export default ShoppingListItem;
