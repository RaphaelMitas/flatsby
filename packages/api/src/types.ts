/**
 * Database and Query Types
 * This file contains proper TypeScript types for database operations
 * to replace `any` types throughout the codebase
 */

import type { db } from "@flatsby/db/client";
import type {
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import type { CategoryIdWithAiAutoSelect } from "@flatsby/ui/categories";
import type { GroupMember } from "@flatsby/validators";
import type { InfiniteData } from "@tanstack/react-query";

import type { ApiResult } from "./errors";

// Database types
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Table types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;

export interface ShoppingListItem {
  id: number;
  name: string;
  createdAt: Date;
  createdByGroupMemberId: number | null;
  completed: boolean;
  completedByGroupMemberId: number | null;
  completedAt: Date | null;
  categoryId: CategoryIdWithAiAutoSelect;
  isPending?: boolean;
}
export type NewShoppingListItem = typeof shoppingListItems.$inferInsert;

// Type for infinite query data - matches ShoppingListUtils pattern
interface ShoppingListPage {
  items: ShoppingListItem[];
  nextCursor?: number;
}

export type ShoppingListInfiniteData = InfiniteData<
  ApiResult<ShoppingListPage>,
  number | null
>;

export type ShoppingListWithItems = ShoppingList & {
  shoppingListItems: ShoppingListItem[];
};

export type ShoppingListWithGroup = ShoppingList & {
  group: {
    groupMembers: Pick<GroupMember, "userId">[];
  };
};

export type ShoppingListSummary = Pick<
  ShoppingList,
  "id" | "name" | "description" | "icon"
> & {
  uncheckedItemLength: number;
};

// Utility types for database operations
export type DatabaseOperation<T> = () => Promise<T>;
export type TransactionOperation<T> = (trx: DbTransaction) => Promise<T>;
