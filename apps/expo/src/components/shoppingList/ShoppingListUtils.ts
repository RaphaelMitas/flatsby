import type { CategoryId } from "@flatsby/validators/categories";
import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import superjson from "superjson";

import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { trpc } from "~/utils/api";
import { holdWhileMutating } from "~/utils/live-query";

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

export const shoppingListItemsOptions = (
  groupId: number,
  shoppingListId: number,
  categoryId?: CategoryId,
) =>
  trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
    {
      groupId,
      shoppingListId,
      limit: PAGE_SIZE.shoppingListItems,
      categoryId,
    },
    {
      getNextPageParam: (lastPage) =>
        lastPage.success === true ? lastPage.data.nextCursor : null,
      staleTime: holdWhileMutating(trpc.shoppingList.pathKey()),
      // Item dates defeat the default sharing, so every unchanged poll would re-render every row
      structuralSharing: (previous, next) =>
        superjson.stringify(previous) === superjson.stringify(next)
          ? previous
          : next,
    },
  );

export const groupShoppingList = (
  items: ShoppingListItem[],
): GroupedShoppingList => {
  const { uncheckedItems, checkedItems } = splitItemsByCompletion(items);

  return {
    uncheckedSections: groupItemsByDate(uncheckedItems, "createdAt"),
    checkedSections: groupItemsByDate(checkedItems, "completedAt"),
  };
};
