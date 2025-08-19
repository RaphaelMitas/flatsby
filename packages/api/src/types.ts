/**
 * Database and Query Types
 * This file contains proper TypeScript types for database operations
 * to replace `any` types throughout the codebase
 */

import type { InfiniteData } from "@tanstack/react-query";

import type { db } from "@flatsby/db/client";
import type {
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import type { CategoryIdWithAiAutoSelect } from "@flatsby/ui/categories";

import type { ApiResult } from "./errors";

// Database types
export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Table types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

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

// Query result types for common operations
export type GroupMemberWithUserInfo = Pick<
  GroupMember,
  "id" | "userId" | "role" | "joinedOn"
> & {
  user: Pick<User, "email" | "name" | "image">;
};

export type GroupWithMembers = Group & {
  groupMembers: GroupMemberWithUserInfo[];
};

export type GroupWithAccess = GroupWithMembers & {
  thisGroupMember: GroupMemberWithUserInfo;
};

export type GroupMemberWithUser = GroupMember & {
  user: Pick<User, "email" | "name" | "image">;
};

export type GroupMemberWithGroup = GroupMember & {
  group: Group & {
    groupMembers: GroupMember[];
  };
};

export type GroupMemberWithGroupMinimal = GroupMember & {
  group: Pick<Group, "id"> & {
    groupMembers: GroupMember[];
  };
};

export type GroupMemberDetails = GroupMemberWithUser & {
  currentUserGroupMember: GroupMember;
};

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

export interface UserGroupMembership {
  user?: User;
  groups: Pick<Group, "id" | "name" | "profilePicture">[];
}

export type GroupWithMemberCount = Pick<
  Group,
  "id" | "name" | "createdAt" | "profilePicture"
> & {
  memberCount: number;
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

// Role types
export type Role = "admin" | "member";

// Common query options
export interface FindGroupOptions {
  groupId: number;
  userId: string;
  includeMembers?: boolean;
}

export interface FindGroupMemberOptions {
  memberId: number;
  userId: string;
}
