import type { ShoppingListItem } from "@flatsby/validators/shopping-list";

import type { ShoppingListInfiniteData } from "./types";

const mapItems = (
  data: ShoppingListInfiniteData | undefined,
  map: (items: ShoppingListItem[]) => ShoppingListItem[],
) =>
  data && {
    ...data,
    pages: data.pages.map((page) =>
      page.success === false
        ? page
        : { ...page, data: { ...page.data, items: map(page.data.items) } },
    ),
  };

export const updateShoppingListItemInCache = (
  data: ShoppingListInfiniteData | undefined,
  {
    id,
    name,
    categoryId,
    completed,
  }: Pick<ShoppingListItem, "id" | "name" | "categoryId" | "completed">,
) =>
  mapItems(data, (items) =>
    items.map((item) =>
      item.id === id
        ? {
            ...item,
            name,
            categoryId,
            completed,
            completedAt: completed ? (item.completedAt ?? new Date()) : null,
            isPending: true,
          }
        : item,
    ),
  );

export const removeShoppingListItemFromCache = (
  data: ShoppingListInfiniteData | undefined,
  id: number,
) => mapItems(data, (items) => items.filter((item) => item.id !== id));
