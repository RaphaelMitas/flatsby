import type { ShoppingListItem } from "@flatsby/validators/shopping-list";

import type { ShoppingListInfiniteData } from "./types";

const mapItems = (
  data: ShoppingListInfiniteData | undefined,
  map: (items: ShoppingListItem[], pageIndex: number) => ShoppingListItem[],
) =>
  data && {
    ...data,
    pages: data.pages.map((page, pageIndex) =>
      page.success === false
        ? page
        : {
            ...page,
            data: { ...page.data, items: map(page.data.items, pageIndex) },
          },
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

export const addShoppingListItemToCache = (
  data: ShoppingListInfiniteData | undefined,
  item: ShoppingListItem,
) =>
  mapItems(data, (items, pageIndex) =>
    pageIndex === 0 ? [item, ...items] : items,
  );

export const removeShoppingListItemFromCache = (
  data: ShoppingListInfiniteData | undefined,
  id: number,
) => mapItems(data, (items) => items.filter((item) => item.id !== id));
