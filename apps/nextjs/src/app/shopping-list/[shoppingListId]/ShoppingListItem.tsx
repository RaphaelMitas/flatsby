"use client";

import { useState } from "react";

import "react-swipeable-list/dist/styles.css";

import type { ShoppingListInfiniteData } from "@flatsby/api";
import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash } from "lucide-react";
import {
  LeadingActions,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from "react-swipeable-list";

import { cn } from "@flatsby/ui";
import { getCategoryData } from "@flatsby/ui/categories";
import { Checkbox } from "@flatsby/ui/checkbox";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@flatsby/ui/popover";

import { useTRPC } from "~/trpc/react";
import { ShoppingListItemEditForm } from "./ShoppingListItemEditForm";

export interface ShoppingListItemProps {
  groupId: number;
  shoppingListId: number;
  item: ShoppingListItem;
  groupMembers: {
    id: number;
    user: {
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
}

interface OptimisticShoppingListItemProps {
  id: number;
  name: string;
  completed: boolean;
  categoryId: CategoryIdWithAiAutoSelect | null;
  showCheckbox?: boolean;
  showActions?: boolean;
}

export const OptimisticShoppingListItem = ({
  id,
  name,
  completed,
  categoryId,
  showCheckbox = true,
  showActions = true,
}: OptimisticShoppingListItemProps) => {
  const categoryData = categoryId ? getCategoryData(categoryId) : undefined;

  return (
    <div
      id={`list-item-${id}`}
      key={id}
      className="bg-muted flex w-full items-center rounded-lg pr-4"
    >
      {showCheckbox && (
        <div className="-m-2 flex cursor-pointer items-center justify-center p-6">
          <Checkbox checked={completed} disabled={true} />
        </div>
      )}
      <div
        className={cn("flex flex-1 justify-between gap-2 truncate p-3", {
          "pl-0": showCheckbox,
          "pr-0 pl-4": !showCheckbox,
        })}
      >
        <div
          className={cn(
            "flex-1 truncate text-left text-sm font-medium",
            completed && "text-muted-foreground line-through",
          )}
        >
          {name}
        </div>
        {categoryData && (
          <div
            className={cn(
              "line-clamp-2 flex items-center gap-2 text-xs",
              categoryData.colorClasses.base,
            )}
          >
            <categoryData.icon size={20} />
            <span>{categoryData.name}</span>
          </div>
        )}
      </div>
      {showActions && (
        <div className="ml-2 hidden gap-2 md:flex">
          <Pencil size={24} className="min-w-max opacity-50" />
          <Trash size={24} className="min-w-max opacity-50" />
        </div>
      )}
    </div>
  );
};

const ShoppingListItem = ({
  groupId,
  shoppingListId,
  item,
  groupMembers,
}: ShoppingListItemProps) => {
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const categoryData = getCategoryData(item.categoryId);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

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

  const updateShoppingListItemMutation = useMutation(
    trpc.shoppingList.updateShoppingListItem.mutationOptions({
      onMutate: async ({ id, categoryId, name, completed }) => {
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
                  items: page.data.items.map((item) => {
                    if (item.id === id) {
                      return {
                        ...item,
                        name: name ? name : item.name,
                        categoryId: categoryId,
                        completed: completed ? completed : item.completed,
                        isPending: true,
                      };
                    }
                    return item;
                  }),
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
              if (page.success === false) return page;

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
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
          context?.previousItems,
        );
      },
      onSettled: () => {
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
          Edit
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
          Delete
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  return (
    <SwipeableList>
      <SwipeableListItem
        leadingActions={!showEditForm ? editActions() : null}
        trailingActions={!showEditForm ? deleteActions() : null}
      >
        <div
          id={`list-item-${item.id}`}
          key={item.id}
          className="group bg-muted md:hover:bg-primary hover:text-primary-foreground flex w-full items-center rounded-lg pr-4"
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
              <div
                className="-m-2 flex cursor-pointer items-center justify-center p-6"
                onClick={() => handleCheckboxChange(!item.completed)}
              >
                <Checkbox
                  checked={item.completed}
                  className="md:group-hover:bg-primary-foreground md:group-hover:text-primary"
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
                  {categoryData && (
                    <div
                      className={cn(
                        "line-clamp-2 flex items-center gap-2 text-xs",
                        categoryData.colorClasses.base,
                        categoryData.colorClasses.hover,
                      )}
                    >
                      <categoryData.icon size={20} />
                      <span>{categoryData.name}</span>
                    </div>
                  )}
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
                            ? `Done by ${completedByMember?.user.name ?? "unknown"} · ${item.completedAt?.toLocaleDateString() ?? ""}`
                            : `Added by ${createdByMember?.user.name ?? "unknown"} · ${item.createdAt.toLocaleDateString()}`}
                        </div>
                      </div>

                      {categoryData && (
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 text-xs text-nowrap",
                            categoryData.colorClasses.base,
                            categoryData.colorClasses.hover,
                          )}
                        >
                          <categoryData.icon size={20} />
                          <span>{categoryData.name}</span>
                        </div>
                      )}
                    </div>
                  </PopoverClose>
                </PopoverContent>
              </Popover>
              <div className="ml-2 hidden gap-2 md:flex">
                <Pencil
                  size={24}
                  className="md:group-hover:text-primary-foreground md:group-hover:hover:text-info min-w-max cursor-pointer"
                  onClick={() => setShowEditForm(true)}
                />
                <Trash
                  size={24}
                  className="md:group-hover:text-primary-foreground md:group-hover:hover:text-error min-w-max cursor-pointer"
                  onClick={handleDeleteItem}
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
