import type { ShoppingListItem } from "@flatsby/validators/shopping-list";

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

  const todayIndex = items.findIndex(
    (item) => item[dateField] && new Date(item[dateField]) < startOfToday,
  );
  const last7DaysIndex = items.findIndex(
    (item) => item[dateField] && new Date(item[dateField]) < last7Days,
  );

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
