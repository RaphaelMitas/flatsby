import crypto from "node:crypto";
import type { CategoryId } from "@flatsby/validators/categories";
import type {
  ExpenseCreateInput,
  ExpenseDeleteInput,
  ExpenseUpdateInput,
  GroupUpdateInput,
  ModifyDataErrorOutput,
  ModifyDataInput,
  ModifyDataOutput,
  SearchDataInput,
  SearchDataOutput,
  ShoppingListCreateInput,
  ShoppingListDeleteInput,
  ShoppingListItemCreateInput,
  ShoppingListItemDeleteInput,
  ShoppingListItemUpdateInput,
  ShoppingListUpdateInput,
  ShowUIInput,
  ShowUIOutput,
} from "@flatsby/validators/chat/tools";
import type { CurrencyCode } from "@flatsby/validators/expenses/types";

import { and, asc, desc, eq } from "@flatsby/db";
import {
  expenses,
  groupMembers,
  groups,
  shoppingListItems,
  shoppingLists,
} from "@flatsby/db/schema";
import { categoryIdSchema } from "@flatsby/validators/categories";
import { calculateDebts } from "@flatsby/validators/expenses/debt";
import { currencyCodeSchema } from "@flatsby/validators/expenses/schemas";

import type { RouterCaller } from "../root";
import type { Database } from "../types";
import { handleApiResult } from "./tool-result-transformer";

/**
 * Parse and validate currency code from database string.
 * Falls back to "EUR" if validation fails.
 */
function parseCurrency(currency: string) {
  const result = currencyCodeSchema.safeParse(currency);
  if (!result.success) {
    console.warn(`Invalid currency code "${currency}", falling back to EUR`);
    return "EUR" as const;
  }
  return result.data;
}

interface ExecutorContext {
  db: Database;
  userId: string;
  caller: RouterCaller;
}

/**
 * Verify user is a member of the group and return membership
 */
async function requireMemberAccess(
  db: Database,
  groupId: number,
  userId: string,
): Promise<{ id: number; role: "admin" | "member" } | null> {
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, userId),
      eq(groupMembers.isActive, true),
    ),
    columns: { id: true, role: true },
  });
  return membership ?? null;
}

/**
 * Execute searchData tool - queries user data with security checks
 */
