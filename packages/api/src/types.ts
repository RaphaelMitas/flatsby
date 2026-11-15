import type { db } from "@flatsby/db/client";
import type {
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
  users,
} from "@flatsby/db/schema";
import type {
  ExpenseCategoryGroup,
  ExpenseSubcategoryId,
} from "@flatsby/validators/expenses/categories";
import type { ShoppingListItem } from "@flatsby/validators/shopping-list";
import type { InfiniteData } from "@tanstack/react-query";

import type { ApiResult } from "./errors";

export type Database = typeof db;
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;

export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;

export type NewShoppingListItem = typeof shoppingListItems.$inferInsert;

export interface MemberUser {
  name: string;
  email: string | null;
  image: string | null;
  paypalHandle?: string | null;
}

export type GroupMemberWithUserInfo = Pick<
  GroupMember,
  "id" | "userId" | "role" | "joinedOn" | "isActive"
> & {
  user: MemberUser;
  placeholderName: string | null;
};

export type GroupWithMembers = Group & {
  groupMembers: GroupMemberWithUserInfo[];
};

export type GroupWithAccess = GroupWithMembers & {
  thisGroupMember: GroupMemberWithUserInfo;
};

export type GroupMemberWithUser = Pick<
  GroupMember,
  "id" | "groupId" | "userId" | "role" | "joinedOn"
> & {
  user: MemberUser;
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

interface ShoppingListPage {
  items: ShoppingListItem[];
  nextCursor?: number;
}

export type ShoppingListInfiniteData = InfiniteData<
  ApiResult<ShoppingListPage>,
  number | null
>;

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

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;

export type ExpenseWithSplits = Expense & {
  expenseSplits: ExpenseSplit[];
};

export type ExpenseSplitWithMember = ExpenseSplit & {
  groupMember: GroupMemberWithUser;
};

export type ExpenseWithSplitsAndMembers = Omit<
  Expense,
  "category" | "subcategory"
> & {
  category: ExpenseCategoryGroup;
  subcategory: ExpenseSubcategoryId;
  paidByGroupMember: GroupMemberWithUser;
  createdByGroupMember: GroupMemberWithUser;
  expenseSplits: ExpenseSplitWithMember[];
};

interface ExpensePage {
  items: ExpenseWithSplitsAndMembers[];
  nextCursor?: number;
}

export type ExpenseInfiniteData = InfiniteData<
  ApiResult<ExpensePage>,
  number | null
>;

export type {
  DebtEntry,
  DebtSummary,
  GroupDebtSummary,
} from "@flatsby/validators/expenses/types";

export type Role = "admin" | "member";

export interface FindGroupOptions {
  groupId: number;
  userId: string;
  includeMembers?: boolean;
}

export interface FindGroupMemberOptions {
  memberId: number;
  userId: string;
}
