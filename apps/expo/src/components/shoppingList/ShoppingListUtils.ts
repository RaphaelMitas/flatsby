import type { CategoryId } from "@flatsby/validators/categories";
import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateShoppingListItemInCache } from "@flatsby/api/shoppingListItemsCache";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { trpc } from "~/utils/api";
import { useInvalidateShoppingList } from "./useInvalidateShoppingList";

type SectionKey = "today" | "last7Days" | "older";

interface GroupedSection {
  key: SectionKey;
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
    sections.push({ key: "today", items: todayItems });
  }

  const last7DaysItems =
    todayIndex === -1
      ? []
      : items.slice(
          todayIndex,
          last7DaysIndex === -1 ? undefined : last7DaysIndex,
        );
  if (last7DaysItems.length > 0) {
    sections.push({ key: "last7Days", items: last7DaysItems });
  }

  const olderItems = last7DaysIndex === -1 ? [] : items.slice(last7DaysIndex);
  if (olderItems.length > 0) {
    sections.push({ key: "older", items: olderItems });
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
  selectedCategory,
}: {
  groupId: number;
  shoppingListId: number;
  selectedCategory: CategoryId | null;
}) => {
  const queryClient = useQueryClient();
  const { invalidateAll } = useInvalidateShoppingList({
    groupId,
    shoppingListId,
  });

  const itemsQueryKey = trpc.shoppingList.getShoppingListItems.infiniteQueryKey(
    {
      groupId,
      shoppingListId,
      limit: PAGE_SIZE.shoppingListItems,
      categoryId: selectedCategory ?? undefined,
    },
  );

  return useMutation(
    trpc.shoppingList.updateShoppingListItem.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: itemsQueryKey });
        const previousItems = queryClient.getQueryData(itemsQueryKey);
        queryClient.setQueryData(itemsQueryKey, (old) =>
          updateShoppingListItemInCache(old, variables),
        );
        return { queryKey: itemsQueryKey, previousItems };
      },
      onError: (_err, _variables, context) => {
        if (context) {
          queryClient.setQueryData(context.queryKey, context.previousItems);
        }
      },
      onSuccess: (data, _variables, context) => {
        if (data.success === false) {
          queryClient.setQueryData(context.queryKey, context.previousItems);
        }
      },
      onSettled: () => {
        invalidateAll();
      },
    }),
  );
};