export async function executeSearchData(
  ctx: ExecutorContext,
  input: SearchDataInput,
): Promise<SearchDataOutput> {
  const { db, userId } = ctx;
  const { query, groupId, filters } = input;

  // Security: Verify user is a member of the group
  const membership = await requireMemberAccess(db, groupId, userId);
  if (!membership) {
    return {
      success: false,
      data: { type: "shoppingLists", items: [] },
      metadata: { count: 0, groupName: "" },
      error: "Group not found or access denied",
    };
  }

  // Get group name for metadata
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
    columns: { name: true },
  });

  if (!group) {
    return {
      success: false,
      data: { type: "shoppingLists", items: [] },
      metadata: { count: 0, groupName: "" },
      error: "Group not found",
    };
  }

  const groupName = group.name;

  switch (query) {
    case "shoppingLists": {
      const lists = await db.query.shoppingLists.findMany({
        where: eq(shoppingLists.groupId, groupId),
        columns: { id: true, name: true },
        with: {
          shoppingListItems: {
            columns: { id: true },
            where: eq(shoppingListItems.completed, false),
          },
        },
        limit: filters?.limit ?? 50,
      });

      return {
        success: true,
        data: {
          type: "shoppingLists",
          items: lists.map((list) => ({
            id: list.id,
            name: list.name,
            groupId,
            groupName,
            uncheckedItemCount: list.shoppingListItems.length,
          })),
        },
        metadata: { count: lists.length, groupName },
      };
    }

    case "shoppingListItems": {
      if (!filters?.shoppingListId) {
        return {
          success: false,
          data: { type: "shoppingListItems", items: [], listName: "" },
          metadata: { count: 0, groupName },
          error: "shoppingListId filter is required",
        };
      }

      const list = await db.query.shoppingLists.findFirst({
        where: and(
          eq(shoppingLists.id, filters.shoppingListId),
          eq(shoppingLists.groupId, groupId),
        ),
        columns: { name: true },
      });

      if (!list) {
        return {
          success: false,
          data: { type: "shoppingListItems", items: [], listName: "" },
          metadata: { count: 0, groupName },
          error: "Shopping list not found",
        };
      }

      const whereClause = filters.includeCompleted
        ? eq(shoppingListItems.shoppingListId, filters.shoppingListId)
        : and(
            eq(shoppingListItems.shoppingListId, filters.shoppingListId),
            eq(shoppingListItems.completed, false),
          );

      const items = await db.query.shoppingListItems.findMany({
        where: whereClause,
        columns: { id: true, name: true, categoryId: true, completed: true },
        orderBy: [
          asc(shoppingListItems.completed),
          desc(shoppingListItems.createdAt),
        ],
        limit: filters.limit ?? 50,
      });

      return {
        success: true,
        data: {
          type: "shoppingListItems",
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            categoryId: item.categoryId as CategoryId,
            completed: item.completed,
          })),
          listName: list.name,
        },
        metadata: { count: items.length, groupName },
      };
    }

    case "expenses": {
      const expenseList = await db.query.expenses.findMany({
        where: eq(expenses.groupId, groupId),
        orderBy: [desc(expenses.expenseDate)],
        limit: filters?.limit ?? 20,
        with: {
          paidByGroupMember: {
            with: { user: { columns: { name: true } } },
          },
          expenseSplits: {
            with: {
              groupMember: {
                with: { user: { columns: { name: true } } },
              },
            },
          },
        },
      });

      return {
        success: true,
        data: {
          type: "expenses",
          items: expenseList.map((e) => ({
            id: e.id,
            description: e.description,
            amountInCents: e.amountInCents,
            currency: parseCurrency(e.currency),
            paidByMemberId: e.paidByGroupMemberId,
            paidByMemberName: e.paidByGroupMember.user.name,
            expenseDate: e.expenseDate,
            splits: e.expenseSplits.map((s) => ({
              memberId: s.groupMemberId,
              memberName: s.groupMember.user.name,
              amountInCents: s.amountInCents,
            })),
          })),
        },
        metadata: { count: expenseList.length, groupName },
      };
    }

    case "groupMembers": {
      const members = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true),
        ),
        with: { user: { columns: { id: true, name: true, image: true } } },
      });

      return {
        success: true,
        data: {
          type: "groupMembers",
          items: members.map((m) => ({
            id: m.id,
            userId: m.user.id,
            name: m.user.name,
            image: m.user.image,
            isCurrentUser: m.user.id === userId,
            role: m.role,
          })),
        },
        metadata: { count: members.length, groupName },
      };
    }

    case "debts": {
      const groupExpenses = await db.query.expenses.findMany({
        where: eq(expenses.groupId, groupId),
        with: {
          expenseSplits: true,
        },
      });

      const members = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true),
        ),
        with: { user: { columns: { name: true } } },
      });

      const memberNameMap = new Map(members.map((m) => [m.id, m.user.name]));

      const expensesForCalc = groupExpenses.map((e) => ({
        paidByGroupMemberId: e.paidByGroupMemberId,
        amountInCents: e.amountInCents,
        currency: e.currency,
        expenseSplits: e.expenseSplits.map((s) => ({
          groupMemberId: s.groupMemberId,
          amountInCents: s.amountInCents,
        })),
      }));

      const debtSummary = calculateDebts(expensesForCalc);

      const debtItems: {
        fromMemberId: number;
        fromMemberName: string;
        toMemberId: number;
        toMemberName: string;
        amountInCents: number;
        currency: CurrencyCode;
      }[] = [];

      for (const [currency, summary] of Object.entries(
        debtSummary.currencies,
      )) {
        for (const debt of summary.debts) {
          debtItems.push({
            fromMemberId: debt.fromGroupMemberId,
            fromMemberName:
              memberNameMap.get(debt.fromGroupMemberId) ?? "Unknown",
            toMemberId: debt.toGroupMemberId,
            toMemberName: memberNameMap.get(debt.toGroupMemberId) ?? "Unknown",
            amountInCents: debt.amountInCents,
            currency: parseCurrency(currency),
          });
        }
      }

      return {
        success: true,
        data: {
          type: "debts",
          items: debtItems,
        },
        metadata: { count: debtItems.length, groupName },
      };
    }

    case "groups": {
      const members = await db.query.groupMembers.findMany({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.isActive, true),
        ),
      });

      return {
        success: true,
        data: {
          type: "groups",
          items: [
            {
              id: groupId,
              name: groupName,
              memberCount: members.length,
              isCurrentUserAdmin: membership.role === "admin",
            },
          ],
        },
        metadata: { count: 1, groupName },
      };
    }

    default: {
      const exhaustiveCheck: never = query;
      return {
        success: false,
        data: { type: "shoppingLists", items: [] },
        metadata: { count: 0, groupName },
        error: `Unknown query type: ${exhaustiveCheck as string}`,
      };
    }
  }
}

