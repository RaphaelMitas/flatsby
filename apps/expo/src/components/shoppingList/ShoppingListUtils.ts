import type { ShoppingListInfiniteData } from "@flatsby/api";
import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

interface GroupedSection {
  title: string;
  items: ShoppingListItem[];
}

interface GroupedShoppingList {
  uncheckedSections: GroupedSection[];
  checkedSections: GroupedSection[];
}

const splitItemsByCompletion = (items: ShoppingListItem[]) => {
  const splitIndex = items.findIndex(
    (item) => !item.isPending && item.completed,
  );
  return {
    uncheckedItems: splitIndex === -1 ? items : items.slice(0, splitIndex),
    checkedItems: splitIndex === -1 ? [] : items.slice(splitIndex),
  };
};

const groupItemsByDate = (
  items: ShoppingListItem[],
  dateField: "completedAt" | "createdAt",
): GroupedSection[] => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const last7Days = new Date();
  last7Days.setHours(0, 0, 0, 0);
  last7Days.setDate(last7Days.getDate() - 7);

  const todayIndex = items.findIndex((item) => {
    const dateValue = item[dateField];
    return dateValue && new Date(dateValue).getTime() < startOfToday.getTime();
  });
  const last7DaysIndex = items.findIndex((item) => {
    const dateValue = item[dateField];
    return dateValue && new Date(dateValue).getTime() < last7Days.getTime();
  });

  const sections: GroupedSection[] = [];

  const todayItems = todayIndex === -1 ? items : items.slice(0, todayIndex);
  if (todayItems.length > 0) {
    sections.push({ title: "Today", items: todayItems });
  }

  const last7DaysItems =
    todayIndex === -1
      ? []
      : items.slice(
          todayIndex,
          last7DaysIndex === -1 ? undefined : last7DaysIndex,
        );
  if (last7DaysItems.length > 0) {
    sections.push({ title: "Last 7 Days", items: last7DaysItems });
  }

  const olderItems = last7DaysIndex === -1 ? [] : items.slice(last7DaysIndex);
  if (olderItems.length > 0) {
    sections.push({ title: "Older", items: olderItems });
  }

  return sections;
};

export const groupShoppingList = (
  items: ShoppingListItem[],
): GroupedShoppingList => {
  const { uncheckedItems, checkedItems } = splitItemsByCompletion(items);

  return {
    uncheckedSections: groupItemsByDate(uncheckedItems, "createdAt"),
    checkedSections: groupItemsByDate(checkedItems, "completedAt"),
  };
};

export const useUpdateShoppingListItemMutation = ({
  groupId,
  shoppingListId,
}: {
  groupId: number;
  shoppingListId: number;
}) => {
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

  return useMutation(
    trpc.shoppingList.updateShoppingListItem.mutationOptions({
      onMutate: async ({ id, categoryId, name, completed }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        });

        const previousData = queryClient.getQueryData(
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
          (oldData) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              pages: oldData.pages.map((page) => {
                if (page.success === false) return page;

                return {
                  ...page,
                  data: {
                    ...page.data,
                    items: page.data.items.map((item: ShoppingListItem) =>
                      item.id === id
                        ? {
                            ...item,
                            name: name,
                            categoryId: categoryId,
                            completed: completed,
                            completedAt: completed ? new Date() : null,
                            isPending: true,
                          }
                        : item,
                    ),
                  },
                };
              }),
            };
          },
        );

        return { previousData };
      },
      onError: (err, variables, context) => {
        onMutateShoppingListItemError(context?.previousData);
      },
      onSuccess: (data, variables, context) => {
        if (data.success === false) {
          onMutateShoppingListItemError(context.previousData);
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
};