function errorOutput(
  action: ModifyDataInput["action"],
  entity: ModifyDataInput["entity"],
  error: string,
): ModifyDataErrorOutput {
  return { success: false, action, entity, error };
}

/**
 * Execute modifyData tool - CRUD operations with authorization
 */
export async function executeModifyData(
  ctx: ExecutorContext,
  input: ModifyDataInput,
): Promise<ModifyDataOutput> {
  const { db, userId } = ctx;
  const { action, entity, groupId } = input;

  // Security: Verify user is a member of the group
  const membership = await requireMemberAccess(db, groupId, userId);
  if (!membership) {
    return errorOutput(action, entity, "Group not found or access denied");
  }

  // Admin-only operations check
  const requiresAdmin =
    entity === "group" ||
    (entity === "shoppingList" && (action === "create" || action === "delete"));

  if (requiresAdmin && membership.role !== "admin") {
    return errorOutput(
      action,
      entity,
      "Admin access required for this operation",
    );
  }

  // Type narrowing by entity + action
  switch (entity) {
    case "shoppingListItem":
      if (action === "create") {
        return handleShoppingListItemCreate(ctx, groupId, input);
      }
      if (action === "update") {
        return handleShoppingListItemUpdate(ctx, groupId, input);
      }
      return handleShoppingListItemDelete(ctx, groupId, input);

    case "expense":
      if (action === "create") {
        return handleExpenseCreate(ctx, groupId, input);
      }
      if (action === "update") {
        return handleExpenseUpdate(ctx, groupId, input);
      }
      return handleExpenseDelete(ctx, groupId, input);

    case "shoppingList":
      if (action === "create") {
        return handleShoppingListCreate(
          ctx,
          groupId,
          input as ShoppingListCreateInput,
        );
      }
      if (action === "update") {
        return handleShoppingListUpdate(ctx, groupId, input);
      }
      return handleShoppingListDelete(ctx, groupId, input);

    case "group":
      return handleGroupUpdate(ctx, groupId, input);
  }
}

async function handleShoppingListItemCreate(
  ctx: ExecutorContext,
  groupId: number,
  input: ShoppingListItemCreateInput,
): Promise<ModifyDataOutput> {
  const { caller } = ctx;
  const { data } = input;

  // Call tRPC procedure (handles AI categorization, auth)
  const result = await caller.shoppingList.createShoppingListItem({
    groupId,
    shoppingListId: data.shoppingListId,
    name: data.name,
    categoryId: data.categoryId,
  });

  return handleApiResult(result, "create", "shoppingListItem", (itemId) => ({
    success: true,
    action: "create",
    entity: "shoppingListItem",
    result: {
      id: itemId,
      name: data.name,
      categoryId: data.categoryId as CategoryId,
      completed: false,
    },
  }));
}

async function handleShoppingListItemUpdate(
  ctx: ExecutorContext,
  groupId: number,
  input: ShoppingListItemUpdateInput,
): Promise<ModifyDataOutput> {
  const { caller } = ctx;
  const { data } = input;

  const result = await caller.shoppingList.updateShoppingListItem({
    id: data.id,
    name: data.name,
    categoryId: data.categoryId,
    completed: data.completed,
  });

  return handleApiResult(result, "update", "shoppingListItem", () => ({
    success: true,
    action: "update",
    entity: "shoppingListItem",
    result: {
      id: data.id,
      name: data.name,
      categoryId: data.categoryId,
      completed: data.completed,
    },
  }));
}

async function handleShoppingListItemDelete(
  ctx: ExecutorContext,
  _groupId: number,
  input: ShoppingListItemDeleteInput,
): Promise<ModifyDataOutput> {
  const { db, caller } = ctx;
  const { data } = input;

  // Get item details before deletion for output
  const item = await db.query.shoppingListItems.findFirst({
    where: eq(shoppingListItems.id, data.id),
    columns: { id: true, name: true, categoryId: true, completed: true },
  });

  if (!item) {
    return errorOutput("delete", "shoppingListItem", "Item not found");
  }

  // Call tRPC procedure (handles auth, group verification)
  const result = await caller.shoppingList.deleteShoppingListItem({
    id: data.id,
  });

  return handleApiResult(result, "delete", "shoppingListItem", () => ({
    success: true,
    action: "delete",
    entity: "shoppingListItem",
    result: {
      id: item.id,
      name: item.name,
      categoryId: categoryIdSchema.safeParse(item.categoryId).data ?? "other",
      completed: item.completed,
    },
  }));
}

async function handleExpenseCreate(
  ctx: ExecutorContext,
  groupId: number,
  input: ExpenseCreateInput,
): Promise<ModifyDataOutput> {
  const { db, caller } = ctx;
  const { data } = input;

  // Get member names for output formatting
  const members = await db.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.isActive, true),
    ),
    with: { user: { columns: { name: true } } },
  });
  const memberIdToName = new Map(members.map((m) => [m.id, m.user.name]));

  const expenseDate = data.expenseDateIsoString
    ? new Date(data.expenseDateIsoString)
    : new Date();

  // Call tRPC procedure (handles validation, transactions, auth)
  const result = await caller.expense.createExpense({
    ...data,
    expenseDate,
    groupId,
  });

  return handleApiResult(result, "create", "expense", (expense) => ({
    success: true,
    action: "create",
    entity: "expense",
    result: {
      id: expense.id,
      description: data.description ?? null,
      amountInCents: data.amountInCents,
      currency: parseCurrency(data.currency),
      paidByMemberName:
        memberIdToName.get(data.paidByGroupMemberId) ?? "Unknown",
      splits: data.splits.map((s) => ({
        memberName: memberIdToName.get(s.groupMemberId) ?? "Unknown",
        amountInCents: s.amountInCents,
      })),
    },
  }));
}

async function handleExpenseDelete(
  ctx: ExecutorContext,
  _groupId: number,
  input: ExpenseDeleteInput,
): Promise<ModifyDataOutput> {
  const { db, caller } = ctx;
  const { data } = input;

  // Get expense details before deletion for output formatting
  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, data.expenseId),
    with: {
      paidByGroupMember: {
        with: { user: { columns: { name: true } } },
      },
      expenseSplits: {
        with: {
          groupMember: {
            with: { user: { columns: { name: true } } },
          },
        },
      },
    },
  });

  if (!expense) {
    return errorOutput("delete", "expense", "Expense not found");
  }

  // Call tRPC procedure (handles transactions, auth, group verification)
  const result = await caller.expense.deleteExpense({
    expenseId: data.expenseId,
  });

  return handleApiResult(result, "delete", "expense", () => ({
    success: true,
    action: "delete",
    entity: "expense",
    result: {
      id: expense.id,
      description: expense.description,
      amountInCents: expense.amountInCents,
      currency: parseCurrency(expense.currency),
      paidByMemberName: expense.paidByGroupMember.user.name,
      splits: expense.expenseSplits.map((s) => ({
        memberName: s.groupMember.user.name,
        amountInCents: s.amountInCents,
      })),
    },
  }));
}

async function handleExpenseUpdate(
  ctx: ExecutorContext,
  _groupId: number,
  input: ExpenseUpdateInput,
): Promise<ModifyDataOutput> {
  const { db, caller } = ctx;
  const { data } = input;

  // Get expense details and member names for output formatting
  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, data.expenseId),
    with: {
      paidByGroupMember: {
        with: { user: { columns: { name: true } } },
      },
      expenseSplits: {
        with: {
          groupMember: {
            with: { user: { columns: { name: true } } },
          },
        },
      },
    },
  });

  if (!expense) {
    return errorOutput("update", "expense", "Expense not found");
  }

  // Get member names for output
  const members = await db.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, expense.groupId),
      eq(groupMembers.isActive, true),
    ),
    with: { user: { columns: { name: true } } },
  });
  const memberIdToName = new Map(members.map((m) => [m.id, m.user.name]));

  const expenseDate = data.expenseDateIsoString
    ? new Date(data.expenseDateIsoString)
    : undefined;

  // Call tRPC procedure (handles validation, transactions, auth, group verification)
  const result = await caller.expense.updateExpense({
    ...data,
    expenseDate,
  });

  // Determine output values (use updated or original values)
  const outputPaidByMemberId =
    data.paidByGroupMemberId ?? expense.paidByGroupMemberId;
  const outputAmount = data.amountInCents ?? expense.amountInCents;
  const outputCurrency = data.currency ?? expense.currency;
  // Use ternary to distinguish between undefined (not provided) and null/string (provided value)
  const outputDescription =
    data.description !== undefined ? data.description : expense.description; // eslint-disable-line @typescript-eslint/prefer-nullish-coalescing
  const outputSplits = data.splits ?? expense.expenseSplits;

  return handleApiResult(result, "update", "expense", () => ({
    success: true,
    action: "update",
    entity: "expense",
    result: {
      id: expense.id,
      description: outputDescription ?? null,
      amountInCents: outputAmount,
      currency: parseCurrency(outputCurrency),
      paidByMemberName: memberIdToName.get(outputPaidByMemberId) ?? "Unknown",
      splits: outputSplits.map((s) => ({
        memberName: memberIdToName.get(s.groupMemberId) ?? "Unknown",
        amountInCents: s.amountInCents,
      })),
    },
  }));
}

async function handleShoppingListCreate(
  ctx: ExecutorContext,
  groupId: number,
  input: ShoppingListCreateInput,
): Promise<ModifyDataOutput> {
  const { caller } = ctx;
  const { data } = input;

  // Call tRPC procedure (handles auth)
  const result = await caller.shoppingList.createShoppingList({
    groupId,
    name: data.name,
    icon: data.icon,
    description: data.description,
  });

  return handleApiResult(result, "create", "shoppingList", (res) => ({
    success: true,
    action: "create",
    entity: "shoppingList",
    result: {
      id: res.shoppingListId,
      name: data.name,
    },
  }));
}

async function handleShoppingListUpdate(
  ctx: ExecutorContext,
  _groupId: number,
  input: ShoppingListUpdateInput,
): Promise<ModifyDataOutput> {
  const { caller } = ctx;
  const { data } = input;

  // Call tRPC procedure (handles auth, group verification)
  const result = await caller.shoppingList.changeShoppingListName({
    shoppingListId: data.shoppingListId,
    name: data.name,
  });

  return handleApiResult(result, "update", "shoppingList", (res) => ({
    success: true,
    action: "update",
    entity: "shoppingList",
    result: {
      id: res.shoppingListId,
      name: data.name,
    },
  }));
}

async function handleShoppingListDelete(
  ctx: ExecutorContext,
  groupId: number,
  input: ShoppingListDeleteInput,
): Promise<ModifyDataOutput> {
  const { db, caller } = ctx;
  const { data } = input;

  // Get list details before deletion for output
  const listToDelete = await db.query.shoppingLists.findFirst({
    where: eq(shoppingLists.id, data.shoppingListId),
    columns: { id: true, name: true },
  });

  if (!listToDelete) {
    return errorOutput("delete", "shoppingList", "Shopping list not found");
  }

  // Call tRPC procedure (handles auth, group verification, transactions)
  const result = await caller.shoppingList.deleteShoppingList({
    groupId,
    shoppingListId: data.shoppingListId,
  });

  return handleApiResult(result, "delete", "shoppingList", () => ({
    success: true,
    action: "delete",
    entity: "shoppingList",
    result: {
      id: listToDelete.id,
      name: listToDelete.name,
    },
  }));
}

async function handleGroupUpdate(
  ctx: ExecutorContext,
  groupId: number,
  input: GroupUpdateInput,
): Promise<ModifyDataOutput> {
  const { caller } = ctx;
  const { data } = input;

  // Call tRPC procedure (handles auth)
  const result = await caller.group.changeGroupName({
    id: groupId,
    name: data.name,
  });

  return handleApiResult(result, "update", "group", (res) => ({
    success: true,
    action: "update",
    entity: "group",
    result: {
      id: res.groupId,
      name: data.name,
    },
  }));
}

/**
 * Execute showUI tool - returns UI configuration for rendering
 * This doesn't actually execute anything server-side, just validates and returns config
 */
export function executeShowUI(input: ShowUIInput): ShowUIOutput {
  const componentId = crypto.randomUUID();

  // Interactive components that need user input
  const interactiveComponents = ["selector", "quiz", "confirmation"];

  if (interactiveComponents.includes(input.component)) {
    return {
      rendered: true,
      awaitingInput: true,
      componentId,
    };
  }

  // Non-interactive components (chart, table)
  return {
    rendered: true,
  };
}
